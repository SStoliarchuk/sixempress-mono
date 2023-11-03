import { db } from "@stlse/backend-connector";
import { Request } from "express";
import { ModelClass } from "../external-conn-paths/sync-config.service";
import { SyncDataItems } from "./woo.dtd";
import { Filter, UpdateFilter } from "mongodb";
import { log } from "../log";

type TrackModel = { 
  trackId: string, 
  oUrl: string, 
  modelClass: string, 
  total: number, 
  ids: (string | number)[],
  processed: number,
  stopRequest: boolean,
  isTopLevelOperation: boolean,
};

type LockModel = {
  oUrl: string,
}

type ProcessingModel = {
  oUrl: string,
  byModel: {[model: string]: (string | number)[]}
}

export type SyncTrack = {
  trackId: string,
  errs: {sou: string, mc: string, id?: number | string, error: any}[],
  total: number,
  addProcessed: (req: Request, modelClass: string, count?: number) => void,
	close: (req: Request) => Promise<void>,
  onAfter: (req: Request, model: string, id: string | number | (string | number)[], e?: any) => Promise<void>,
}

export type SyncStat = {
  syncIds: {topLevel: string[], manual: string[]}, 
  total: number,
	processed: number,
	byModel: {[modelClass: string]: {processed: number, total: number}}
}

class _SyncStatService {

  // db.ExternalSyncTrackStatModel.drop()
  // db.ExternalSyncLockTrackModel.drop()
  // db.ExternalSyncProcessTrackModel.drop()

  private collectionTrack(req: Request) {
    return db(req).collection<TrackModel>(ModelClass.ExternalSyncTrackStat);
  }

  private collectionLocks(req: Request) {
    return db(req).collection<LockModel>(ModelClass.ExternalSyncLockTrack)
  }

  private collectionProcessing(req: Request) {
    return db(req).collection<ProcessingModel>(ModelClass.ExternalSyncProcessTrack)
  }

  /**
   * Returns true if it is the first lock set
   * 
   * Returns false if the lock was already there
   */
  public async setSyncLock(req: Request, oUrl: string): Promise<boolean> {
    const r = await this.collectionLocks(req).updateOne({oUrl}, {$setOnInsert: {oUrl, byModel: {}}}, {upsert: true});
    // lock is alread present if there is a matching elemnt
    return !r.matchedCount
  }

  public async hasSyncLock(req: Request, oUrl: string) {
    const d = await this.collectionLocks(req).countDocuments({oUrl});
    return Boolean(d);
  }

  public async deleteSyncLock(req: Request, oUrl: string) {
    await this.collectionLocks(req).deleteOne({oUrl});
  }

  // public async stopProcess(req: Request, trackId: string) {
  //   await this.collectionTrack(req).updateOne({trackId}, {$set: {stopRequest: true}});
  // }

  /**
   * Locks the processing id given, modifies the ids map to remove the ones being already processing
   */
  private async lockProcessingIds(req: Request, oUrl: string, modelClass: string, idsMap: Map<string | number, any>): Promise<void> {
    const idsArray = Array.from(idsMap.keys());
    const filter: Filter<ProcessingModel> = {oUrl};
    const update: UpdateFilter<ProcessingModel> = {
      $setOnInsert: {oUrl},
      $addToSet: {['byModel.' + modelClass]: {$each: idsArray}},
    };

    const r = await this.collectionProcessing(req).findOneAndUpdate(filter, update, {returnDocument: 'before', upsert: true});

    // filter the ids given to remove the items that were already processing before
    const presentBefore = r?.byModel[modelClass] || [];
    for (const i of presentBefore)
      idsMap.delete(i);
  }

  /**
   * Removes the locked process ids
   */
  private async unlockProcessingIds(req: Request, oUrl: string, modelClass: string, idsArray: Array<string | number>): Promise<void> {
    const filter: Filter<ProcessingModel> = {oUrl};
    const update: UpdateFilter<ProcessingModel> = {$pullAll: {['byModel.' + modelClass]: idsArray}};
    await this.collectionProcessing(req).updateOne(filter, update);
  }

  /**
	 * Filters the ids in the dataObj to only have the items not already processing elsewhere.
   * 
   * Creates an object that tracks the progress of the sync
	 */
	public async createSyncStatTrackAndLock(req: Request, oUrl: string, dataObj: SyncDataItems<any>, isTopLevelOperation: boolean): Promise<SyncTrack> {
    const trackId = Math.random().toString();

    const stat: SyncTrack = {
      trackId,
      errs: [],
      total: 0,
			addProcessed: async (req, model, count) => {
        stat.total += count;
        await this.increaseProcessed(req, trackId, model, count);
      },
      close: async (req) => {
        await this.closeTrack(req, trackId);
      },
      onAfter: async (req, model, id, e) => {
				if (e) {
					log.error('Sync Error' + (Array.isArray(id) ? ' all' : ''), oUrl, trackId, model, id, e);
					stat.errs.push({sou: oUrl, mc: model, error: e});
          return;
				}

        log('Sync Complete' + (Array.isArray(id) ? ' all' : ''), oUrl, trackId, model, id);
        stat.addProcessed(req, model, dataObj[model]);
        
        const arr = Array.isArray(id) ? id : [id];
        for (const id of arr)
          dataObj.data[model].delete(id);
        
        await this.unlockProcessingIds(req, oUrl, model, arr);
			}
		};

    const models: TrackModel[] = [];
		for (const model in dataObj.data) {
      const idsMap = dataObj.data[model];
      await this.lockProcessingIds(req, oUrl, model, idsMap);
      const ids = Array.from(idsMap.keys());
      models.push({oUrl, modelClass: model, processed: 0, total: idsMap.size, ids, trackId, stopRequest: false, isTopLevelOperation});
    }

    await this.collectionTrack(req).insertMany(models);
		return stat;
	}

  public async getStatus(req: Request, oUrl: string): Promise<SyncStat> {
    const all = await this.collectionTrack(req).find({oUrl}).toArray();
    const stat: SyncStat = {syncIds: {topLevel: [], manual: []}, total: 0, processed: 0, byModel: {}};

    for (const a of all) {
      if (!stat.byModel[a.modelClass])
        stat.byModel[a.modelClass] = {processed: 0, total: 0};
      
      (a.isTopLevelOperation ? stat.syncIds.topLevel : stat.syncIds.manual)
        .push(a.trackId);

      stat.byModel[a.modelClass].processed += a.processed;
      stat.byModel[a.modelClass].total += a.total;
      stat.processed += a.processed;
      stat.total += a.total;
    }

    return stat;
  }

  private async increaseProcessed(req: Request, trackId: string, modelClass: string, count: number = 1) {
    await this.collectionTrack(req).updateOne({trackId, modelClass}, {$inc: {processed: count}})
  }

  private async closeTrack(req: Request, trackId: string) {
    await this.collectionTrack(req).deleteMany({trackId: trackId});
  }

}

export const SyncStatService = new _SyncStatService();
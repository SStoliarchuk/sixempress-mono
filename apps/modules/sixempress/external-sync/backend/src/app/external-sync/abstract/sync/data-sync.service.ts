import e, { json, Request } from 'express';
import { AddedIdInfo, CrudActions, ItemsBuildOpts, ModelIdsHm } from "../woo.dtd";
import { WooBaseItem, WooProductAdvanced } from "@sixempress/contracts-agnostic";
import { AnyBulkWriteOperation, Filter, ObjectId } from "mongodb";
import { SyncableModel } from "../../syncable-model";
import { AbstractDbItemController, DeleteOptions, IBaseModel, ObjectUtils } from "@sixempress/main-be-lib";
import { ExternalConnection, ExternalConnectionType } from "../../../external-sync/external-conn-paths/sync-config.dtd";
import { OnUnsuccessfulSync } from '../sync-base.service';

export type ExternalIdQuery<T extends SyncableModel> = Filter<T['_metaData']['_externalIds'][0]>;
export type DataSyncToRemote<B extends SyncableModel> = Array<{errors: any[], ops: AnyBulkWriteOperation<B>[]}>;

export abstract class DataSyncService<A extends WooBaseItem, B extends SyncableModel> {

	protected abstract type: ExternalConnectionType

	protected MAX_SENT_CHUNKS = 10;

	protected abstract translateAndSendToRemote(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, localOrders: B[], opts?: ItemsBuildOpts): Promise<DataSyncToRemote<B>>;

	public abstract receiveFromRemote(ep: ExternalConnection, req: Request, ids: (number | string)[], referenceItems: Map<string | number, A>, opts?: ItemsBuildOpts): Promise<void>;

	// by default we throw error on unsuccessful sync
	public async onUnsuccessfulSync(...args: Parameters<OnUnsuccessfulSync<any, any>>) {
		return false
	}

	/**
	 * Sends item to remote
	 * @warning make sure that the endpoins are already filtered for the appropriate type
	 */
	public sendToRemote(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, localOrders: B[], opts?: ItemsBuildOpts): Promise<DataSyncToRemote<B>> {
		const ends = endpoints.filter(e => e.type === this.type);
		if (!ends.length)
			return;

		return this.translateAndSendToRemote(req, endpoints, slug, data, localOrders, opts);
	}

	/**
	 * creates a query with an $elemMatch on the '_metaData._externalIds' field
	 * @param ep The external connection for which to query
	 * @param externalIdsQuery The additional parameter that the externalIds objet has to match
	 * @param rootQuery additional query parameter as you would normally query them at the root of the object
	 */
	public static createQueryForMetadata<T extends SyncableModel>(ep: ExternalConnection, externalIdsQuery: Filter<T['_metaData']['_externalIds'][0]>): Filter<T> {
		return {
			'_metaData._externalIds': {$elemMatch: {
				'_externalConnectionId': ep._id,
				...externalIdsQuery,
			}},
		} as any as Filter<T>;
	}

	/**
	 * Checks if the item contains the remote id
	 * @param i The item to search for
	 * @param ep the external connection where to find the id
	 */
	public static getRemoteId(i: SyncableModel, ep: ExternalConnection): number | string | void {
		const conn = this.getRemoteExtObj(i, ep);
		return conn ? conn._id : undefined;
	}

	public static getRemoteExtObj(i: SyncableModel, ep: ExternalConnection): void | SyncableModel['_metaData']['_externalIds'][0] {
		if (!i._metaData || !i._metaData._externalIds)
			return;

		// find last item as it's the most "updated"
		// we do this to mitigate the error where we have saved multiple remote ids for a same external id
		return ObjectUtils.findLast(i._metaData._externalIds, e => e._externalConnectionId === ep._id);
	}

	public createQueryForMetadata = DataSyncService.createQueryForMetadata;

	public getRemoteId = DataSyncService.getRemoteId;
	
	public getRemoteExtObj = DataSyncService.getRemoteExtObj;

	/**
	 * automatically creates crud actions by quering the db
	 * @param req Request object for controller
	 * @param c Controller to update the items
	 * @param ep The external connection where the remote items come from
	 * @param ids the ids of the updated remote items
	 * @param reference the objects from remote
	 * @param translate the translation function to transform remote items to local items
	 */
	protected async automaticRemoteToLocalCompare<T extends SyncableModel>(
		req: Request, 
		c: AbstractDbItemController<T>, 
		ep: ExternalConnection, 
		ids: (number | string)[],
		reference: Map<number | string, A>, 
		translate: (req: Request, ep: ExternalConnection, ref: A[], loc: Map<A, T>) => Promise<Map<A, T>>,
	): Promise<CrudActions<T>> {

		// skip filter control as to ensure we get the deleted items too
		const localItems = await c.findForUser(
			req, 
			this.createQueryForMetadata(ep, {'_id': {$in: ids}} as ExternalIdQuery<T>),
			{skipFilterControl: true},
		);

		// build items hm
		const localModelHm: Map<A, T> = new Map();
		const localHm: Map<string | number, T> = new Map();
		for (const id of ids) {
			const rel = localItems.find(m => 
				m._metaData._externalIds.some(ex => 
					ex._externalConnectionId === ep._id && ex._id == id));

			if (rel) {
				localHm.set(id, rel);
				if (reference.has(id))
					localModelHm.set(reference.get(id), rel);
			}
		}

		// translate
		const translated = await translate.call(this, req, ep, Array.from(reference.values()), localModelHm);
		for (const [ref, loc] of translated.entries())
			this.addMetaData(loc, ep, ref.id);

		// return 
		return this.createCrudActions(ep, ids, reference, localHm, translated);
	}


	/**
	 * Separates ids based on the action that should be executed
	 * 
	 * @note this function uses this. as to allow you to override the functions
	 * thus use this function as such "ClassChild.createCrudActions()" as to use the ClassChild override
	 * 
	 * @param ep the external connection to use to create the syncable enable fields
	 * @param ids remote ids of the items
	 * @param referenceItems the remote items objects
	 * @param localItems the local items relative to the ids
	 * @param translateFn a function that allows you to convert the woo model to a local model
	 */
	protected createCrudActions<T extends SyncableModel>(
		ep: ExternalConnection,
		ids: (string | number)[], 
		referenceItems: Map<string | number, A>,
		localItems: Map<string | number, T>, 
		translatedMap: Map<A, T>,
	): CrudActions<T>  {
		const acts: CrudActions<T> = {
			create: [],
			delete: [],
			update: [],
			restore: [],
		}

		for (const id of ids) {
			// here we are sure that the fields exists, as they have to queried by using these fields
			const relativeLocal = localItems.get(id);
			
			// disabled model, so we ignore this
			if (relativeLocal && relativeLocal.externalSync?.disabled?.some(d => d.id === ep._id))
				continue;

			// delete local
			if (this.isExternalItemDeleted(referenceItems.get(id))) {
				// only if not already deleted
				if (relativeLocal && !relativeLocal._deleted)
					acts.delete.push(new ObjectId(relativeLocal._id.toString()));
			}
			// else create
			else {
				
				const translated = translatedMap.get(referenceItems.get(id));
				
				// invalid object
				if (!translated) {
					// if a local variation is present, then we delete it as it's unsupported
					if (relativeLocal)
						acts.delete.push(new ObjectId(relativeLocal._id.toString()));

					// else simply continue
					continue;
				}

				// local is not present, so create it
				if (!relativeLocal)
					acts.create.push(translated)
				// local is deleted so restore it
				else if (this.isLocalItemDeleted(relativeLocal))
					acts.restore.push(translated);
				// both present so update and not deleted
				else
					acts.update.push(translated);
			}

		}

		return acts;
	}

	/**
	 * Executes the acts in the db
	 * @param req Request object used for controller ops
	 * @param c The controller to use
	 * @param acts The crud actions to execute
	 * @param opts Additional options
	 * @param opts.idField The field to use instead of _id (used by products where the _id is _trackableGroupId)
	 */
	protected async executeCrudActions<T extends SyncableModel>(req: Request, c: AbstractDbItemController<T>, acts: CrudActions<T>, opts: {idField?: keyof T, deleteOptions?: DeleteOptions} = {}): Promise<void> {

		// we dont have to worry about loop access too much
		// as it's not like the products are gonna be modified every second
		// the only thing to worry is the product amount
		// becuase the woo plugin emits product amount change as product change
		//
		// but obviously we dont execute post/put in case only that field change
		// as our controller checks for diffs before executing the save
		// (at least i think so)
		// TODO check the stuff i wrote above

		const idField = opts.idField || '_id';
		const v = (id: string | ObjectId) => idField === '_id' ? new ObjectId(id.toString()) : id.toString();

		if (acts.create.length)
			await c.saveToDb(req, acts.create);
		
		if (acts.delete.length)
			await c.deleteForUser(req, {[idField]: {$in: acts.delete.map(v)}} as Filter<T>, {deleteMulti: true, ...opts.deleteOptions});
		
		if (acts.update.length)
			for (const i of acts.update)
				await c.replaceItem__READ_DESCRIPTION(req, {[idField]: v(i._id)} as Filter<T>, i);

		if (acts.restore.length) {
			await c.restoreDeletedForUser(req, {[idField]: {$in: acts.restore.map(i => v(i._id))}} as Filter<T>);
			for (const i of acts.restore)
				await c.replaceItem__READ_DESCRIPTION(req, {[idField]: v(i._id)} as Filter<T>, i);
		}

	}

	/**
	 * Adds _metaData info about remote object
	 * @param localObj The local item to update
	 * @param extConn The connection of the sync
	 * @param remoteId The remote id of the item that was updated in remote
	 * @param add Additional data to add to syncable metadata
	 */
	protected addMetaData(localObj: SyncableModel, extConn: ExternalConnection, remoteId: string | number, add?: SyncableModel['_metaData']['_externalIds'][0]['_additional']) {

		// create meta object
		const metadata: SyncableModel['_metaData']['_externalIds'][0] = {
			_externalConnectionId: extConn._id, _id: remoteId
		};
		if (add) metadata._additional = add;


		// create meta container
		if (!localObj._metaData) 
			localObj._metaData = {};
		
		if (!localObj._metaData._externalIds) 
			localObj._metaData._externalIds = [];
		
		// if the metaData contains more than 1 ref, idk how can this happen, then we clear that array
		if (localObj._metaData._externalIds.filter(ei => ei._externalConnectionId === extConn._id).length > 1) 
			localObj._metaData._externalIds = localObj._metaData._externalIds.filter(ei => ei._externalConnectionId !== extConn._id)

		// update data
		const idx = localObj._metaData._externalIds.findIndex(ei => ei._externalConnectionId === extConn._id);
		// if the id is present we replace the object in case the item no longer has the parent id
		if (idx === -1)
			localObj._metaData._externalIds.push(metadata);
		else
			localObj._metaData._externalIds[idx] = metadata;

	}

	/**
	 * Creates a bulkwrite op for the model given
	 * @param ec The external connection
	 * @param m The model to update the metadata of
	 * @param md the metadata to add or undefined if to delete (for deleted element)
	 */
	protected createLocalMetaDataBulkOps(ec: ExternalConnection, m: SyncableModel, md?: SyncableModel['_metaData']['_externalIds'][0]): AnyBulkWriteOperation<B>[] {

		// we directly pass the update query
		// because doing the checks in the source code creates problem where a same object has multiple same externalids
		// it is probably caused by some concurrency issue that is hard to find :/
		//
		// so here we create an Idempotent updateOne operation so we know that the change will always result in only 1 external id for ext connection


		// updateOne: remove all the extConnection values
		const arr: AnyBulkWriteOperation<SyncableModel>[] = [{updateOne: {
			filter: {_id: new ObjectId(m._id.toString())},
			update: {$pull: {'_metaData._externalIds': {_externalConnectionId: ec._id}}}
		}}];
		
		// updateOne: add the new one if needed
		if (md)
			arr.push({updateOne: {
				filter: {_id: new ObjectId(m._id.toString())},
				update: {$push: {'_metaData._externalIds': md}}
			}});

		return arr as AnyBulkWriteOperation<B>[]; 
	}


	/**
	 * Checks if an item is equivalent to _deleted
	 * @param i A generic Woo model
	 */
	protected isExternalItemDeleted(i?: A) {
		return Boolean(!i || i.status === 'trash');
	}

	/**
	 * Checks if the local item is deleted
	 * @param i A local basemodel
	 */
	protected isLocalItemDeleted<T extends IBaseModel>(i: T) {
		return Boolean(i._deleted);
	}

}

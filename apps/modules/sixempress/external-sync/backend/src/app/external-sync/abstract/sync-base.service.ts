import { Request } from "express";
import { ActionRegister, AuthHelperService, CustomExpressApp, SmallUtils } from "@sixempress/main-be-lib";
import { ModelIdsHm, SyncCacheObject, SyncDataItems, AddedIdObject, ItemsBuildOpts, AddedIdInfo } from "./woo.dtd";
import to from "await-to-js";
import { AxiosError } from 'axios';
import { ExternalSyncUtils } from "../external-sync.utils";
import { SyncConfigService } from "../external-conn-paths/sync-config.service";
import { log } from "../log";
import { SyncStatService } from "./sync-stat.service";

export type OnUnsuccessfulSync<T, V> = (oUrl: string, cache: SyncDataItems<T>, opts: ItemsBuildOpts, currentlyProcessing: V, missingRefs: ModelIdsHm) => Promise<boolean>

export abstract class BaseSyncService<T extends object, V extends object, X extends Partial<object>> {

	/**
	 * The debounce time we wait when receiving new data
	 * as woocommerce emits three times the same thing
	 * we need to debounce
	 */
	private static DEBOUNCE_TIME = 500;

	/**
	 * The max time that the sync can be debounced
	 * this is as the function could be called a lot of times per second
	 * (what if the system handles 100 user that each do 1000 sales per day?)
	 * 
	 * thus we need to cap the debounce time to a limit
	 */
	private static DEBOUNCE_TIME_MAX_WAIT = 1000;

	/**
	 * How many times we can retry to sync the data before deleting it
	 */
	private static MAX_SYNC_ERROR_LIMIT = 6;

	/**
	 * the time to wait while retrying a failed sync
	 */
	private static SYNC_ERROR_INTERVAL_TIMEOUT_MS = 15_000;

	/**
	 * The timeout after a syncSingleClient fails
	 * 
	 * we need to keep this number a bit high due to the fact that the sync checks if all dependencies are present
	 * so it can create a chain of dependencies to sync
	 * e.g. we sync order -> it's missing a product so we sync product -> product is missing category so we sync category
	 */
	private static TIMEOUT_SYNC_SINGLE_MS = 60_000; // 1 min;

	/**
	 * A hashamap of crud types and the ids to update
	 */
	private syncRequestItems: SyncCacheObject<T> = {};

	/**
	 * The order in which the models should be synced to make sure data is not correpted in references
	 */
	protected abstract orderedSteps: Array<{modelClass: string, processAll?: boolean}>;

	/**
	 * This function executes the sync and clears the cache
	 * it is debounced as woocommerce can send multiple same request at the same time
	 */
	protected onCrudUpdate = SmallUtils.debounce(
		BaseSyncService.DEBOUNCE_TIME, 
		this.syncCrudUpdates.bind(this),
		BaseSyncService.DEBOUNCE_TIME_MAX_WAIT,
	);

	/**
	 * Generates the path to receive updates from the site
	 */
	public abstract start(app: CustomExpressApp): void;

	/**
	 * Adds a timeout wrapper to the syncSingleClient to make sure we do not have any instances where the promise is left hanging
	 */
	protected syncSingleClientWithTimeout(req: Request, slug_or_url: string, data: SyncDataItems<T>, opts?: X): Promise<void> {
		return new Promise((r, j) => {
			const timeout = setTimeout(() => j(new Error('syncSingleClient Timeout reached')), BaseSyncService.TIMEOUT_SYNC_SINGLE_MS);

			this.syncSingleClient(req, slug_or_url, data, opts)
				.then(v => r(v))
				.catch(e => j(e))
				.finally(() => clearTimeout(timeout));
		});
	}

	/**
	 * This function exists because as it throws we need to catch the errors but continue synching other origins
	 * @param oUrl string originUrl
	 */
	protected abstract syncSingleClient(req: Request, slug_or_url: string, data: SyncDataItems<T>, opts?: X): Promise<void>;

	/**
	 * Checks if the references in the data to sync is present already in the local DB, otherwise it syncs them before continuing
	 * thus ensuring the references are always present and no malformed item is created
	 * @param objects the data to pass to get the info
	 * @returns empty if nothing to sync, otherwise the ids to sync
	 */
	protected abstract getMissingRef(req: Request, opts: X, objects: V): Promise<void | ModelIdsHm>

	/**
	 * @warning
	 * this function should not be used directly
	 * it is here only to execute tests
	 * use onRemoteCrudRequest();
	 */
	protected async syncCrudUpdates(dataObj = this.syncRequestItems, opts?: X) {

		// this is true only if the operation is automating input cached in the syncrequest items
		const isTopLevelOperation = dataObj === this.syncRequestItems;
		const throwErrors: {sou: string, total: number, totalErrors: number, models: {id: number | string, mc: string}[]}[] = [];

		for (const oUrl in dataObj) {
			// get the local copy of the item and remove from cache
			const toSync = dataObj[oUrl];
			delete dataObj[oUrl];
			
			// ensure that the req object is root so that we do not have issues with permissions
			// and can properly track the createdBy id
			const req = toSync.req;
			AuthHelperService.setRootJwt(req);

			// applies modification to the toSync object and removes the ids already being processed
			// TODO
			// If we are syncing missing references and one of those references is already being processed in another loop
			// then we will skip it and continue syncing an item that is expecting a dependency which is not present
			// thus breaking the item. We should either not filter processing ids when it's not topLevelOperation
			// or add some callback when the processing of that id is finished
			const stat = await SyncStatService.createSyncStatTrackAndLock(req, oUrl, toSync, isTopLevelOperation);
			log('Starting sync for', oUrl, stat.trackId, Object.keys(toSync.data));

			for (const m of this.orderedSteps) {
				const model = m.modelClass;
				if (!toSync.data[model] || !toSync.data[model].size)
					continue;

				// all at once (e.g. for product movement that sum the final number together)
				if (m.processAll) {
					const ids = Array.from(toSync.data[model].keys());
					log('Syncing items all', oUrl, stat.trackId, model, ids);
					const copied = {...toSync, data: {[model]: toSync.data[model]}};
					const [e] = await to(this.syncSingleClientWithTimeout(req, oUrl, copied, opts));
					await stat.onAfter(req, model, ids, e);
				}
				// we sync 1 by 1 to avoid overloading both our server and remote server
				else for (const [id, val] of toSync.data[model].entries()) {
					log('Syncing item', oUrl, stat.trackId, model, id);
					const copied = {...toSync, data: {[model]: new Map([[id, val]])}};
					const [e] = await to(this.syncSingleClientWithTimeout(req, oUrl, copied, opts));
					await stat.onAfter(req, model, id, e);
				}
			}

			await stat.close(req);

			if (stat.errs.length) {
				const toThrow = await this.handleSyncError(req, stat.errs.map(e => e.error), oUrl, toSync, isTopLevelOperation)
				toThrow && throwErrors.push({sou: oUrl, total: stat.total, totalErrors: stat.errs.length, models: stat.errs.map(e => ({id: e.id, mc: e.mc}))});
			}

			log('Sync finished for', oUrl, stat.trackId);
		}

		if (throwErrors.length) {
			log.error('Errors during sync process', throwErrors);
			throw new Error('Sync was not fully successful. Please check previous logs for more information');
		}
	}

	/**
	 * This function safely creates refs for the desired items
	 * safely means that it respects the processingItems array
	 * @param slug the slug of the client
	 * @param ext the external connection
	 * @param opts custom options for to pass to the sync function
	 * @param ensureRef the items that will be synced
	 * @param onUnsuccessful a function that can do any processing on refs that were not able to automaticaly sync. Return false to throw, Return true to confirm success
	 */
	protected async syncMissingReferences(slug_or_url: string, cache: Omit<SyncDataItems<T>, 'data'>, opts: X, ensureRef: V, onUnsuccessful: OnUnsuccessfulSync<T, V>) {
		const refsToSync = await this.getMissingRef(cache.req, opts, ensureRef);
		if (!refsToSync) 
			return;

		// ensure we also cleanup empty keys
		for (const mc in refsToSync)
			if (!refsToSync[mc].size)
				delete refsToSync[mc];

		if (!Object.keys(refsToSync).length)
			return;

		const parsed = Object.keys(refsToSync).reduce((car, cur) => (car[cur] = Array.from(refsToSync[cur].entries()), car), {});
		log('Syncing missing references', slug_or_url, parsed);

		const d: SyncDataItems<T> = {...cache, data: refsToSync};
		await this.syncCrudUpdates({[slug_or_url]: d}, opts);
	}

	/**
	 * Checks if the error received is severe or not and restores data
	 * this function then returns the errors to throw
	 */
	private async handleSyncError(req: Request, err: AxiosError | AxiosError[] | any | any[], slug_or_url: string, cacheBeingWorked: SyncDataItems<T>, retry: boolean): Promise<void | Error[]> {

		// we need to handle array of errors, as push to remote for local->remote is done in parallel ? 
		const errArr: any[] = Array.isArray(err) ? err : [err];
		const toThrow: any[] = [];

		for (const e of errArr) {
			
			// server offline
			// so we remove that connection from the pool
			// and don't throw an error
			if (ExternalSyncUtils.isAxiosEndUnreachable(e)) {
				const extConns = await ExternalSyncUtils.getExternalConnections(req, false);
				const rel = extConns.find(ext => e.config.endpoint.includes(ext.originUrl));
				if (rel)
					await SyncConfigService.disableExternalConnection(req, slug_or_url, rel._id);

				return;
			}
			if (retry)
				this.startRetryFailed(slug_or_url, cacheBeingWorked);
	
			// add the error to DB
			toThrow.push(e);
		}

		return toThrow;
	}

	protected async startRetryFailed(slug_or_url: string, cacheBeingWorked: SyncDataItems<T>) {
		const parsed = Object.keys(cacheBeingWorked.data).reduce((car, cur) => (car[cur] = Array.from(cacheBeingWorked.data[cur].entries()), car), {});
		log.error('Starting retry interval for', slug_or_url, parsed); 

		const errors: any[] = [];
		for (let retry = 0; retry < BaseSyncService.MAX_SYNC_ERROR_LIMIT; retry++) {
			await new Promise(r => setTimeout(r, BaseSyncService.SYNC_ERROR_INTERVAL_TIMEOUT_MS))

			try { await this.syncCrudUpdates({[slug_or_url]: cacheBeingWorked}); }
			catch (e) { errors.push(e) }
		}

		log.error('Retry interval failed for', slug_or_url, parsed, ...errors); 
	}

	/**
	 * Adds the item to the current cache
	 */
	protected addItemToCache(req: Request, meta: T, sou: string, model_or_type: string, id: string | number | (string | number)[], omitUrl?: string, add: Omit<AddedIdObject, 'addedMs' | 'omitOriginUrls'> = {}) {
		// push data
		if (!this.syncRequestItems[sou]) 
			this.syncRequestItems[sou] = {data: {}, meta, req};
		
		// set latest req object and ensure it is the root user to have no issues with permissions
		// and properly track the createdBy id
		this.syncRequestItems[sou].req = req;
		AuthHelperService.setRootJwt(this.syncRequestItems[sou].req);

		if (!this.syncRequestItems[sou].data[model_or_type]) 
			this.syncRequestItems[sou].data[model_or_type] = new Map();

		const arr = Array.isArray(id) ? id : [id];
		for (const i of arr) {
			this.syncRequestItems[sou].data[model_or_type].set(i, {
				addedMs: new Date().getTime(),
				omitOriginUrls: omitUrl ? [omitUrl] : [],
				...add,
			});
		}

	}

}
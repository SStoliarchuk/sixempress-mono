import { CustomExpressApp, Error503 } from "@sixempress/main-be-lib";
import { InventoryCategoryController, InventoryCategory, Product, Customer, CustomerController, ModelClass } from "@sixempress/be-multi-purpose";
import { WooTypes } from "./woo.enum";
import { Request, Response } from "express";
import { ExternalSyncUtils } from "../external-sync.utils";
import { ExternalConnection } from "../external-conn-paths/sync-config.dtd";
import { DataSyncService } from "./sync/data-sync.service";
import { BaseSyncService, OnUnsuccessfulSync } from "./sync-base.service";
import { WooBuiltAggregatedInfo, WooCrudUpdate, ModelIdsHm, SyncDataItems, ItemsBuildOpts } from "./woo.dtd";
import { ProductTypeController } from "./sync/ProductType.controller";
import to from "await-to-js";
import { SyncProductsService } from "./sync/sync-products.service";
import { SyncProductMovementsService } from "./sync/sync-product-movements.service";
import { SyncProductMovementsUtilities } from "./sync/sync-product-movements.utils";

export type RemoteToLocalSteps<T extends WooTypes> = {
	processAll?: boolean,
	modelClass: T,
	process(endpoint: ExternalConnection, req: Request, ids: (number | string)[], objects: Map<string | number, T>, opts?: ItemsBuildOpts): Promise<void>,
	onUnsuccessful: OnUnsuccessfulSync<RemoteSyncMeta, RemoteRefBuild>,
};

export type RemoteSyncMeta = {
	slug: string, 
	ext: ExternalConnection,
}

export type RemoteRefBuild = {
	meta: RemoteSyncMeta,
	objects: WooBuiltAggregatedInfo
}

export abstract class SyncRemoteToLocalService extends BaseSyncService<RemoteSyncMeta, RemoteRefBuild, ItemsBuildOpts> {

	protected abstract orderedSteps: RemoteToLocalSteps<any>[];
	protected abstract productSync: SyncProductsService<any>;
	protected abstract productMovSync: SyncProductMovementsService<any>;

	public abstract syncToLocal(req: Request, slug: string, extConn: ExternalConnection, opts?: ItemsBuildOpts): Promise<void>

	/**
	 * Adds the request notification to queue
	 */
	protected async processCrudRequest(req: Request, body: WooCrudUpdate) {

		// TODO instead of directly adding we should check if the origin_url is enabled in the system
		// and if not we ignore the request, thus we dont add unecessary garbage
		//
		// we can do it for each crud request as the external conections are cached


		// get info from the request
		const info = ExternalSyncUtils.getRequestBaseInfo(req);
		if (!info.originUrl) 
			return;

		// we ensure that the connection is actually enabled
		// if no config, or no location id, then we cannot create new documents
		// so we skip this cache withouth restoring it
		const ext = await ExternalSyncUtils.getExternalConnectionInfo(req, ['crudFromRemote'], info.originUrl);
		if (!ext || !ext.locationId) 
			return;

		this.addItemToCache(req, {slug: info.slug, ext: ext}, info.originUrl, body.item_type, body.id, info.originUrl);
		this.onCrudUpdate();
	}
	
	protected abstract fetchRemoteObjects(req: Request, ext: ExternalConnection, target: {[WooType: string]: (string | number)[]}): Promise<WooBuiltAggregatedInfo>

	/**
	 * This function exists because as it throws we need to catch the errors but continue synching other origins
	 * @param oUrl string originUrl
	 */
	protected async syncSingleClient(req: Request, oUrl: string, cache: SyncDataItems<RemoteSyncMeta>, opts: ItemsBuildOpts = {}) {

		const meta = cache.meta;

		// format data to get the ids array
		const formatData: {[WooType: string]: (string | number)[]} = {};
		for (const t in cache.data) 
			formatData[t] = Array.from(cache.data[t].keys());

		const data = await this.fetchRemoteObjects(req, meta.ext, formatData);

		for (const step of this.orderedSteps) {
			const mc = step.modelClass;
			if (!formatData[mc]?.length)
				continue;

			await this.syncMissingReferences(oUrl, cache, opts, {objects: data, meta}, step.onUnsuccessful);
			await step.process(meta.ext, req, formatData[mc], data[mc], opts);
		}
	}



	/**
	 * This function checks the desiredObjects object and deletes from the objects the items that were already synced
	 * after the check for the items it returns the data to sync or void if none
	 * @param slug The slug of the local user
	 * @param ext The external conection configurations
	 * @param desiredObjects The desired items to be synced
	 * @returns RemoteSyncRequest['data'] object in case there are objects to sync
	 * @returns void if no items to sync
	 */
	protected async checkLocalReferences(req: Request, ext: ExternalConnection, desiredRemoteIds: {[localMc: string]: Set<string | number>}): Promise<void | ModelIdsHm> {
		
		const toSync = desiredRemoteIds;
		//
		// delete items already synced
		//
		for (const type in toSync) {
			
			const ids = Array.from(toSync[type].values());
			if (!ids.length)
				continue;

			// we take also deleted items as during the sync we could be syncing some old references
			// (like in order)
			// or some other things. 
			//
			// regardless in our system we don't delete stuff so no worries here
			// const baseFilter: Filter<SyncableModel> = {
			// 	_deleted: {$exists: false}
			// };

			switch (type)  {
				/**
				 * Customers
				 */
				case ModelClass.Customer:
					// get the local refs
					const localCustomers: Customer[] = await new CustomerController().getRawCollection(req).find(
						// ...baseFilter,
						DataSyncService.createQueryForMetadata(ext, {'_id': {$in: ids}})
					).toArray();
					
					const localCustIds: (number | string)[] = [];
					for (const c of localCustomers)
						localCustIds.push(c._metaData._externalIds.find(ex => ex._externalConnectionId === ext._id)._id);
					
					for (const i of ids)
						if (localCustIds.includes(i))
							toSync[type].delete(i);
					
					break;

				/**
				 * Product Categories
				 */
				case ModelClass.InventoryCategory:
					// get the local refs
					const localCats: InventoryCategory[] = await new InventoryCategoryController().getRawCollection(req).find(
						// ...baseFilter, 
						DataSyncService.createQueryForMetadata(ext, {'_id': {$in: ids}})
					).toArray();

					const localCatsIds: (number | string)[] = [];
					for (const c of localCats)
						localCatsIds.push(c._metaData._externalIds.find(ex => ex._externalConnectionId === ext._id)._id);
					
					for (const i of ids)
						if (localCatsIds.includes(i))
							toSync[type].delete(i);
					
					break;
				
				/**
				 * Product
				 */
				case ModelClass.ProductGroup:
				case ModelClass.Product:
					// get the local refs
					const localProds: Product[] = await new ProductTypeController().getRawCollection(req).find({
						// ...baseFilter,
						// the id could either be a product-group or a product-variation
						// so we check both fields
						$or: [
							DataSyncService.createQueryForMetadata(ext, {'_additional._wooProductGroupId': {$in: ids}}),
							DataSyncService.createQueryForMetadata(ext, {'_id': {$in: ids}}),
						]
					}).toArray();

					const localProdIds: (string | number)[] = [];
					for (const lp of localProds) {
						const conn = lp._metaData._externalIds.find(ex => ex._externalConnectionId === ext._id);
						localProdIds.push(conn._id);
						if (conn._additional && conn._additional._wooProductGroupId)
							localProdIds.push(conn._additional._wooProductGroupId);
					}

					// if present in id or group id then delete
					for (const i of ids)
						if (localProdIds.includes(i))
							toSync[type].delete(i);
					
					break;

				/**
				 * Throw if a not supported type is passed
				 */
				default:
					throw new Error503('Item of type: "' + type + '" cannot be checked for referenced fields');
			}

		}

		//
		// create sync request item
		//
		const refs: ModelIdsHm = {};
		const ms = new Date().getTime();

		for (const t in toSync) {
			if (toSync[t].size)
				refs[t] = new Map();
				for (const k of toSync[t])
					refs[t].set(k, {addedMs: ms, omitOriginUrls: [ext.originUrl]});
		}

		// no references to sync
		if (Object.keys(refs).length === 0)
			return;
		
		return refs;
	}

}

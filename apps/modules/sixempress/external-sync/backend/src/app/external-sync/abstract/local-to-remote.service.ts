import { Request } from "express";
import { AbstractDbApiItemController, AbstractDbItemController, CrudType, Error503, FindDbOptions, LibModelClass, ModelFetchService, MongoDBFetch, RequestHelperService } from "@sixempress/main-be-lib";
import { ModelClass, InventoryCategoryController, InventoryCategory, ProductMovement, CustomerOrderController, TrackableVariation, AdditionalFindOptions, ProductGroup, ProductController, ProductMovementController } from '@sixempress/be-multi-purpose';
import { ModelIdsHm, ItemsBuildOpts, AddedIdInfo, SyncDataItems } from "./woo.dtd";
import { ExternalSyncUtils } from "../external-sync.utils";
import { Collection, ObjectId, AnyBulkWriteOperation } from "mongodb";
import { SyncableModel } from "../syncable-model";
import { ExternalConnection, ExternalConnectionType } from "../external-conn-paths/sync-config.dtd";
import { BaseSyncService, OnUnsuccessfulSync } from "./sync-base.service";
import { MRequestAugmented } from "@stlse/backend-connector/contracts/src";
import { ExpressAdapter } from "@stlse/backend-connector";
import { ProductTypeController } from "./sync/ProductType.controller";
import { DataSyncToRemote } from "./sync/data-sync.service";

type A = typeof AbstractDbItemController;
export interface Type<T> extends A { new (...args: any[]): T; }

export type LocalToRemoteSteps<A extends SyncableModel> = {
	modelClass: ModelClass,
	processAll?: boolean,
	controller: Type<AbstractDbItemController<SyncableModel>>,
	fetch: MongoDBFetch[],
	send(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, objects: A[], opts?: ItemsBuildOpts): Promise<DataSyncToRemote<A>>,
	onUnsuccessful: OnUnsuccessfulSync<Meta, RefBuild>,
};

type Meta = {

}

type RefBuild = {
	eps: ExternalConnection[], 
	mc: ModelClass, 
	models: SyncableModel[], 
	currentProcessing: ModelIdsHm,
	slug: string,
}

type SyncOpts = ItemsBuildOpts & {
	forceEndpoints?: ExternalConnection[], 
	buildOpts?: ItemsBuildOpts,
}

/**
 * this class is the central logic for processing sync between remote and local
 * it basically has the same flow duplicated (remote->local local->remote) BUT 
 * each flow has it's own little niches...
 * 
 * so in the big picture the flows are identical, but then you see the little details and they 
 * are different :/
 */
export abstract class SyncLocalToRemoteService extends BaseSyncService<Meta, RefBuild, SyncOpts> {

	/**
	 * the steps to do to sync a modelClass from local change to remote origin
	 */
	protected abstract orderedSteps: LocalToRemoteSteps<any>[];

	public async handleHookCrudEvent(mreq: MRequestAugmented, opArgs: any[], type: CrudType, modelClass: string, ids: string[]) {

		if (!this.orderedSteps.some(i => i.modelClass === modelClass))
			return;
		
		// after we send an object to remote we update the externalId triggering db hook
		// so we stop this update to prevent an infinite loop
		if (type === 'update' && JSON.stringify(opArgs).includes('_metaData._externalIds'))
			return;

    const res = ExpressAdapter.createRes();
    const req = ExpressAdapter.createReq(mreq, res);
    RequestHelperService.parseQueryStrings(req);

    // use trackable ids and product groups under the hood
    if (modelClass === ModelClass.Product)
      ids = (await new ProductController().getRawCollection(req).aggregate([
        {$match: {_id: {$in: ids.map(i => new ObjectId(i))}}},
        {$group: {_id: '$_trackableGroupId'}}
      ]).toArray()).map(g => g._id.toString());
		
		return this.processLocalCrudAction(req, type, modelClass, ids);
	}

	/**
	 * Sends all the data to the remote connection to sync it
	 * @param slug The slug of the db to sync
	 * @param extConn the connection where to sync the data
	 * @param opts additional options for the sync
	 */
	public async syncToRemote(req: Request, slug: string, extConn: ExternalConnection, opts?: ItemsBuildOpts) {

		// controllers to sync
		const toSync = [
			{modelClass: ModelClass.InventoryCategory, controller: new InventoryCategoryController()},
			{modelClass: ModelClass.Product, fn: async () => {
				return (await new ProductTypeController().getRawCollection(req)
					.aggregate([{$group: {_id: '$_trackableGroupId'}}]).toArray())
					.map(p => p._id);
			}},
			{modelClass: ModelClass.CustomerOrder, controller: new CustomerOrderController()},
		];

		// set what items to sync
		if (opts.selectMapItems && Object.keys(opts.selectMapItems).length) {
			// if (opts.selectMapItems.customers !== true)
				// we do not sync customers

			if (opts.selectMapItems.productCategories !== true)
				toSync.splice(toSync.findIndex(c => c.modelClass === ModelClass.InventoryCategory), 1);

			if (opts.selectMapItems.products !== true)
				toSync.splice(toSync.findIndex(c => c.modelClass === ModelClass.Product), 1);

			if (opts.selectMapItems.orders !== true)
				toSync.splice(toSync.findIndex(c => c.modelClass === ModelClass.CustomerOrder), 1);
		}
		
		
		// build the data to pass
		const d: ModelIdsHm = {};
		for (const cClass of toSync) {
			const modelClass = cClass.modelClass;
			// We also take the _deleted items to make sure that remote will delete them
			const ids = cClass.fn ? await cClass.fn() : (await (cClass.controller.getRawCollection(req) as Collection<SyncableModel>).find(
				// take only those that are not disabled for this connection
				{'externalSync.disabled.id': {$ne: extConn._id}},
				{projection: {_id: 1}
			}).toArray()).map(i => i._id.toString());
			
			d[modelClass] = new Map();
			
			// current time ms
			const ms = new Date().getTime();
			for (const i of ids) 
				d[modelClass].set(i, {addedMs: ms});
		}

		// that was easy (lol it was one of the hardest thing i've done)
		await this.syncCrudUpdates(
			{[slug]: {req, data: d, meta: {}}}, 
			{forceEndpoints: [extConn], buildOpts: opts}
		);
	}

	/**
	 * Stores the crud notif in a cache and triggers the debounced function
	 */
	private async processLocalCrudAction(req: Request, type: CrudType, model: ModelClass | string, ids: string[]) {
		const reqInfo = ExternalSyncUtils.getRequestBaseInfo(req);

		const exts = await ExternalSyncUtils.getExternalConnections(req, ['crudFromLocal']);
		// either no configured endpoints or the only endpoint is the same as the one that the req is coming from
		// we check the second case only if the model is not a product_movement
		// as the prod-mov needs the _metaData always to be present even if we dont send to remote
		const noOtherEndpoints = (exts.length === 0 || (model !== ModelClass.ProductMovement && exts.length === 1 && exts[0].originUrl === reqInfo.originUrl));


		// if no active conncetions, or the only active one is the same where the data comes
		// then we don't add it to array to prevent usless function triggers
		if (noOtherEndpoints)
		 	return;

		// dont add useless data
		if (!this.orderedSteps.some(i => i.modelClass === model))
			return;

		// we also pass the product movements through here instead of doing an immediate send to remote
		// it is useless as woocommerce is really slow in some clients so there is no benefit for immediate sync to remote
		// it's better to let it debounce so that if we delete and re-create the same movement it will get "collapsed" into 0 and not be sent

		// we override old ids value as obviously if a new crud update comes, we need to notify all the positions
		// except the one where the notification comes from
		this.addItemToCache(req, {}, reqInfo.slug, model, ids, reqInfo.originUrl, {emitType: type});
			
		// trigger sync
		this.onCrudUpdate();
	}

	/**
	 * This function exists here because it throws and wee need to continue local sync to remote even if an origin fails
	 * @param slug the slug of the client
	 * @param mc the ModelClass of the items to sync
	 */
	protected async syncSingleClient(req: Request, slug: string, syncData: SyncDataItems<Meta>, opts: SyncOpts = {}) {

		let endpoints = await this.getEndpoints(req, slug, opts.forceEndpoints);
		if (!endpoints)
			return;

		const data = syncData.data;

		// sync each model in specific order to ensure the references are present in remote
		for (const step of this.orderedSteps) {
			const mc = step.modelClass;

			// skip not present model classes
			//
			// skip if steps not present
			// (this check is already done when adding to cache but we repeat just to be safe)
			if (!data[mc])
				continue;

			// get data for building and sending
			const controller: AbstractDbApiItemController<any> = new (step.controller as any)();
			const localItems = await controller.findForUser(
				req, {_id: {$in: Array.from(data[mc].keys()).map(i => new ObjectId(i))}}, 
				{skipFilterControl: true, skipAmountsCalculation: true} as AdditionalFindOptions as FindDbOptions
			);

			if (step.fetch.length)
				await ModelFetchService.fetchAndSetFields(req, step.fetch, localItems);

			// ensure the reference are present
			await this.syncMissingReferences(
				slug, syncData, opts, 
				{slug, mc, eps: endpoints, models: localItems, currentProcessing: data}, 
				step.onUnsuccessful
			);

			// update the endpoints available in case during the sync some endpoints were disable
			// as those endpoints are unavailable now
			//
			// this call is not expensive as in the case no changes have been made, the endpoints are cached
			endpoints = await this.getEndpoints(req, slug, endpoints);
			if (!endpoints)
				return;
			
			// build and then send
			const responses = await step.send(req, endpoints, slug, data[mc], localItems, opts.buildOpts);

			// send and receive metaData updates to write
			const allUpdates: AnyBulkWriteOperation<SyncableModel>[] = [];
			// we store the errors to send the data to all the locations that will receive, so as not to stop on a first broken one
			const errors: any[] = [];

			for (const b of responses) {
				if (b.errors?.length)
					errors.push(...b.errors)
				if (b.ops?.length) 
					allUpdates.push(...b.ops);
			}

			// apply updates with raw collection as to not trigger crud notifications
			// as the fields updated here are the _metaData only
			//
			// we apply only the successfull obviously as the errors are stored in the array
			if (allUpdates.length)
				await controller.getRawCollection(req).bulkWrite(allUpdates);

			// finally throw errors
			if (errors.length === 1)
				throw errors[0];
			else if (errors.length)
				throw errors;
		}
	
	}


	/**
	 * returns only the endpoints that are activated from crud from local to remote
	 * @param slug slug of the client
	 * @param filterEps give manually the endpoints to return, and this function ensures all of them are still active and valid 
	 * (used to ensure the endpoints are valid after a multip root config update)
	 */
	protected async getEndpoints(req: Request, slug: string, filterEps?: ExternalConnection[]) {
		// ensure endpoints are present
		const beEndpoints = (await ExternalSyncUtils.getExternalConnections(req, ['crudFromLocal']))
			.filter(e => e.type === ExternalConnectionType.wordpress);

		// no active at all :/
		if (beEndpoints.length === 0)
			return;

		// nothing to filter
		if (!filterEps)
			return beEndpoints;

		// filter the endpoints that were manually given
		// to ensure all are active and correct type
		filterEps = filterEps.filter(i => i.type === ExternalConnectionType.wordpress &&  beEndpoints.some(e => e._id === i._id));
		if (filterEps.length === 0)
			return;

		return filterEps;
	}

	/**
	 * Creates a list of items to sync. these items are referenced by the data given but not yet synced online
	 * the same as remote-to-local sync
	 * @param eps all the external connections available for that slug
	 * @param slug The slug of the local db
	 * @param mc the model class of the ref
	 * @param models the fetched models that will be updated
	 */
	protected async getMissingRef(req: Request, opts: SyncOpts, {models, currentProcessing, eps, mc, slug}: RefBuild): Promise<void | ModelIdsHm> {

		if (!models.length)
			return;

		// no endpoint active so no filter
		eps = await this.getEndpoints(req, slug, eps);
		if (!eps)
			return;

		const toSync: {[ModelClass: string]: Map<string | number, 0 | SyncableModel>} = {};
		for (const s of this.orderedSteps)
			toSync[s.modelClass] = new Map();

		//
		// get the items to sync
		//
		switch (mc) {
			case ModelClass.InventoryCategory:
				for (const m of (models as InventoryCategory[]))
					if (m.extends)
						toSync[ModelClass.InventoryCategory].set(m.extends.id, 0);
				break;

			case ModelClass.Product:
				for (const m of (models as ProductGroup[]))
					if (m.groupData.category)
						toSync[ModelClass.InventoryCategory].set(m.groupData.category.id, 0);
				break;
			
			case ModelClass.ProductMovement:
				for (const m of (models as ProductMovement[]))
					toSync[ModelClass.Product].set(m.targetProductInfo.product.id, 0);
				break;

			/** for now we dont do anything as we sync only the state */
			case ModelClass.CustomerOrder:
				break;

			default:
				throw new Error503('ModelClass: "' + mc + '" cannot be checked for referenced fields');
		}


		// remove data that is currently being already synced
		// as we follow an order in sync, we can do this safely
		for (const t in toSync) {
			if (currentProcessing[t])
				for (const [id, val] of toSync[t].entries())
					if (currentProcessing[t].has(id))
						toSync[t].delete(id);

			if (!toSync[t].size)
				delete toSync[t];
		}

		return this.checkLocalReferences(req, eps, toSync);
	}

	/**
	 * Checks the databse if the requested items toSync are already present, 
	 * @param req The req object for queries
	 * @param eps the external connection where to sync the items
	 * @param toSync the items to check for presence
	 * @returns void if all present
	 * @returns the object sync of the items missing
	 */
	private async checkLocalReferences(req: Request, eps: ExternalConnection[], toSync: {[ModelClass: string]: Map<string | number, 0 | SyncableModel>}): Promise<void | ModelIdsHm> {
		//
		// delete items already synced
		//
		for (const mc in toSync) {

			// get controller to use
			let controller: AbstractDbItemController<SyncableModel>;

			switch (mc) {
				case ModelClass.InventoryCategory: 
					controller = new InventoryCategoryController() as AbstractDbItemController<SyncableModel>; 
					break;

				case ModelClass.Product: 
					controller = new ProductTypeController() as AbstractDbItemController<SyncableModel>; 
					break;
					
				default:
					throw new Error503('ModelClass: "' + mc + '" cannot be checked for referenced fields');
			}

			// get items
			const ids = Array.from(toSync[mc].keys()).map(i => new ObjectId(i));
			const items = await controller.findForUser(
				req,
				// TODO take deleted items or not ?
				{_id: {$in: ids}, /* _deleted: {$exists: false} */ },
				{skipFilterControl: true}
			);
			for (const i of items)
				toSync[mc].set(i._id.toString(), i);
		}

		// 
		// build return object
		//
		const ret: ModelIdsHm = {};
		const ms = new Date().getTime();

		for (const mc in toSync) {
			if (!toSync[mc].size)
				continue;

			// build data for the classModel
			const data: AddedIdInfo = new Map();
			for (const [id, val] of toSync[mc].entries()) {
				const o = val as SyncableModel;
				
				// if the item is deleted we cannot sync it to remote
				// NOTE
				// deleted items should NEVER be referenced by the system
				// for example if we delete a category but still reference it in the product, then that is a mistake
				// as wordpress does not hold deleted items like we do
				//
				// thus the system should avoid referencing deleted items, and remove references when those items are deleted
				// like we do for categories in products, we delete that ref
				if (((o as TrackableVariation<any>)._trackableGroupId && (o as TrackableVariation<any>)._groupDeleted) || o._deleted)
					continue;

				// get the missing external points
				const omitUrls: string[] = o._metaData?._externalIds?.map(e => e._externalConnectionId) || [];

				if (o.externalSync?.disabled)
					for (const d of o.externalSync?.disabled)
						omitUrls.push(d.id);

				// add only if the omitUrl doesn't contain all the endpoints
				if (eps.some(ep => !omitUrls.includes(ep._id)))
					data.set(id, { addedMs: ms, omitOriginUrls: omitUrls })
			}

			// add the data to the return objcet
			if (data.size)
				ret[mc] = data;
		}

		return Object.keys(ret).length ? ret : undefined;
	}

	protected async onUnsuccessfullMissingRefSync(slug_or_url: string, cache: Omit<SyncDataItems<Meta>, 'data'>, opts: SyncOpts, ensureRef: RefBuild, missingRef: ModelIdsHm): Promise<boolean> {
		return false;
	}

}

import { Error400, FindDbOptions, IBaseModel } from "@sixempress/main-be-lib";
import { ProductController, AdditionalFindOptions, ProductGroup, InventoryCategory, InventoryCategoryController, ProductGroupNoAmounts, ProductGroupWithAmount, ProductWithAmounts } from '@sixempress/be-multi-purpose';
import { ItemsBuildOpts, AddedIdInfo } from "../woo.dtd";
import { WooBaseItem, WooProduct } from "@sixempress/contracts-agnostic";
import { Request } from "express";
import { DataSyncService } from "./data-sync.service";
import { AnyBulkWriteOperation, Filter, ObjectId } from "mongodb";
import { SyncableModel } from "../../syncable-model";
import { ExternalConnection } from "../../external-conn-paths/sync-config.dtd";
import { ExternalSyncUtils } from "../../external-sync.utils";
import to from "await-to-js";
import { SyncConfigService } from "../../external-conn-paths/sync-config.service";
import { ProductGroupTypeController, ProductTypeController } from "./ProductType.controller";
import { WooProductSimple } from "../../wordpress/woo.dtd";
import { SyncProductCategories } from "./sync-product-categories.service";

export type AddRemoteData = {categoriesHm: {[id: string]: InventoryCategory}, skus: {[sku: string]: {groupId: string, varId: string}}};
export type AddLocalData = {categoriesHm: {[id: string]: {[extId: string]: number | string}}};

type ProductImages = {name?: string, src?: string};

export type ImagesOnlyUpdateCache = {
	[groupId: string]: {
		images: ProductImages[], 
		variations: {
			[prodId: string]: {
				images: ProductImages[]
			}
		}
	}
}

export type NameMappingReturn = {
	localRemote: {[localId: string]: number | string},
	remoteLocal: {[remoteId: string]: string},
	localProducts: {[groupId: string]: ProductGroup},
	remoteProducts: {[remoteId: string]: WooProductSimple},
}

type BuiltWooProducts<A extends WooBaseItem> = {
	local: ProductGroup[], 
	remote: A[], 
	ec: ExternalConnection,
	images: ImagesOnlyUpdateCache[],
};

export abstract class SyncProductsService<A extends WooProductSimple> extends DataSyncService<A, ProductGroup> {

	protected abstract productCatSync: SyncProductCategories<any>;
	
	protected abstract translatePgToRemote(ep: ExternalConnection, slug: string, add: AddLocalData, s: ProductGroupWithAmount, groupId: string | number, filteredModels: ProductWithAmounts[], opts: ItemsBuildOpts): {item: A, images: ImagesOnlyUpdateCache}

	protected abstract sendPayload(req: Request, ec: ExternalConnection, slug: string, data: A[]): Promise<{[localGid: string]: {[localPid: string]: {pid: number, gid: number}}}>;

	protected abstract sendImageInformation(req: Request, ec: ExternalConnection, items: {id: number; images: ProductImages[];}[]): Promise<void>

	protected abstract getAllRemoteIds(req: Request, ec: ExternalConnection): Promise<(number | string)[]>;
	
	protected abstract fetchRemoteDataForAssociations(req: Request, ec: ExternalConnection, ids: (number | string)[]): Promise<Map<string | number, {id: string | number, name: string, sku: string}>>;
	
	protected abstract translateItemToLocal(req: Request, ep: ExternalConnection, ref: A[], loc: Map<A, ProductGroup>): Promise<Map<A, ProductGroup>>;

	// public PROJECTION: {[A in keyof WooProductSimple]: 1} = {

	// }

	/**
	 * We sent 1 image at a time to the endpoint, this is not to overwork php threads and block the server
	 * so here we store the queue
	*/
	private imagesQueue: {[extId: string]: {
		ext: ExternalConnection,
		items: Array<{gid: number, pid?: number, images: ProductImages[], errorCount?: number}>
	}} = {}

	private isImagesQueueRunning = false;

	private MAX_IMAGES_QUEUE_RETRY = 5;
	

	/**
	 * Takes the product ids (not trackable group ids) and transforms the relative product to the products to send to WOO
	 * @param slug the slug of the client
	 * @param data contains the hashmap of the data with the key as the model._id not the _trackableGroupId
	 */
	public async translateAndSendToRemote(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, localProds: ProductGroupNoAmounts[], opts: ItemsBuildOpts = {}) {

		// skip filter control as to ensure we get the deleted items too
		// keep the deleted models as we'll use their groupId
		const prodGroups = await this.fullGroupProductQueryWithAmounts(
			req, {_trackableGroupId: {$in: localProds.map(p => p._trackableGroupId)}}
		);

		const add = await this.getLocalAddData(req, localProds);

		const tor: BuiltWooProducts<A>[] = [];
		for (const ep of endpoints) {
			// TODO add deleted ids ?
			// and by deleted i mean COMPLETELY deleted, as in not present in db
			// i dont think we need as we NEVER delete completely an item, but we set it to _deleted :]
	
			const toSend: A[] = [];
			const images: ImagesOnlyUpdateCache[] = [];
			for (const s of prodGroups) {

				// ensure that this product should be synced online
				if (s.externalSync?.disabled?.some(e => e.id === ep._id)) 
					continue;

				
				// remove manually deleted items as we dont need remainings online but we need the quantities of the products
				const filteredModels = s.models.filter(m => !m._deleted);
				// just in case
				if (filteredModels.length === 0) 
					continue;

				// check if we should ignore this productGroup for this endpoint

				// get the latest added child model info 
				const latestAddedCrudModelIdx = filteredModels.reduce((car, cur, idx) => data.get(cur._id.toString())?.addedMs > car[0] ? [data.get(cur._id.toString()).addedMs, idx] : car, [0, 0])[1];
				const omittedUrls = data.get(filteredModels[latestAddedCrudModelIdx]._id.toString())?.omitOriginUrls;
				// and check if one of the models is ignoring this origin url
				// we need only 1 model and not all of the models, as the crud notification emits ONLY CHANGED MODELS not the whole group
				// and if we have a modification from an url we are sure that the whole object has changed as the model is part of the group
				// :]
				if (omittedUrls && omittedUrls.find(o => ep.originUrl.includes(o)))
					continue;

				// get the main id of the product
				let groupId: number;
				for (const m of s.models) {
					// try in the mapping
					if (opts.forceProductMapping && opts.forceProductMapping.localRemote[m._trackableGroupId]) {
						groupId = opts.forceProductMapping.localRemote[m._trackableGroupId];
					}
					// find in the models
					else if (m._metaData?._externalIds) {
						for (const ei of m._metaData._externalIds) {
							if (ei._externalConnectionId === ep._id && ei._additional?._wooProductGroupId) {
								groupId = ei._additional?._wooProductGroupId;
								break;
							}
						}
					}
				}

				const prod = this.translatePgToRemote(ep, slug, add, s, groupId, filteredModels, opts)
				toSend.push(prod.item);
				images.push(prod.images);
			}

			if (toSend.length)
				tor.push({ec: ep, local: prodGroups, remote: toSend, images});
		}
		
		const res: Array<{errors: any[], ops: AnyBulkWriteOperation<ProductGroup>[]}> = [];
		for (const bData of tor) {
			const [e, d] = await to(this.sendWooProducts(req, slug, bData));
			res.push(e ? {errors: [e], ops: []} : {errors: [], ops: d});
		}

		return res;
	}

	/**
	 * returns the additional data for the items to sync
	 * @param req request object for queries
	 * @param localObj the items that has to be synced online
	 */
	private async getLocalAddData(req: Request, localObj: ProductGroup[]): Promise<AddLocalData> {
		const allCatsIds: ObjectId[] = [];
		for (const ob of localObj) {
			if (ob.groupData.category)
				allCatsIds.push(new ObjectId(ob.groupData.category.id));

			if (ob.groupData.additionalCategories)
				for (const c of ob.groupData.additionalCategories)
					allCatsIds.push(new ObjectId(c.id));
		}

		const cats = await new InventoryCategoryController().findForUser(
			req, 
			{_id: {$in: allCatsIds}},
			{skipFilterControl: true},
		);

		const catsHmIds: AddLocalData['categoriesHm'] = {};
		for (const c of cats) {
			if (c._metaData?._externalIds) {
				const id = c._id.toString();
				catsHmIds[id] = {};
				for (const e of c._metaData._externalIds)
					catsHmIds[id][e._externalConnectionId] = e._id;
			}
		}

		return { categoriesHm: catsHmIds };
	}

	/**
	 * Sends the products array to the given URL and then returns the bulkWrite to execute on product collection to update metadata
	 * We send them for one ext-connection at a time, such that if one fails we still have updated the local items meta datas for other connections
	 * 
	 * @param slug used to generate the metadta prefix
	 * @param ec the external connection where to send the data
	 * @param prod the products to send
	 * @param localRefItems the items relative to the products to send, used to check if we need to update the external ids in those items
	 */
	public async sendWooProducts(req: Request, slug: string, bData: BuiltWooProducts<A>): Promise<AnyBulkWriteOperation<ProductGroup>[]> {
		
		const localIdRemoteIdHm = await this.sendPayload(req, bData.ec, slug, bData.remote);

		// now that we have a map we compare the items
		const bulkOps: AnyBulkWriteOperation<ProductGroup>[] = [];
		for (const pg of bData.local) {
			for (const m of pg.models) {
				
				const data = localIdRemoteIdHm[m._trackableGroupId] && localIdRemoteIdHm[m._trackableGroupId][m._id.toString()];
				
				// skip in case the model is not present in remote (aka deleted)
				// without  removing the metaData remoteId because we will use that metaData
				// to track correctly the prod-movs (for remainders etc)
				if (!data)
					continue;
				
				const op = this.createLocalMetaDataBulkOps(bData.ec, m, {
					_id: data.pid, _externalConnectionId: bData.ec._id, _additional: {_wooProductGroupId: data.gid}
				});

				if (op)
					bulkOps.push(...op);
			}
		}

		// send withouth waiting for the images to complete
		for (const sendImages of bData.images)
			this.sendImagesToProduct(req, bData.ec, sendImages, localIdRemoteIdHm);
			
		return bulkOps;
	}

	/**
	 * Sends images to remote by mapping the local gid/pid to remote ones
	 * @param ext The ext connection where to send the images
	 * @param data The built data of the images cache
	 * @param remote The remote data returned after the first POST/PUT creation
	 */
	private async sendImagesToProduct(req: Request, ext: ExternalConnection, data: ImagesOnlyUpdateCache, remote: {[localGid: string]: {[localPid: string]: {pid: number, gid: number}}}) {

		for (const LGID in data) {
			if (!remote[LGID])
				continue;

			const rlProds = Object.keys(remote[LGID]);
			const gids = remote[LGID][rlProds[0]];

			// add to group image
			if (data[LGID].images?.length)
				this.addToImageQueue(req, ext, data[LGID].images, gids.gid);	
			
			for (const LPID in data[LGID].variations) {
				if (!data[LGID].variations[LPID].images?.length || !remote[LGID][LPID])
				continue;
				
				const ids = remote[LGID][LPID];
				this.addToImageQueue(req, ext, data[LGID].variations[LPID].images, ids.gid, ids.pid);
			}
		}


	}

	/**
	 * Adds safely the images to the queue and starts the queue
	 */
	private async addToImageQueue(req: Request, ext: ExternalConnection, images: WooProductSimple['images'], gid: number, pid?: number) {
		if (!this.imagesQueue[ext._id])
			this.imagesQueue[ext._id] = {ext: ext, items: []}
		
		// update always endpoint just to be safe to have latest data
		this.imagesQueue[ext._id].ext = ext;
		this.imagesQueue[ext._id].items.push({gid, pid, images});

		// start
		this.startImageQueue(req);
	}

	/**
	 * Starts queue to sync up the images, by sending 1 image at a to each connection as to not overwork php thread
	 */
	private async startImageQueue(req: Request) {
		if (this.isImagesQueueRunning)
			return;
		this.isImagesQueueRunning = true;

		const errors: any[] = [];
		// build promises for each endpoint
		const proms: Promise<void>[] = [];
		for (const extId in this.imagesQueue) {
			const ext = this.imagesQueue[extId].ext;
			const dat = this.imagesQueue[extId].items;

			// 1 image at a time
			proms.push((async () => {
				for (let i = 0; i < dat.length; i++) {
					const d = dat[i];

					// TODO maybe we should send 1 image per request instead of 1 product images per request ?
					const [e] = await to(this.sendImageInformation(req, ext, [{id: d.pid || d.gid, images: d.images}]));

					// add error count
					if (e) {
						if (!d.errorCount)
							d.errorCount = 0;
						d.errorCount++;
						
						errors.push(e);
					}

					// remove from arr on max error count or if no error
					if (!e || d.errorCount >= this.MAX_IMAGES_QUEUE_RETRY)
						dat.splice(i--, 1);
				}
			})());
		}

		// fork join all the endpoints
		return Promise.all(proms)
			.then(() => {})
			// .catch((e) => console.log(e))
			// .catch(() => {})
			.finally(() => {
				this.isImagesQueueRunning = false;
	
				// remove completed keys
				for (const extId in this.imagesQueue)
					if (!this.imagesQueue[extId].items.length)
						delete this.imagesQueue[extId];
	
				// run again if all the items were not synced
				// call function with setTimeout to prevent max stack size
				if (Object.keys(this.imagesQueue).length)
					setTimeout(this.startImageQueue, 0);

				// throw all the errors now
				if (errors.length === 1)
					throw errors[0];
				else if (errors.length)
					throw errors;
			});

	}

	/**
	 * Syncronizes the products between the endpoints
	 * @param ep the info about the external conneciton
	 * @param req The request object to use for CRUD operations
	 * @param ids woocommerce product ids
	 * @param referenceItems woocommerce product models
	 */
	public async receiveFromRemote(ep: ExternalConnection, req: Request, ids: (string | number)[], referenceItems: Map<number | string, A>, opts: ItemsBuildOpts = {}) {

		// here we just check for the groupId as the ids we receive are only the product group ids
		// we never process the product_variation id
		const metaFilter = this.createQueryForMetadata(ep, {'_additional._wooProductGroupId': {$in: ids}});

		// skip filter control as to ensure we get the deleted items too
		const localProds = await new ProductTypeController().findForUser(
			req, 

			opts.forceProductMapping 
				// get either by meta or trackable group
				? {$or: [
						{_trackableGroupId: {$in: Object.keys(opts.forceProductMapping.localRemote)}},
						metaFilter,
					]}
				// get just by meta
				: metaFilter,
				
			{skipFilterControl: true},
		);
		const prodGroups: ProductGroupNoAmounts[] = await this.fullGroupProductQuery(
			req, {_trackableGroupId: {$in: localProds.map(p => p._trackableGroupId)}}
		);

		//
		// build items hm
		//
		const localHm = new Map<number | string, ProductGroupNoAmounts>();
		const localModelHm = new Map<A, ProductGroupNoAmounts>();
		for (const id of ids) {
			const rel = prodGroups.find(pg => 
				// present in mapping
				(opts.forceProductMapping && opts.forceProductMapping.remoteLocal[id] === pg._trackableGroupId) || 
				// or else present in the _metaData
				pg.models.some(m => 
					m._metaData?._externalIds?.some(ex => 
						ex._externalConnectionId === ep._id && (ex._id == id || ex._additional?._wooProductGroupId === id))));
	
			if (rel) {
				localHm.set(id, rel);
				if (referenceItems.has(id))
					localModelHm.set(referenceItems.get(id), rel);
			}
		}

		//
		// create and execute the actions
		//

		const translated = await this.translateItemToLocal(req, ep, Array.from(referenceItems.values()), localModelHm);
		const acts = this.createCrudActions(ep, ids, referenceItems as Map<string | number, A>, localHm, translated);
		await this.executeCrudActions(req, new ProductGroupTypeController(), acts, {idField: '_trackableGroupId'});
	}

	/**
	 * Creates the additional data for the products that will be synced
	 * @param req request object for queries
	 * @param ep the external connection where we are sync data
	 * @param referenceItems the ref items that will be updated
	 */
	protected async getRemoteAddData(req: Request, ep: ExternalConnection, remote: {catIds: (string | number)[], skus: string[]}): Promise<AddRemoteData> {
		
		//
		// cats
		//

		const cats = await new InventoryCategoryController().findForUser(
			req, 
			this.createQueryForMetadata(ep, {'_id': {$in: remote.catIds}}),
			{skipFilterControl: true},
		);
		const catsHmIds: {[id: string]: InventoryCategory} = {};
		for (const c of cats) {
			const id = this.productCatSync.getRemoteId(c, ep);
			if (id) catsHmIds[id] = c;
		}

		//
		// skus
		//

		const skusVals = remote.skus;
		const prod = await new ProductController().findForUser(
			req,
			{$or: [{'groupData.uniqueTags': {$in: skusVals}}, {'infoData.sku': {$in: skusVals}}]},
			{skipFilterControl: true},
		);

		const skusReturn: {[sku: string]: {groupId: string, varId: string}} = {};
		for (const p of prod)
			for (const arr of [p.groupData.uniqueTags, p.infoData.sku])
				for (const tagSku of arr || [])
					skusReturn[tagSku] = {groupId: p._trackableGroupId, varId: p._id.toString()};


		return { categoriesHm: catsHmIds, skus: skusReturn, };
	}
	
	/**
	 * Checks if the local item is deleted
	 * @param i A local basemodel
	 */
	public isLocalItemDeleted(i: IBaseModel) {
		// the group object could not have _groupDeleted so we check one of the child to be extra safe
		// we can't set (i: ProductGroup) so we have to do this
		return Boolean((i as ProductGroup)._groupDeleted || (i as ProductGroup).models[0]._groupDeleted);
	}

	/**
	 * compares local and remote products names to see which one is equal and creates a mapping object to use to sync the items based on names
	 * @param slug the client to sync
	 * @param extConn The connection to sync
	 */
	public async createIdAssociatesByNames(req: Request, slug: string, extConn: ExternalConnection): Promise<void | NameMappingReturn> {

		// get all product ids
		// TODO ignore the deleted ones
		const [e, ids] = await to(this.getAllRemoteIds(req, extConn));
		
		if (e && ExternalSyncUtils.isAxiosEndUnreachable(e)) {
			await SyncConfigService.disableExternalConnection(req, slug, extConn._id);
			throw new Error400('Endpoint unreachable. Either misconfigured or not online');
		}

		if (!ids || !ids.length)
			return;

		// get all the products
		// TODO add projections ? or take them from req.qs ? idk
		// TODO do only 10 at a time to not overload
		const allRemote = await this.fetchRemoteDataForAssociations(req, extConn, ids);
		if (allRemote.size)
			return;

		// remove the already synced items as to not remap the same name from two differente products to the same remote id
		const alreadySynced = await new ProductGroupTypeController().findForUser(
			req,
			this.createQueryForMetadata(extConn, {'_additional._wooProductGroupId': {$in: ids}}),
			{skipAmountsCalculation: true, base: {projection: {_id: 0, 'models._metaData._externalIds': 1}}},
		);
		for (const l of alreadySynced) {
			const id = this.getRemoteIdForNameMap(extConn, l);
			if (id)
				allRemote.delete(id)
		}

		// get all the items that are non deleted and that are with sync enabled
		const allLocal = await new ProductGroupTypeController().findForUser(
			req, 
			{'externalSync.disabled.id': {$ne: extConn._id}},
			{skipAmountsCalculation: true, base: {projection: {
				_trackableGroupId: 1,
				groupData: 1,
				'models._metaData._externalIds': 1,
			}}}
		);
		
		// create hash with name mappings
		const localNameId: {[name: string]: string} = {};
		for (const l of allLocal) {
			const id = this.getRemoteIdForNameMap(extConn, l);
			if (id && allRemote.has(id))
				continue;

			// if no remote id is present we add to the hm
			localNameId[this.createProductNameForMapping(l.groupData.name)] = l._trackableGroupId;
		}

		// all local items are synced
		if (!Object.keys(localNameId).length)
			return;

		// we use hashmaps as to map only 1 item to 1 remote
		// this way we don't have a situation where 2 same prod names map to a 1 product
		const localRemote: NameMappingReturn['localRemote'] = {}
		const remoteLocal: NameMappingReturn['remoteLocal'] = {};

		// create the maps
		for (const [id, val] of allRemote.entries()) {
			const p = val;
			const h = this.createProductNameForMapping(p.name || '');
			const localIdByName = localNameId[h];
			if (localIdByName) {
				remoteLocal[id] = localIdByName;
				// here we always have the top most product group
				// aka we have the simple or the parent in a variant product
				// thus we can safely use the product.id
				localRemote[localIdByName] = p.id;
			}
		}

		// no items to map
		if (!Object.keys(localRemote).length)
			return;


		const filteredRemote: {[id: string]: Partial<A>} = {};
		const filteredLocal: {[id: string]: ProductGroup} = {};

		for (const [id, val] of allRemote.entries()) 
			if (remoteLocal[id])
				filteredRemote[id] = val as A;
		for (const pg of allLocal)
			if (localRemote[pg._trackableGroupId])
				filteredLocal[pg._trackableGroupId] = pg;

		// return the mapping data
		return {
			localProducts: filteredLocal,
			remoteProducts: filteredRemote,
			localRemote,
			remoteLocal,
		};
	}

	private getRemoteIdForNameMap(extConn: ExternalConnection, pg: ProductGroup): string | number | void {
		const model = pg.models.find(m => this.getRemoteExtObj(m, extConn));
		if (model) {
			const meta = this.getRemoteExtObj(model, extConn) as SyncableModel['_metaData']['_externalIds'][0];
			return meta._additional?._wooProductGroupId || meta._id;
		}
	}

	/**
	 * Removes special chars, spaces etc from the name, thus allowing to compare two names effectively
	 * @param name the groupData.name equivalent of the product to create the mappingName
	 */
	private createProductNameForMapping(name: string): string {
		// remove only spaces and set to lowercase
		const baseFix = name.toLowerCase().replace(/ /g, '');
		// try to remove all the non ascii chars, and if it is empty, we return the baseFix
		return baseFix.replace(/[^a-z0-9]/g, '') || baseFix;
	}

	public fullGroupProductQueryWithAmounts(req: Request, filter: Filter<ProductGroup>, opts: FindDbOptions & AdditionalFindOptions = {skipAmountsCalculation: false}): Promise<ProductGroupWithAmount[]> {
		return this.fullGroupProductQuery(req, filter, {skipAmountsCalculation: false, ...opts}) as Promise<ProductGroupWithAmount[]>;
	}

	/**
	 * This function allows you to query product groups while adding automatically the "returnFullGroupOnMatch" and "skipFilterControl" opts to true 
	 * as all internal ops have to be done with the full pg and 
	 */
	public fullGroupProductQuery(req: Request, filter: Filter<ProductGroup>, opts: FindDbOptions & AdditionalFindOptions = {skipAmountsCalculation: true}): Promise<ProductGroupNoAmounts[]> {
		return new ProductGroupTypeController().findForUser(req, filter, {returnFullGroupOnMatch: true, skipFilterControl: true, keepAllVariations: true, skipAmountsCalculation: true, ...opts});
	}

}

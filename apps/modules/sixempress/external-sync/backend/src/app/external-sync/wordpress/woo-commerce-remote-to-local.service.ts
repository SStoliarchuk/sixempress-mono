import { CustomExpressApp, Error503 } from "@sixempress/main-be-lib";
import { ExternalConnection, ModelClass } from "@sixempress/be-multi-purpose";
import { RemoteRefBuild, RemoteSyncMeta, RemoteToLocalSteps, SyncRemoteToLocalService } from "../abstract/remote-to-local.service";
import { SyncProductsService } from "../abstract/sync/sync-products.service";
import { WooBuiltAggregatedInfo, WooCrudUpdate, ModelIdsHm, SyncDataItems, ItemsBuildOpts } from "../abstract/woo.dtd";
import { WooTypes } from "../abstract/woo.enum";
import { ExternalSyncUtils } from "../external-sync.utils";
import e, { Response, Request } from 'express';
import { WooSyncCustomersService } from "./sync/woo-sync-customers.service";
import { WooSyncProductCategories } from "./sync/woo-sync-product-categories.service";
import { WooSyncOrdersService } from "./sync/woo-sync-orders.service";
import { WooSyncProductMovementsService } from "./sync/woo-sync-product-movements.service";
import { WPLocalPaths, WPRemotePaths } from "./woo.enum";
import { WooFetchedAggregatedInfo, WooGetAggregateParams } from "./woo.dtd";
import { WooSyncProductsService } from "./sync/woo-sync-products.service";
import { SyncProductMovementsService } from "../abstract/sync/sync-product-movements.service";

class _WooCommerceRemoteToLocalService extends SyncRemoteToLocalService {

	// We let woocommerce handle this, as if an item depends on some other items in draft state we would need to sync that item ?
	// for example, a prod mov that references 10171, but that item is in draft, it would mean that the system would error
	// thus we let the wp plugin handle which item to send :/
	// /**
	//  * If the item to sync has a status, and that status is one of these, then that item will be discarded
	//  */
	// private static INVALID_POST_STATUS_FOR_SYNC = [
	// 	// standard wp status
	// 	'future', 'draft', 'pending', 'private', 
	// 	// woocomemrce seems
	// 	'auto-draft', 'importing',
	// ];

	protected productMovSync: SyncProductMovementsService<any> = WooSyncProductMovementsService;
	
	protected productSync: SyncProductsService<any> = WooSyncProductsService;

	protected orderedSteps: RemoteToLocalSteps<any>[] = [
		{
			modelClass: WooTypes.customer,
			process: (...args) => WooSyncCustomersService.receiveFromRemote(...args),
			onUnsuccessful: (...args) => WooSyncCustomersService.onUnsuccessfulSync(...args),
		},
		{
			modelClass: WooTypes.prod_category,
			process: (...args) => WooSyncProductCategories.receiveFromRemote(...args),
			onUnsuccessful: (...args) => WooSyncProductCategories.onUnsuccessfulSync(...args),
		},
		{
			modelClass: WooTypes.product,
			process: (...args) => WooSyncProductsService.receiveFromRemote(...args),
			onUnsuccessful: (...args) => WooSyncProductsService.onUnsuccessfulSync(...args),
		},
		{
			modelClass: WooTypes.product_amount,
			processAll: true,
			process: (...args) => WooSyncProductMovementsService.receiveFromRemote(...args),
			onUnsuccessful: (...args) => WooSyncProductMovementsService.onUnsuccessfulSync(...args),
		},
		{
			modelClass: WooTypes.order,
			process: (...args) => WooSyncOrdersService.receiveFromRemote(...args),
			onUnsuccessful: (...args) => WooSyncOrdersService.onUnsuccessfulSync(...args),
		},
	];

	/**
	 * Generates the path to receive updates from the site
	 */
	public start(app: CustomExpressApp) {
		app.post('/' + WPLocalPaths.crud_updates, this.processExpressRequest.bind(this));
	}

	/**
	 * Adds the request notification to queue
	 */
	private async processExpressRequest(req: Request, res: Response) {

		// respond immediately as there is no difference
		res.sendStatus(200);
		
		const body: WooCrudUpdate = req.body;
		// basic check
		if (
			typeof body.id         !== 'number' ||
			typeof body.item_type  !== 'string' ||
			!Object.values(WooTypes).includes(body.item_type)
		) {
			return;
		}
		
		return this.processCrudRequest(req, body);
	}
	
	/**
	 * Gets all the ids from the remote connection and syncs them
	 */
	public async syncToLocal(req: Request, slug: string, extConn: ExternalConnection, opts?: ItemsBuildOpts) {
		// get data
		const project: Partial<WooGetAggregateParams> = {};
		if (opts.selectMapItems && Object.keys(opts.selectMapItems).length) {
			project.projection = {};
			if (opts.selectMapItems.customers)
				project.projection.customer = 1;
			if (opts.selectMapItems.productCategories)
				project.projection.product_cat = 1;
			if (opts.selectMapItems.products)
				project.projection.product = 1;
			if (opts.selectMapItems.orders)
				project.projection.order = 1;
		}

		const ids = await ExternalSyncUtils.requestToWoo<{[WooType: string]: number[]}>(req, extConn, 'GET', WPRemotePaths.aggregate_sync_ids, undefined, {params: project});
		
		// create data obj
		const d: ModelIdsHm = {};
		const ms = new Date().getTime();
		for (const t in ids) {
			d[t] = new Map();
			for (const i of ids[t])
				d[t].set(i, {addedMs: ms});
		}

		await this.syncCrudUpdates({[extConn.originUrl]: {req, data: d, meta: {ext: extConn, slug: slug}}}, {...opts});
	}

	protected async syncSingleClient(req: Request, oUrl: string, cache: SyncDataItems<RemoteSyncMeta>, opts: ItemsBuildOpts = {}) {
		await super.syncSingleClient(req, oUrl, cache, opts);

		// force stock
		if (!opts.forceProductStock || !cache.data[WooTypes.product] || !!cache.data[WooTypes.product].size)
			return;

		const meta = cache.meta;
		const data = await this.fetchRemoteObjects(req, meta.ext, {[WooTypes.product]: Array.from(cache.data[WooTypes.product].keys())})

		const desired = new Map<string | number, number>;
		for (const [id, val] of data[WooTypes.product].entries())
			if (typeof val[id].stock_quantity === 'number')
				desired.set(id, val[id].stock_quantity);

		await WooSyncProductMovementsService.setManualProductAmount(meta.ext, req, desired);
	}

	protected async fetchRemoteObjects(req: Request, ext: ExternalConnection, formatData: {[WooType: string]: (string | number)[]}): Promise<WooBuiltAggregatedInfo> {
		const data = await ExternalSyncUtils.requestToWoo<WooFetchedAggregatedInfo>(req, ext, 'POST', WPRemotePaths.aggregate_sync_ids, formatData);
		const r: WooBuiltAggregatedInfo = {};
		for (const m in data) {
			r[m] = new Map()
			for (const id in data[m])
				r[m].set(parseInt(id), data[m][id])
		}

		return r;
	}

	/**
	 * Checks if the references in the data to sync is present already in the local DB, otherwise it syncs them before continuing
	 * thus ensuring the references are always present and no malformed item is created
	 * @param ext the external connection to use to check for present references
	 * @param slug the slug of the client
	 * @param objects the fetched info about the syncData
	 * @returns empty if nothing to sync, otherwise the ids to sync
	 */
	protected async getMissingRef(req: Request, opts: ItemsBuildOpts, {meta, objects}: RemoteRefBuild): Promise<void | ModelIdsHm> {
		const ext = meta.ext;
		const slug = meta.slug;

		const toSync: {[WooTypes: string]: Set<string | number>} = {};
		for (const s of this.orderedSteps)
			toSync[s.modelClass] = new Set();

		//
		// get the items to sync
		//
		for (const type in objects) {
			switch (type)  {
				/**
				 * Customer
				 */
				case WooTypes.customer:
					// no ref data
					break;

				/**
				 * Product Categories
				 */
				case WooTypes.prod_category:
					for (const [id, val] of objects[type].entries())
						if (val.parent) 
							toSync[WooTypes.prod_category].add(val.parent)

					break;

				/**
				 * Products
				 */
				case WooTypes.product:
					
					for (const [id, val] of objects[type].entries()) {
						const o = val;

						if (o.categories)
							for (const c of o.categories)
								toSync[WooTypes.prod_category].add(c.id);

						if (o.variations)
							for (const v of o.variations)
								if (v.categories)
									for (const c of v.categories)
										toSync[WooTypes.prod_category].add(c.id);
					}

					break;

				/**
				 * Orders
				 */
				case WooTypes.order:
										
					for (const [id, val] of objects[type].entries()) {
						const o = val;
						
						if (o.customer_id)
							toSync[WooTypes.customer].add(o.customer_id);

						for (const l of o.line_items)
							if (l.variation_id || l.product_id)
								toSync[WooTypes.product].add(l.variation_id || l.product_id);
					}
					break;

				/**
				 * Product stock 
				 */
				case WooTypes.product_amount:
					for (const [id, val] of objects[type].entries())
						toSync[WooTypes.product].add(id);
					break;

				/**
				 * Throw if a not supported type is passed
				 */
				default:
					throw new Error503('Item of type: "' + type + '" cannot be checked for referenced fields');
			}
		}

		// remove data that is currently being already synced
		// as we follow an order in sync, we can do this safely
		for (const t in toSync) {
			if (objects[t])
				for (const [id, val] of toSync[t].entries())
					if (objects[t][id])
						toSync[t].delete(id);

			if (!toSync[t].size)
				delete toSync[t];
		}

		this.remapForLocalrefCheck(toSync);
		const refs = await this.checkLocalReferences(req, ext, toSync);
		if (!refs)
			return;

		this.remapForLocalrefCheck(refs, true);
		return refs;
	}

	private remapForLocalrefCheck(toSync: {[mc: string]: any}, reverse?: boolean) {
		const map = new Map([
			[WooTypes.customer,        ModelClass.Customer],
			[WooTypes.prod_category,   ModelClass.InventoryCategory],
			[WooTypes.product,         ModelClass.Product],
			[WooTypes.order,           ModelClass.CustomerOrder],
			[WooTypes.product_amount,  ModelClass.ProductMovement],
		]);
		
		if (reverse) {
			for (const [to, from] of map.entries()) {
				if (toSync[from])
					toSync[to] = toSync[from]
				delete toSync[from]
			}
		}
		else {
			for (const [from, to] of map.entries()) {
				if (toSync[from])
					toSync[to] = toSync[from]
				delete toSync[from]
			}
		}

	}


}

export const WooCommerceRemoteToLocalService = new _WooCommerceRemoteToLocalService();
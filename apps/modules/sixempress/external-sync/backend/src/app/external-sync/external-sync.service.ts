import { Request } from 'express';
import { BePaths } from "../enums/bepaths.enum";
import { CrudType, CustomExpressApp, Error400, Error404, LibModelClass, RequestHelperService, VerifiableObject } from "@sixempress/main-be-lib";
import { ExternalSyncUtils } from "./external-sync.utils";
import { WooCommerceLocalToRemoteService } from "./wordpress/woo-commerce-local-to-remote.service";
import { WooCommerceRemoteToLocalService } from "./wordpress/woo-commerce-remote-to-local.service";
import { ErrorCodes } from '../enums/error.codes.enum';
import { ExternalConnectionType } from '../external-sync/external-conn-paths/sync-config.dtd';
import { ExternalConnection, ModelClass, Product, SyncConfigService } from '@sixempress/be-multi-purpose';
import { ItemsBuildOpts, VerifiableMapping } from './abstract/woo.dtd';
import { MRequestAugmented } from '@stlse/backend-connector/contracts/src';
import { WooSyncProductsService } from './wordpress/sync/woo-sync-products.service';
import { WooSyncProductMovementsService } from './wordpress/sync/woo-sync-product-movements.service';
import { log } from './log';
import { SyncLocalToRemoteService } from './abstract/local-to-remote.service';
import { SyncRemoteToLocalService } from './abstract/remote-to-local.service';
import { SyncProductsService } from './abstract/sync/sync-products.service';
import { SyncProductMovementsService } from './abstract/sync/sync-product-movements.service';
import { SingleCallMemo } from '@stlse/backend-connector/utilities-agnostic/src';
import to from 'await-to-js';
import { SyncStat, SyncStatService } from './abstract/sync-stat.service';

type SyncStatuses = SyncStat & (
	{ type: 'local' } | 
	{ type: 'remote', name: string }
)

type ByType = {
	rtlWooInstance: SyncRemoteToLocalService,
	ltrWooInstance: SyncLocalToRemoteService,
	product: SyncProductsService<any>, 
	productMov: SyncProductMovementsService<any>
}


type SyncPayload = {
	productMaps?: {
		localRemote: { [localId: string]: (number | string); };
		remoteLocal: { [remoteId: string]: (number | string); };
	},
	syncStockFrom?: 'remote' | 'local',
	syncToLocal?: {
		customers?: boolean,
		productCategories?: boolean,
		products?: boolean,
		orders?: boolean
	},
	syncToRemote?: {
		customers?: boolean,
		productCategories?: boolean,
		products?: boolean,
		orders?: boolean
	},
}

/**
 * this class is out here to avoid circular dependency
 */
class _ExternalSyncService {

	private checkingStock = new SingleCallMemo<string, undefined | {
		local: number;
		remote: number;
		product: Product;
	}[]>();

	// private intervalCheckDiscrepanicesMS = 60 * 1000; // 1 hour
	private intervalCheckDiscrepanicesMS = 30 * 60 * 1000; // 30 min

	/**
	 * ExtID => {last: Date().getTime(), discrepancies: are there discrepancies}
	 */
	private recurringStockCheckCache = new Map<string, {last: number, discrepancies: boolean}>();

	/**
	 * Initializes all the external possible services
	 */
	public start(app: CustomExpressApp) {

		app.use((req, res, next) => {
			RequestHelperService.parseQueryStrings(req);
			next();
		});

		app.post(
			'/' + BePaths.multipexternalconnections + ':id/sync',
			RequestHelperService.safeHandler((req, res) => this.syncExternalConnId(req, req.params.id))
		);
		app.get(
			'/' + BePaths.multipexternalconnections + ':id/stock',
			RequestHelperService.safeHandler((req, res) => this.getStockDiscrepancies(req, req.params.id))
		);
		app.get(
			'/' + BePaths.multipexternalconnections + ':id/products/mapping',
			RequestHelperService.safeHandler((req, res) => this.checkProductNamesAssociations(req, req.params.id))
		);
		app.get(
			'/' + BePaths.multipexternalconnections + 'sync/status',
			RequestHelperService.safeHandler((req, res) => this.returnSyncStatus(req))
		);


		for (const logic of this.getAllTypes()) {
			logic.rtlWooInstance.start(app);
			logic.ltrWooInstance.start(app);
		}
		
	}

	private async returnSyncStatus(req: Request): Promise<{active: boolean, statuses: SyncStatuses[]}> {
		const slug = RequestHelperService.getSlugByRequest(req);
		const exts = await ExternalSyncUtils.getExternalConnections(req, false);
		const lock = await SyncStatService.hasSyncLock(req, slug);
		const stats: SyncStatuses[] = [];

		for (const ext of exts) {
			const logic = this.getByType(ext.type, true);
			if (!logic)
				continue;
			
			const remote = await SyncStatService.getStatus(req, ext.originUrl);
			if (remote.processed || remote.total)
				stats.push({...remote, type: 'remote', name: ext.originUrl});

			const local = await SyncStatService.getStatus(req, slug);
			if (local.processed || local.total)
				stats.push({...local, type: 'local'});
		}
			
		const active = Boolean(stats.length || lock);
		return {active: active, statuses: stats};
	}

	/**
	 * Checks if there are products with equal names but not yet synced
	 */
	private async checkProductNamesAssociations(req: Request, extId: string) {
		const slug = RequestHelperService.getSlugByRequest(req);
		const ext = await ExternalSyncUtils.getExternalConnectionInfo(req, false, extId);
		if (!ext) 
			throw new Error404('ExternalConnection not found or not enabled: ' + extId);
			
		// ensure connection is working
		const err = await ExternalSyncUtils.pingWoo(req, slug, ext);
		if (err)
			return ExternalSyncUtils.createExternalRequestError(err);

		const logic = this.getByType(ext.type)
		return logic.product.createIdAssociatesByNames(req, slug, ext);
	}

	public async handleHookCrudEvent(mreq: MRequestAugmented, opArgs: any[], type: CrudType, modelClass: string, ids: string[]) {
		if (modelClass === LibModelClass.Configuration) {
			log('EXT_CONFIG_CACHE', 'Configuration change, clearing external cache', mreq.instanceId);
      return void delete ExternalSyncUtils.multipExternalConfigsCache[mreq.instanceId];
		}

		for (const logic of this.getAllTypes())
			await logic.ltrWooInstance.handleHookCrudEvent(mreq, opArgs, type, modelClass, ids)
	}

	/**
	 * Syncs the items woo
	 */
	private async syncExternalConnId(req: Request, extId: string) {
		const slug = RequestHelperService.getSlugByRequest(req);
		const lock = await SyncStatService.setSyncLock(req, slug);
		
		// ensure we don't sync twice
		if (!lock)
			throw new Error400({
				code: ErrorCodes.multipCurrentlySyncingAlready, 
				message: 'The system is already syncing with an endpoint', 
				data: {},
			});

		// get the target extConn
		const ext = await ExternalSyncUtils.getExternalConnectionInfo(req, false, extId);
		if (!ext) 
			throw new Error404('ExternalConnection not found or not enabled: ' + extId);

		const logic = this.getByType(ext.type);

		// ensure connection is working
		const err = await ExternalSyncUtils.pingWoo(req, slug, ext);
		if (err)
			return ExternalSyncUtils.createExternalRequestError(err);

		// sync opts for the sync
		const body: SyncPayload = req.body;
		const baseOpts: ItemsBuildOpts = {};
		
		// force the product mappings
		if (req.body.productMaps) {
			baseOpts.forceProductMapping = req.body.productMaps;
			const errs = VerifiableObject.verify(baseOpts.forceProductMapping, VerifiableMapping);
			if (errs) throw new Error400(errs);
		}

		// actions to execute for the sync
		const actions = {
			toLocal: body.syncToLocal,
			toRemote: body.syncToRemote,
			stockTo: (body.syncStockFrom === 'local' ? 'remote' :
						 		body.syncStockFrom === 'remote' ? 'local' 
								: undefined) as 'remote' | 'local',
		}

		const start = async () => {
			try {

				// TODO optimize by storing the processed ids, and ignoring them in the next call ?
	
				// we sync the remote first as this way less CRUD operations are done in local 
				// in case the remote has some new items etc
				if (actions.toLocal)
					await logic.rtlWooInstance.syncToLocal(req, slug, ext, {...baseOpts, selectMapItems: actions.toLocal});
				
				if (actions.toRemote)
					await logic.ltrWooInstance.syncToRemote(req, slug, ext, {...baseOpts, selectMapItems: actions.toRemote});

				if (actions.stockTo)
					await logic.productMov.syncStock(req, slug, ext, actions.stockTo);
			}
			// ensure we delete the cache
			finally {
				await SyncStatService.deleteSyncLock(req, slug);
			}
		};

		// let it execute asynchronously so we return immediately
		// in case of error we just log it 
		start().then(() => {}).catch(e => {
			log.error('Error from:', slug, 'query:', req.query, 'error:', e);
		});
	}

	public async anyDiscrepanciesForAllConnection(req: Request): Promise<'loading' | false | true> {
		const conns = await ExternalSyncUtils.getExternalConnections(req, false);
		to(this.checkAllDiscrepancies(req, conns)); // do an async update so that next time it can be checked

		const someNotPresent = conns.some(c => !this.recurringStockCheckCache.has(c._id));
		if (someNotPresent)
			return 'loading';

		const someDiscrepancies = conns.some(c => this.recurringStockCheckCache.get(c._id)!.discrepancies)
		if (someDiscrepancies)
			return true;

		return false;
	}


	/**
	 * Will update only the items that are no longer valid for cache
	 */
	public async checkAllDiscrepancies(req: Request, conns: ExternalConnection[]) {
		for (const c of conns) {
			const cache = this.recurringStockCheckCache.get(c._id);
			if (cache) {
				const diff = new Date().getTime() - cache.last;
				// outdated so refresh
				if (diff > this.intervalCheckDiscrepanicesMS)
					this.recurringStockCheckCache.delete(c._id);
				// discrepancies
				else if (cache.discrepancies)
					return true;
				// no discrepancies so go to the next
				else
					continue;
			}

			const dis = await this.getStockDiscrepancies(req, c._id!);
			if (dis)
				return false;
		}

		return false;
	}

	/**
	 * checks the stock difference between remote and local and returns the diff
	 * @param req Request object
	 * @param extId id of the external connection
	 */
	private async getStockDiscrepancies(req: Request, extId: string) {
		const slug = RequestHelperService.getSlugByRequest(req);

		const [err, result] = await to(this.checkingStock.run(extId, async () => {
			// get the target extConn
			const ext = await ExternalSyncUtils.getExternalConnectionInfo(req, false, extId);
			if (!ext) 
				throw new Error404('ExternalConnection not found or not enabled: ' + extId);

			// ensure connection is working
			const err = await ExternalSyncUtils.pingWoo(req, slug, ext);
			if (err)
				return void ExternalSyncUtils.createExternalRequestError(err);

			const logic = this.getByType(ext.type);
			const d = await logic.productMov.findStockDiscrepancies(req, slug, ext);
			if (!d) 
				return;

			const obj: Array<{local: number, remote: number, product: Product}> = [];
			for (const df of d.diff)
				obj.push({local: df.localStock, remote: df.remoteStock, product: d.prod[df.prodId]});

			return obj;
		}));

		this.checkingStock.delete(extId);
		this.recurringStockCheckCache.set(extId, {last: new Date().getTime(), discrepancies: Boolean(err || result?.length)});
		if (err)
			throw err;

		return result;
	}

	private getByType(type: ExternalConnectionType, doNotThrow?: boolean): ByType {
		switch(type) {
			case ExternalConnectionType.wordpress:
				return {
					rtlWooInstance: WooCommerceRemoteToLocalService,
					ltrWooInstance: WooCommerceLocalToRemoteService,				
					product: WooSyncProductsService, 
					productMov: WooSyncProductMovementsService
				}
			default: 
				if (doNotThrow !== true)
					throw new Error("Operation not supported for external connection type: " + type);
		}
	}

	private getAllTypes(): ByType[] {
		const t: ByType[] = [];

		for (const v of Object.values(ExternalConnectionType)) {
			const i = this.getByType(v as ExternalConnectionType, true);
			if (i)
				t.push(i)
		}

		return t;
	}

}

export const ExternalSyncService = new _ExternalSyncService();
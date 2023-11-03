import { ObjectUtils, FetchableField, CrudType, RequestHelperService } from '@sixempress/main-be-lib';
import { ProductMovement, ProductMovementType, ProductGroup, ModelClass, ProductMovementController, Product, CustomerOrderController, ProductWithAmounts, ProductGroupWithAmount, ProductGroupNoAmounts, ProductNoAmounts } from '@sixempress/be-multi-purpose';
import { Request } from 'express';
import { ExternalConnection } from '../../external-conn-paths/sync-config.dtd';
import { AnyBulkWriteOperation, Filter, ObjectId } from 'mongodb';
import { DataSyncService, DataSyncToRemote } from './data-sync.service';
import { AddedIdInfo, ItemsBuildOpts, WooProductSetStock } from '../woo.dtd';
import { SyncProductsService } from './sync-products.service';
import { ProductGroupTypeController } from './ProductType.controller';
import to from 'await-to-js';
import { SyncProductMovementsUtilities } from './sync-product-movements.utils';
import { log } from '../../log';

type BuiltData = {
	local: ProductMovement[], 
	remote: Array<{amount: number, id: string | number}>, 
	ec: ExternalConnection
};

type AmountData = {
	prod: {[id: string]: Product},
}

type AmountDataDiff = {
	remoteId: string | number, 
	prodId: string, 
	localStock: number, 
	remoteStock: number,
}

export abstract class SyncProductMovementsService<A extends WooProductSetStock> extends DataSyncService<A, ProductMovement> {

	protected abstract productSync: SyncProductsService<any>;

	protected abstract sendPayload(req: Request, ec: ExternalConnection, items: Array<{amount: number, id: string | number, op?: 'set'}>): Promise<void>;

	protected abstract getRemoteStockInformation(req: Request, ec: ExternalConnection, remoteIds: (string | number)[]): Promise<Array<WooProductSetStock>>;

	public async receiveFromRemote(ep: ExternalConnection, req: Request, ids: (string | number)[], referenceItems: Map<number | string, WooProductSetStock>, opts: ItemsBuildOpts = {}) {
		// if we have two windows of woocommerce product edit open
		// if we change from window 1 the stock to X and we save
		// then if we change from window 2 the stock to Y and we save
		// then in the Y windows there is gonna pop up an error
		// saying that the stock has changed, thus not modifyin the stock to Y but keeping it X
		//
		// the same thing happens when we update by API
		// so we always know that we the user does a manual update of the stock on remote (from woocommerce window)
		// that the stock has not changed
		const items = new Map(Array.from(referenceItems.entries()).map((v => [v[1].id, v[1].value])));
		await this.setManualProductAmount(ep, req, items);
	}

	/**
	 * Updates retroactively all invalid hashes, it assumes that the system 
	 * is currently correctly synced with no discrepancies
	 */
	public async updateInvalidHashes(req: Request, ep: ExternalConnection) {
		const chunk = 100;
		const collection = new ProductMovementController().getCollToUse<ProductMovement>(req);
		
		// extId is deleted, but the model is not. Or vieversa
		const filter: Filter<ProductMovement> = {$or: [
			{_metaData: {$exists: false}},
			{...this.createQueryForMetadata(ep, {_id: {$regex: /1$/, $options: 'i'}}), _deleted: {$exists: false}},
			{...this.createQueryForMetadata(ep, {_id: {$regex: /0$/, $options: 'i'}}), _deleted: {$exists: true}},
		]};

		// we count before processing them so that we have a "safe" exit from the while loop
		const count = await collection.countDocuments(filter);
		let processed = 0;

		// TODO
		// add a check to see which product movement is in default sync progress stat track which would help with:
		// 1. not exceeding the processed > count as we would ignore the items that are already syncing
		// 2. if we set the metadata of the pmov before it reaches the pmov sync controller, then the pmov sync controller
		//    may think that the item was already synced and not send the data.
		//    which could be intended as we call this function after we fix discrepancies ?
		while (true) { 
			const outdated = await collection.find(filter, {limit: chunk}).toArray();
			processed += outdated.length;
			
			if (!outdated.length || processed > count)
				break;
				
			const bulkOps: AnyBulkWriteOperation<ProductMovement>[] = [];
			for (const m of outdated)
				bulkOps.push(...this.createLocalMetaDataBulkOps(ep, m, {
					_id: this.createHash(m), _externalConnectionId: ep._id
				}));

			await collection.bulkWrite(bulkOps);
		}
	}

	/**
	 * Builds the data to send
	 */
	public async translateAndSendToRemote(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, movs: ProductMovement[], opts?): Promise<DataSyncToRemote<ProductMovement>> {
		
		const prodIds: {[id: string]: ObjectId} = {};
		const orderIds: {[id: string]: ObjectId} = {};
		for (const m of movs) {
			prodIds[m.targetProductInfo.product.id] = new ObjectId(m.targetProductInfo.product.id);
			if (m._generatedFrom?.modelClass === ModelClass.CustomerOrder)
				orderIds[m._generatedFrom.id] = new ObjectId(m._generatedFrom.id);
		}

		const orders = await new CustomerOrderController().findForUser(req, {_id: {$in: Object.values(orderIds)}}, {skipFilterControl: true});
		const orderHm = ObjectUtils.arrayToHashmap(orders, '_id');
		const pgs = await this.productSync.fullGroupProductQuery(req, {_id: {$in: Object.values(prodIds)}}, {skipAmountsCalculation: true, skipIdToTrackableId: true})
		const pgHm: {[pid: string]: ProductGroupNoAmounts} = {};
		const pHm: {[id: string]: ProductNoAmounts} = {};
		
		for (const pg of pgs) {
			pgHm[pg._trackableGroupId] = pg;
			for (const m of pg.models)
				pHm[m._id.toString()] = m;
		}

		const bd: BuiltData[] = [];

		for (const e of endpoints) {

			// filter movements based on the products to use
			const sendHm: {[id: string]: {amount: number, id: number}} = {};
			for (const m of movs) {

				// if the order is coming from the current endpoint
				// then we skip this movement
				// this is becuase the remote plugin manages the stock itself
				if (m._generatedFrom?.modelClass === ModelClass.CustomerOrder)
					if (this.getRemoteExtObj(orderHm[m._generatedFrom.id], e))
						continue;

				// we dont add to the available stock the ones that are incoming (internal order)
				if (m.amount > 0 && m.movementType === ProductMovementType.reserveOrIncoming)
					continue;

				// omit origin url
				const omittedUrls = data.get(m._id.toString())?.omitOriginUrls;
				if (omittedUrls && omittedUrls.find(o => e.originUrl.includes(o)))
					continue;

				// ensure the movement location is the correct one
				if (e.locationId !== m.documentLocation && !e.additionalStockLocation?.useAll && !e.additionalStockLocation?.orderedIds?.includes(m.documentLocation))
					continue;

				// object already synced
				if (this.isCurrentHashValid(m, e, data.get(m._id.toString())?.emitType))
					continue;

				// get the remote id target of
				const movTarget = pHm[m.targetProductInfo.product.id];
				// target could be absent if the produt type is not Product but ie replacement
				if (!movTarget)
					continue;

				let p = this.findActiveSaleableByModel(pgHm[movTarget._trackableGroupId], e, movTarget);

				// in case the transfer was automatic, we force the product target to be the _deleted if an active is not present
				// this can happen when we only change ie sellPrice and willMoveAmountOnSave() returns true
				if (!p && m.movementType === ProductMovementType.moveStockOnProductChange)
					p = this.findActiveWillMoveTo(pgHm[movTarget._trackableGroupId], e, movTarget) || movTarget;

				// remote id not present or disabled
				if (!p || p.externalSync?.disabled?.find(es => es.id === e._id))
					continue;

				// get the remote id 
				const id = this.getRemoteId(p, e) as number;
				if (!id)
					continue;

				// invert the amount if deleting that movement
				// we sub in memory as to not send useless movements lmao
				if (!sendHm[id])
					sendHm[id] = {amount: 0, id: id};
				sendHm[id].amount += m._deleted ? -m.amount : m.amount;
			}

			// always push to add metadata to all endpoints
			bd.push({ec: e, local: movs, remote: Object.values(sendHm).filter(v => v.amount !== 0)});
		}

		const res: Array<{errors: any[], ops: AnyBulkWriteOperation<ProductMovement>[]}> = [];
		for (const bData of bd) {
			const [e, d] = await to(this.sendProductMovementToRemote(req, slug, bData));
			res.push(e ? {errors: [e], ops: []} : {errors: [], ops: d});
		}

		return res;
	}

	/**
	 * sends the movs to the mama
	 * @param ep External connection
	 * @param req request obj for queries
	 * @param movs the movements to send
	 */
	protected async sendProductMovementToRemote(req: Request, slug: string, bData: BuiltData): Promise<AnyBulkWriteOperation<ProductMovement>[]> {
		if (bData.remote.length)
			await this.sendPayload(req, bData.ec, bData.remote);

		// we update all local objects regardless if they were sent or no
		// as to track even the omitted Urls in case the movs change
		return this.createBulkOps(bData.local, bData.ec);
	}

	/**
	 * Creates the bulkOperations to execute to track the synced product movements
	 */
	protected createBulkOps(movs: ProductMovement[], ext: ExternalConnection): AnyBulkWriteOperation<ProductMovement>[] {
		// now that we have a map we compare the items
		const bulkOps: AnyBulkWriteOperation<ProductMovement>[] = [];
		for (const m of movs) {
			// we use a id "1" to not retrigger the sync if the item is already synced
			const op = this.createLocalMetaDataBulkOps(ext, m, {
				_id: this.createHash(m), _externalConnectionId: ext._id
			});

			if (op)
				bulkOps.push(...op);
		}

		return bulkOps;
	}

	/**
	 * Checks if the movement was synced to an external connection and if so checks if the hash is the same to the current status
	 * @param p The product movement to check
	 * @param ep The external connection which to compare
	 */
	private isCurrentHashValid(p: ProductMovement, ep: ExternalConnection, crudType: CrudType) {
		const hash = this.getRemoteId(p, ep);

		// if the hash is not present we can have to cases:
		// A. the "crud" operation for the product movement is "create" so we need to upload the stock online,
		// 		if it's not create, then the item was already uploaded but for some reason we could not sync it, 
		// 		so syncing it again would create discrepancies
		// B. the model has the _deleted field, which means that the movement is "ignored", thus we do not 
		// 		need to upload the amount online as it's not calculated for local stock
		if (!hash && (crudType !== 'create' || p._deleted))
			return true;

		return this.createHash(p) === hash;
	}

	/**
	 * Creates a hash that is based upon the "main" content of a product movement for remote
	 * @param p The product movement to which create hash
	 */
	private createHash(p: ProductMovement) {
		// TODO create a better hash ?
		// we dont use movementType as it's useless for remote neither the date
		// it only creates chaos
		//
		// we only need to check if the actual amount or deleted status has changed
		// and obiously the product id (but that will never change probably)
		//
		// this is because we sync online only the difference withouth anything else
		// so a change in state should be ignored
		return '' + p.targetProductInfo.product.id + p.amount + (p._deleted ? 1 : 0);
		// '5eff5cd497adeb1a5ec16fd0' + '-2' + '1';
		// '5eff5cd497adeb1a5ec16fd0' + '-21' + '0';
	}


	/**
	 * sets the current amount of the product to the desiredAmount given
	 * @param ep external connection
	 * @param req request object used for queries
	 * @param items the hashmap of remote id and the desired stock amount to set
	 */
	public async setManualProductAmount(ep: ExternalConnection, req: Request, items: Map<string | number, number>) {
		
		const pgs = (await this.productSync.fullGroupProductQueryWithAmounts(
				req, 
				{$and: [
					{'externalSync.disabled.id': {$ne: ep._id}},
					this.createQueryForMetadata(ep, { _id: { $in: Array.from(items.keys()) } }),
				]},
			));

		if (!pgs.length)
			return;

		// create movements array
		const pMovs: ProductMovement[] = [];

		for (const pg of pgs) {
			const modelHm = ObjectUtils.arrayToHashmap(pg.models, '_id');
			
			for (const [rid, val] of items.entries()) {
				const states = this.createAmountDataToSetByVariation(ep, pg, rid, val)

				for (const id in states) {
					const desiredState = states[id];
					const p = modelHm[id];

					for (const loc in desiredState) {
						const m: ProductMovement = {
							amount: desiredState[loc] - (p._amountData[loc] || 0),
							documentLocationsFilter: [loc],
							documentLocation: loc,
							movementType: ProductMovementType.manualChange,
							targetProductInfo: {
								productsGroupId: p._trackableGroupId,
								product: new FetchableField(p._id, ModelClass.Product),
							},
						}
						// add metadata for this endpoint to not trigger double sync
						m._metaData = {_externalIds: [{_externalConnectionId: ep._id, _id: this.createHash(m)}]};
						pMovs.push(m);
					}
				}
			}
		}

		// yee
		if (pMovs.length)
			await new ProductMovementController().saveToDb(req, pMovs, {allowAllLocations: true});
	}

	/**
	 * Syncs the stock amounts between systemsa nd updates invalid movs
	 * @param slug the slug to sync
	 * @param ep The connectino to sync
	 * @param syncStockTo where to put the data TO, if this is remote, then we sync FROM local TO remote
	 */
	public async syncStock(req: Request, slug: string, ep: ExternalConnection, syncStockTo: 'remote' | 'local') {
		await this.syncDiscrepanciesStock(req, slug, ep, syncStockTo);
		await this.updateInvalidHashes(req, ep);
	}

	/**
	 * Addresses the discrepncies with the system
	 */
	public async syncDiscrepanciesStock(req: Request, slug: string, ep: ExternalConnection, syncStockTo: 'remote' | 'local') {
		log('Processing sync stock', slug, ep.name, ep._id, syncStockTo);

		const defect = await this.findStockDiscrepancies(req, slug, ep);
		if (!defect || !defect.diff.length)
			return;

		const defectedRemoteId = new Set(defect.diff.map(d => d.remoteId));

		// get all NON deleted products that are synced to the connection
		const pgs = await this.productSync.fullGroupProductQueryWithAmounts(req, 
			{$and: [
				{'externalSync.disabled.id': {$ne: ep._id}},
				this.createQueryForMetadata(ep, {}),
			]}
		);

		// upload from local to remote
		if (syncStockTo === 'remote') {
			const send: {id: string | number, amount: number, op: 'set'}[] = [];
			const ids: (string | number)[] = [];
			
			for (const pg of pgs) {
				for (const m of pg.models) {
					if (m._deleted)
						continue;
					
					const id = this.productSync.getRemoteId(m, ep);
					if (!id)
						continue;

					// already present or not defected
					if (ids.includes(id) || !defectedRemoteId.has(id))
						continue;

					ids.push(id)
					send.push({id: id, amount: this.getStockByVariation(ep, pg, m), op: 'set'});
				}
			}

			await this.sendPayload(req, ep, send);
		}
		// download from remote to local
		else {
			const ids: (number | string)[] = [];

			for (const pg of pgs) {
				for (const m of pg.models) {
					if (m._deleted)
						continue;
					
					const id = this.productSync.getRemoteId(m, ep);
					if (!id)
						continue;

					if (ids.includes(id) || !defectedRemoteId.has(id))
						continue;

					ids.push(id)
				}
			}

			const remote = await this.getRemoteStockInformation(req, ep, ids);

			const hm = new Map<string | number, number>;
			for (const i of remote)
				if (typeof i.value === 'number')
					hm.set(i.id, i.value);

			await this.setManualProductAmount(ep, req, hm)
		}

		log('Processing sync stock completed', slug, ep.name, ep._id, syncStockTo);
	}

	/**
	 * compares local and remote and checks the differences
	 * @param slug slug of the client
	 * @param ep the external connection for the remote items
	 * @param prods optionally we can pass manually the products array to compare
	 */
	public async findStockDiscrepancies(req: Request, slug: string, ep: ExternalConnection): Promise<void | (AmountData & {diff: AmountDataDiff[]})> {
		// we dont skip the filter control as to not take the _groupDeleted element
		const pgs = await this.productSync.fullGroupProductQueryWithAmounts(
			req, 
			{$and: [
				{'externalSync.disabled.id': {$ne: ep._id}},
				this.createQueryForMetadata(ep, {}), 
			]},
		);
		
		if (!pgs.length)
			return;

		const remoteIds: number[] = [];
		const remoteIdProdGroup: {[id: number]: ProductGroupWithAmount} = {};
		const remoteIdProd: {[id: number]: Product} = {};
		const idLocalProdHm: {[id: number]: Product} = {};

		for (const pg of pgs) {	
			for (const m of pg.models) {
				const p = this.findActiveSaleableByModel(pg, ep, m) || m;
				// take only the active variations
				if (p._deleted)
					continue;

				const remId = this.productSync.getRemoteId(p, ep) as number;
				
				// id was already calculated from another variant or remainances
				// so we don't calculate again
				if (!remId || remoteIds.includes(remId))
					continue;

				remoteIds.push(remId);
				idLocalProdHm[p._id.toString()] = p;
				remoteIdProdGroup[remId] = pg;
				remoteIdProd[remId] = p;
			}
		}

		const remote = await this.getRemoteStockInformation(req, ep, remoteIds);

		// no product synced
		if (!remote.length)
			return;

		const diffs: AmountDataDiff[] = [];

		// cycle the products and add only if both exist
		for (const val of remote) {
			const id = val.id;
			
			const rv = val.value || 0;
			const lv = this.getStockByVariation(ep, remoteIdProdGroup[id], id);
			
			if (rv !== lv)
				diffs.push({
					remoteId: id, 
					prodId: remoteIdProd[id]._id.toString(), 
					localStock: lv,
					remoteStock: rv,
				});
		}

		return {diff: diffs, prod: idLocalProdHm};
	}

	/**
	 * As we have remaincances supported in the system, to calculate the accurate total amount we need to account for them
	 * thus we add all the items that matches the variants of the original remoteId item
	 * @param ep extenral connection
	 * @param p product group to calc
	 * @param remoteIdOrProduct the variation to calc upon
	 */
	public getStockByVariation(ep: ExternalConnection, p: ProductGroupWithAmount, remoteIdOrProduct: string | number | Product): number {
		const ref = typeof remoteIdOrProduct === 'object' 
			? remoteIdOrProduct
			: SyncProductMovementsUtilities.findRelevantSaleableModelByRemoteId(p, ep, remoteIdOrProduct)

		if (!ref)
			return 0;

		let tot = 0;
		for (const m of p.models)
			if (ProductGroupTypeController.twoSaleableVariationsAreEqual(m, ref))
				tot += SyncProductMovementsUtilities.getTotalStockForRemote(ep, m, false)

		return tot;
	}

	/**
	 * As we send online the stock containing the remainances, that means that when we update in remote, we need to update the stock in multiple products here too
	 * @param ep external connection
	 * @param pg product group to change
	 * @param remoteId the variation info to change
	 */
	private createAmountDataToSetByVariation(ep: ExternalConnection, pg: ProductGroupWithAmount, remoteId: number | string, remoteStock: number): {[localProdId: string]: Product['_amountData']} {

		const ref = SyncProductMovementsUtilities.findRelevantSaleableModelByRemoteId(pg, ep, remoteId);
		if (!ref)
			return {};

		let currAmount = this.getStockByVariation(ep, pg, ref);

		// nothing to change
		if (remoteStock === currAmount)
			return {};

		const tor: {[id: string]: Product['_amountData']} = {};


		// simply add the extra amount to the ref item
		if (remoteStock > currAmount) {
			const curr = SyncProductMovementsUtilities.getTotalStockForRemote(ep, ref);
			tor[ref._id.toString()] = SyncProductMovementsUtilities.createAmountDataToSet(ep, ref, curr + (remoteStock - currAmount));
		}
		// else sub one by one
		else {
			const subtractToZero = (obj: ProductWithAmounts) => {
				if (remoteStock === currAmount)
					return;
	
				const allInObj = SyncProductMovementsUtilities.getTotalStockForRemote(ep, obj, true);
				const diff = currAmount - remoteStock;
				
				if (diff > allInObj) {
					currAmount -= allInObj
					tor[obj._id.toString()] = SyncProductMovementsUtilities.createAmountDataToSet(ep, obj, 0, true)
				} 
				else {
					currAmount -= diff;
					tor[obj._id.toString()] = SyncProductMovementsUtilities.createAmountDataToSet(ep, obj, allInObj - diff, true);
				}
			}
	
			subtractToZero(ref);
			for (const m of pg.models)
				if (m !== ref && ProductGroupTypeController.twoSaleableVariationsAreEqual(m, ref))
					subtractToZero(m)
	
			
			// stock is negative so we add the negative stock to ref item
			if (currAmount !== remoteStock)
				tor[ref._id.toString()] = SyncProductMovementsUtilities.createAmountDataToSet(ep, ref, remoteStock);
			
		}

		// clear object
		for (const id in tor)
			if (!Object.keys(tor[id]).length)
				delete tor[id];
		
		return tor;
	}

	/**
	 * creates a the AmountData objects to subtract from a variation and the remainances
	 * @param ep External connection
	 * @param pg the product group to sub from
	 * @param remoteId the remote id of the variation
	 * @param totalToSub the total amount the sub
	 * @param subtractionCache the items for which we have created the subtraction array but have not yet saved to db
	 */
	public createAmountDataForSubtractionByVariation(
		ep: ExternalConnection, 
		pg: ProductGroupWithAmount, 
		remoteId: number | string, 
		totalToSub: number, 
		subtractionCache: {[id: string]: ProductWithAmounts['_amountData']} = {},
		setAmountData?: {[id: string]: ProductWithAmounts['_amountData']},
	): {[id: string]: ProductWithAmounts['_amountData']} {

		const ref = SyncProductMovementsUtilities.findRelevantSaleableModelByRemoteId(pg, ep, remoteId);
		if (!ref)
			return {};
			
		// reduce the items based on cache
		pg = this.correctPg(pg, subtractionCache, setAmountData);
		// console.log(setAmountData, pg.models[0]._amountData);
		const modelsHM = ObjectUtils.arrayToHashmap(pg.models, '_id');

		const currAvailable = this.getStockByVariation(ep, pg, ref);
		const newToSet = currAvailable - totalToSub;

		// get the data obj
		const toSet = this.createAmountDataToSetByVariation(ep, pg, remoteId, newToSet);

		// we delete negative numbers as we have to return only the amounts to SUB
		const tor: {[id: string]: ProductWithAmounts['_amountData']} = {};

		for (const id in toSet) {
			tor[id] = {};
			for (const l in toSet[id]) {
				const diff = (modelsHM[id] && modelsHM[id]._amountData[l] ? modelsHM[id]._amountData[l] : 0) - toSet[id][l];
				tor[id][l] = diff;
			}
		}

		return tor;
	}

	/**
	 * as we could have multiple items refering to the same product before saving to db, we need to sub the quantities currently
	 * being processed
	 * @param pg product group
	 * @param subtract cached subtraction array
	 */
	private correctPg(pg: ProductGroupWithAmount, subtract: {[id: string]: ProductWithAmounts['_amountData']}, setAmountData?: {[id: string]: ProductWithAmounts['_amountData']}): ProductGroupWithAmount {

		// if (!pg.models.some(p => subtract[p._id.toString()]))
		// 	return pg;

		// clone as to not alter original objects
		pg = ObjectUtils.cloneDeep(pg);

		for (const m of pg.models) {
			const id = m._id.toString();

			// ensure we reset every model to the same status as to create the same exact transfer orders
			if (setAmountData) {
				if (setAmountData[id])
					m._amountData = setAmountData[id];
				else
					delete setAmountData[id];

				continue;
			}

			if (subtract[id])
				for (const l in subtract[id])
					m._amountData[l] = (m._amountData[l] || 0) - subtract[id][l];
		}

		return pg;
	}



	

	/**
	 * Returns the most relevant active product model, this function is used to push changes of stock to remote
	 * so it means we only need the active models
	 * @param pg Product Group
	 * @param ep External Connection
	 * @param model The product model that will be matched against other models to find a saleable fit
	 */
	private findActiveSaleableByModel(pg: ProductGroup, ep: ExternalConnection, model: Product): Product {
		return this.findActive(ProductGroupTypeController.twoSaleableVariationsAreEqual, pg, ep, model);
	}

	/**
	 * Returns the most relevant active product model, this function is used to push changes of stock to remote
	 * so it means we only need the active models
	 * @param pg Product Group
	 * @param ep External Connection
	 * @param model The product model that will be matched against other models to find a saleable fit
	 */
	private findActiveWillMoveTo(pg: ProductGroup, ep: ExternalConnection, model: Product): Product {
		return this.findActive(ProductGroupTypeController.willMoveAmountOnSave, pg, ep, model);
	}

	/**
	 * Returns the most relevant active product model, this function is used to push changes of stock to remote
	 * so it means we only need the active models
	 * @param pg Product Group
	 * @param ep External Connection
	 * @param model The product model that will be matched against other models to find a saleable fit
	 */
	private findActive(fn: (oldProd: Product, newProd: Product) => boolean, pg: ProductGroup, ep: ExternalConnection, model: Product): Product {
		// if the model is not deleted then it's the most relevant
		// so we check for an id inside the given model
		if (!model._deleted && this.getRemoteId(model, ep))
			return model;

		for (const m of pg.models)
			if (!m._deleted && fn(model, m) && this.getRemoteId(m, ep))
				return m
		
		// dont return anything as apparently the given model is deleted and there is no equal saleable variation active
		// thus the variation is deleted from remote
		return;
	}

}
import { Request } from 'express';
import { ProductMovementType } from '../../paths/products/product-movements/ProductMovement';
import { PricedRowsController } from '../../utils/priced-rows/priced-rows.controller';
import { PricedRowsSaleModel as _PricedRowsSaleModel, PricedRowSale } from './priced-rows-sale.dtd';
import { AuthHelperService, DeleteOptions, DeleteResult, Error401, Error403, FetchableField, GenError, IDtdTypes, IVerifiableItemDtd, MongoDBFetch, ObjectUtils, RequestHelperService, SaveOptions } from '@sixempress/main-be-lib';
import { Product } from '../../paths/products/Product';
import { ProductMovementController } from '../../paths/products/product-movements/ProductMovement.controller';
import { ErrorCodes } from '../../utils/enums/error.codes.enum';
import { SaleAnalysisController } from '../../paths/sale-analyses/SaleAnalysis.controller';
import { TransferOrder, TransferOrderStatus } from '../../paths/transfer-orders/TransferOrder.dtd';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { TransferOrderController } from '../../paths/transfer-orders/TransferOrder.controller';
import { AnyBulkWriteOperation, Filter, ObjectId } from 'mongodb';

type PricedRowsSaleModel = _PricedRowsSaleModel<any>

export abstract class PricedRowsSaleController<T extends PricedRowsSaleModel> extends PricedRowsController<T> {

	// as it's a sale type, we sell the products on completion
	protected successProdMovType = ProductMovementType.sellProducts;

	/**
	 * Ensures that a model is saved only if the stock is available
	 * @default false
	 */
	protected checkStockAvailability = false;

	// add missing product transfer dtd
	getDtd(): IVerifiableItemDtd<T> {

		(this.pricedRowDtd as IVerifiableItemDtd<PricedRowsSaleModel>)
			.customer = FetchableField.getFieldSettings(ModelClass.Customer, false);

		((((this.pricedRowDtd.list as IDtdTypes<PricedRowSale[]>).arrayDef.objDef[0] as IVerifiableItemDtd<PricedRowSale>)
			.products as IDtdTypes<PricedRowSale['products']>).arrayDef.objDef[0] as IVerifiableItemDtd<PricedRowSale['products'][0]>)
				.transfer = {type: [Object], required: false, objDef: [Number], customFn: (v, b: PricedRowsSaleModel) => b.physicalLocation in v ? 'Cannot transfer from same physicalLocation as the model' : undefined};

		return super.getDtd();
	}

	// ensure that the transfer origin are allowed to the user
	public preInsertFunction( req: Request, models: T[], options: SaveOptions = {} ): void | GenError {
		const t = super.preInsertFunction(req, models, options);
		if (t) 
			return t;
		
		// get the user loc info
		const authz = AuthHelperService.getAuthzBody(req);
		if (!authz) 
			return new Error401('Expected Authorization Token not Authentication');
		
		if (authz.locs.includes("*"))
			return;

		// check if transfer are allowed to the user
		for (const m of models)
			for (const l of m.list)
				for (const p of l.products || [])
					if (p.transfer)
						for (const id in p.transfer)
							if (!authz.locs.includes(id))
								return new Error403("Trying to add a product amount from a location not accessible by the user");
	}

	// check if stock is present
	protected async preprocessRows(req: Request, models: T[], method: 'insert' | 'update'): Promise<void> {
		// quick fix to check only on save as to push the update out, we should check in both cases but we need to do some more complex logic
		// and i got no time for dat
		if (method === 'insert')
			await this.ensureStockIsAvailable(req, models);

		await super.preprocessRows(req, models, method);
	}

	protected getFieldsToFetch(isPostprocess: true): MongoDBFetch[] {
		if (!isPostprocess)
			return super.getFieldsToFetch(isPostprocess);

		return [
			...super.getFieldsToFetch(isPostprocess),
			{field: '_transferOrders.*'},
		]
	}

	// add the analysis to db
	protected async postprocessIdempotentState(req: Request, models: T[]): Promise<void> {
		// we clone to save as sale analysis as the models will have fields fetched on them
		const cloned = ObjectUtils.cloneDeep(models);
		await super.postprocessIdempotentState(req, models);
		await this.addSaleAnalysis(req, cloned);
		await this.stockTransfer(req, models);
	}

	/**
	 * Checks if the stock requested is available for deduction before proceeding
	 * // TODO this should be changed to be more like a "findAndUpdate" as to not have concurrency errors
	 */
	protected async ensureStockIsAvailable(req: Request, models: T[]) {
		// we check only if not automated task
		// as automated tasks are used for syncing etc
		if (!this.checkStockAvailability || RequestHelperService.isReqFromBackend(req))
			return;

		// fetch the stock details
		const prods: Product[] = [];
		for (const m of models)
			for (const l of m.list)
				for (const p of l.products || [])
					prods.push(p.item.fetched);

		await new ProductMovementController().setDetailedStock(req, prods);

		// check for stock errors
		const insufficient: Array<{id: string, subracted: number, available: number, locationId: string}> = [];
		for (const m of models) {
			for (const l of m.list) {
				for (const p of l.products || []) {
					
					let transfered = 0;
					// check the items to transfer
					if (p.transfer) {
						for (const id in p.transfer) {
							transfered += p.transfer[id];

							if (p.transfer[id] > (p.item.fetched._amountData[id] || 0)) {
								insufficient.push({id: p.item.id, subracted: p.amount, available: p.item.fetched._amountData[id] || 0, locationId: id});
							}
						}
					}

					// check amount from current location (with the transfered amount removed)
					const currLocAmount = p.amount - transfered;
					if (currLocAmount > (p.item.fetched._amountData[m.physicalLocation] || 0))
						insufficient.push({id: p.item.id, subracted: currLocAmount, available: p.item.fetched._amountData[m.physicalLocation] || 0, locationId: m.physicalLocation});
				}
			}
		}

		// yeet the error
		if (insufficient.length)
			throw new Error403({code: ErrorCodes.productStockInsufficientPricedRows, message: 'The amount for the product is not valid', data: insufficient});
	}

	/**
	 * Creates the transfer orders for the additional stock present
	 */
	protected async stockTransfer(req: Request, models: T[]): Promise<void> {
		const c = new TransferOrderController();
		const transferIdsToDelete: ObjectId[] = [];
		const transfersToSave: TransferOrder[] = [];
		const byModel: {[modelId: string]: TransferOrder[]} = {};
		
		for (const m of models) {
			const byLocation: {[locId: string]: {[productId: string]: number}} = {};

			// aggregate data
			for (const l of m.list) {
				for (const p of l.products || []) {
					if (p.transfer) {
						for (const id in p.transfer) {
							if (!byLocation[id])
								byLocation[id] = {};
							
							if (!byLocation[id][p.item.id])
								byLocation[id][p.item.id] = 0

							byLocation[id][p.item.id] += p.transfer[id];
						}
					}
				}
			}

			// create models
			byModel[m._id.toString()] = [];
			for (const t of m._transferOrders || [])
				transferIdsToDelete.push(new ObjectId(t.id));

			for (const locId in byLocation) {
				// get the already present one or a new one
				const transfer: TransferOrder = (m._transferOrders || []).find(o => o.fetched.transferOriginLocationId === locId)?.fetched || {
					date: m.date,
					status: TransferOrderStatus.pending,
					transferOriginLocationId: locId,
					list: [],
					payments: [],
					economicTransfer: true,
					
					...this.getBaseModelFields(m),
				};
				
				// update the status of the transfer to be complete
				if (this.isModelCompleteSuccess(m))
					transfer.status = TransferOrderStatus.completed;
				// or cancelled
				else if(this.isModelFailed(m))
					transfer.status = TransferOrderStatus.cancelled;
				// draft
				else if (this.isModelDraft(m))
					transfer.status = TransferOrderStatus.draft;
				// or if the model is in pendings status, but the transfer is failed, we restore it
				// TODO we shoulld also check if the priced rows model was moved from failed to in pending here
				// but that would make it non "idempotent" :/
				else if (c.isModelFailed(transfer) || c.isModelDraft(transfer))
					transfer.status = TransferOrderStatus.pending;

				// we always override the products list to ensure it is always up to date
				if (!transfer.list[0])
					transfer.list[0] = {};
				transfer.list[0].products = [];

				for (const pId in byLocation[locId])
					transfer.list[0].products.push({item: new FetchableField(pId, ModelClass.Product), amount: byLocation[locId][pId]});

				// calculate the totalPrice each time as the products amounts may change
				delete transfer.totalPrice;

				// ensure that the _id is always an objectId
				if (transfer._id)
					transfer._id = new ObjectId(transfer._id);

				// store
				byModel[m._id.toString()].push(transfer);
				transfersToSave.push(transfer);
			}
		}

		// "Idempotent" save transfers
		await c.deleteForUser(req, {_id: {$in: transferIdsToDelete}}, {completeDelete: true, deleteMulti: true, skipFilterControl: true});
		await c.saveToDb(req, transfersToSave);
		
		// add the transferorder ids to the root model as in: _transferOrders: FetchableField[];
		const bulk: AnyBulkWriteOperation<T>[] = [];
		for (const id in byModel) {

			const fetchableTransfers: FetchableField<ModelClass.TransferOrder>[] = byModel[id].map(m => new FetchableField(m._id, ModelClass.TransferOrder));
			
			// remove transfer order for models that do not have transfers
			const upd = fetchableTransfers.length
				? {$set: {_transferOrders: fetchableTransfers}}
				: {$unset: {_transferOrders: ''}};

			bulk.push({updateOne: {
				filter: {_id: new ObjectId(id)},
				update: upd,
			}} as AnyBulkWriteOperation<T>)
		}

		await this.getCollToUse(req).bulkWrite(bulk);
	}

	// add the analysis to a common db table as to have easier graph reports
	protected async addSaleAnalysis(req: Request, models: T[]): Promise<void> {
		await new SaleAnalysisController().addAnalysis(req, this.modelClass, this.modelStatus, models);
	}

	// remove analysis and all sideffects
	async deleteForUser(req: Request, filters: Filter<T>, options?: DeleteOptions): Promise<DeleteResult> {
		const models = await this.findItemsToDelete(req, filters, options);
		await new SaleAnalysisController().removeAnalysis(req, this.modelClass, models);
		return super.deleteForUser(req, filters, options);
	}

}

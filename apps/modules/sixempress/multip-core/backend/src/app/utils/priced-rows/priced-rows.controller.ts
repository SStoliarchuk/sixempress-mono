import { Request } from 'express';
import { ModelClass } from "../../utils/enums/model-class.enum";
import { AbstractDbApiItemController, AuthHelperService, CustomExpressApp, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue, DeleteOptions, DeleteResult, Error403, FetchableField, GenError, IBaseModel, IVerifiableItemDtd, ModelFetchService, MongoDBFetch, ObjectUtils, RequestHandlerService, RequestHelperService, SaveOptions } from "@sixempress/main-be-lib";
import { CreateVariationsType, PricedRow, PricedRowsDBOpts, PricedRowsModel, PricedRowsModelTotalType } from "./priced-rows.dtd";
import moment from 'moment';
import { AnyBulkWriteOperation, Filter, ObjectId } from 'mongodb';
import { Movement, MovementDirection, MovementMedium } from '../../paths/movements/Movement';
import { MovementController } from '../../paths/movements/Movement.controller';
import { ProductMovementController } from '../../paths/products/product-movements/ProductMovement.controller';
import { ProductMovement, ProductMovementType } from '../../paths/products/product-movements/ProductMovement';
import { ProductGroupController } from '../../paths/products/ProductGroup.controller';
import { ProductController } from '../../paths/products/Product.controller';
import { ErrorCodes } from '../../utils/enums/error.codes.enum';
import { CouponController } from '../../paths/coupons/Coupon.controller';
import { Coupon } from '../../paths/coupons/Coupon.dtd';

export abstract class PricedRowsController<T extends PricedRowsModel<any>> extends AbstractDbApiItemController<T> {

	requirePhysicalLocation = true;
	addIncrementalValue = true;
	addDateField = true;

	/**
	 * The different statuses available for the model
	 */
	public abstract modelStatus: {
		/** All the statuses available */
		all: (number | T)[],
		/** No adding of payments nor product movements */
		draft: (number | T)[],
		/** All the statuses that fail the model transaction and rollback the things */
		fail: (number | T)[],
		/** The complete status where nothing else has to be done and we can finalize */
		success: (number | T)[],
		/** If a model is complete BUT the payments are yet to be completed */
		successPrePay: (number | T)[],
	};

	protected abstract successProdMovType: ProductMovementType;

	protected pricedRowDtd: IVerifiableItemDtd<PricedRowsModel<any>> = {
		date: { type: [Number], required: false, },
		endDate: { type: [Number], required: false, },

		totalPrice: { type: [Number], required: false, },

		payments: { type: [Array], required: true, arrayDef: { type: [Object], objDef: [{
			medium: { type: [Number], required: true },
			amount: { type: [Number], required: true },
			date: { type: [Number], required: true },
		}] } },
		
		list: { type: [Array], required: true, arrayDef: { type: [Object], objDef: [{
			date: { type: [Number], required: false, },
			products: { type: [Array], required: false, arrayDef: { type: [Object], objDef: [{
				item: FetchableField.getFieldSettings(ModelClass.Product, true),
				amount: { type: [Number], required: true },
				newVariation: {...ProductController.variationDataDtd, required: false},
			}]} },
			coupons: { type: [Array], required: false, arrayDef: { type: [Object], objDef: [{
				item: FetchableField.getFieldSettings(ModelClass.Coupon, true),
			}]} },
			manual: { type: [Array], required: false, arrayDef: { type: [Object], objDef: [{
				description: { type: [String], required: true, },
				sellPrice: { type: [Number], required: false, },
				buyPrice: { type: [Number], required: false, },
				additional: { type: [Array], required: false, arrayDef: { type: [Object], objDef: [{
					name: { type: [String], required: true, },
					value: { type: [String], required: true, },
				}]} }
			}]} },
		}] } },
	}

	getDtd(): IVerifiableItemDtd<T> {
		this.pricedRowDtd.status = {type: [Number], required: true, possibleValues: this.modelStatus.all };
		
		return {
			...this.pricedRowDtd, 
			...super.getDtd(), 
		};
	}

	generateBePaths(app: CustomExpressApp, rhs: RequestHandlerService<T>) {
		if (this.Attributes.modify)
			app.post(
				'/' + this.bePath + 'regen', 
				AuthHelperService.requireAttributes(this.Attributes.modify),
				RequestHelperService.safeHandler(req => this.executeDbRegen(req))
			);

		super.generateBePaths(app, rhs);
	}

	/**
	 * Wheter the model is in a "terminal" state regardless if success or not
	 */
	public isModelComplete(m: T): boolean {
		return this.isModelFailed(m) || 
			this.isModelCompleteSuccess(m) || 
			this.isModelCompleteSuccessWillPay(m);
	}

	/**
	 * If model is completed in a successfull state
	 */
	public isModelCompleteSuccess(m: T): boolean {
		return this.modelStatus.success.includes(m.status) || 
			this.modelStatus.successPrePay.includes(m.status)
	}

	/**
	 * If model is complete success state and to add remaining payments left
	 */
	public isModelCompleteSuccessWillPay(m: T): boolean {
		return this.modelStatus.success.includes(m.status);
	}

	/**
	 * If a model is just a draft so no prod/mov are added
	 */
	public isModelDraft(m: T): boolean {
		return this.modelStatus.draft.includes(m.status);
	}

	/**
	 * Wheter the model is failed
	 */
	public isModelFailed(m: T): boolean {
		return this.modelStatus.fail.includes(m.status);
	}

	/**
	 * Calculates the totals for a row
	 * @param type the type of the total to return\
	 * 'net' => returns the net total earning\
	 * 'calculated' => returns the sum of all the sellPrices withouth discounts\
	 * 'left' => the set total amount minus the payments already done\
	 * 'granTotal' => the amount to actually pay (either automatically set or set by the user)\
	 * 'buyPrice' => the expenses for the business side
	 */
	public getTotal(m: T, type: PricedRowsModelTotalType): number {
		switch(type) {
			//
			// the grand total to pay
			//
			case PricedRowsModelTotalType.granTotal:
				return typeof m.totalPrice !== 'undefined' 
					? m.totalPrice
					: this.getTotal(m, PricedRowsModelTotalType.calculated)

			//
			// the grand total MINUS the payments already made
			//
			case PricedRowsModelTotalType.left:
				let left = this.getTotal(m, PricedRowsModelTotalType.granTotal);

				for (const p of m.payments || [])
					left -= p.amount;
				
				return left > 0 ? left : 0;
			
			//
			// the math sum of all the costs in the system
			//
			case PricedRowsModelTotalType.calculated:
				let calc = 0;

				for (const l of m.list) {
					for (const m of l.manual || [])
						calc += m.sellPrice || 0;
		
					for (const p of l.products || [])
						calc += p.amount * p.item.fetched.variationData.sellPrice;

					for (const c of l.coupons || [])
						calc -= c.item.fetched.amount;
				}

				return calc;

			//
			// the buy costs for the list
			//
			case PricedRowsModelTotalType.buyPrice:
				let buyCost = 0;

				for (const l of m.list) {
					for (const m of l.manual || [])
						buyCost += m.buyPrice || 0;
		
					for (const p of l.products || [])
						buyCost += p.amount * p.item.fetched.variationData.buyPrice;
				}
		
				return buyCost;

			//
			// the net earning of the grand total
			//
			case PricedRowsModelTotalType.net:
				return this.getTotal(m, PricedRowsModelTotalType.granTotal) - this.getTotal(m, PricedRowsModelTotalType.buyPrice);

			//
			// just in case we throw error instead of giving zero
			//
			default:
					throw new Error('Total Type not implemented: "' + type + '"');

		}
	}

	/**
	 * Adds the fetched fields
	 */
	protected getFieldsToFetch(isPostprocess: boolean): MongoDBFetch[] {
		return [
			{field: 'list.*.products.*.item'}, 
			{field: 'list.*.coupons.*.item'},
		];
	}

	/**
	 * Populates the fetchable fields in the model
	 */
	public async setFetchedFields(req: Request, models: T[], isPostprocess: boolean) {
		await ModelFetchService.fetchAndSetFields(req, this.getFieldsToFetch(isPostprocess), models);
	}

	/**
	 * Creates all the meta info for the model and other fixes and updates to refs
	 */
	protected async preprocessRows(req: Request, ms: T[], method: 'insert' | 'update'): Promise<void> {

		if (method === 'insert')
			this.checkCouponOnCreate(req, ms);

		// here we store all the new variations to create
		// the pObjRef object is the products object that contains the id of the product
		// as during the variation update the _id field is changed by reference, we have to remap that id
		// to the original product instruction
		const createVariations: CreateVariationsType = [];

		const currUnix = moment().unix();
		for (const m of ms)
			this.preprocessSingleModel(req, m, currUnix, createVariations);

		// create the new product variations
		// and update the list object
		if (createVariations.length) {
			await new ProductGroupController().addNewVariations(req, createVariations, 'replace');

			for (const nv of createVariations)
				nv.pObjRef.item.id = nv._id.toString();
		}

	}

	/**
	 * Check coupons
	 */
	public checkCouponOnCreate(req: Request, ms: T[]) {
		const used: Coupon[] = [];

		for (const m of ms)
			for (const l of m.list)
				for (const c of l.coupons || [])
					if (c.item.fetched._used)
						used.push(c.item.fetched);

		if (used.length)
			throw new Error403({ code: ErrorCodes.couponAlreadyUsed, data: used });
	}

	/**
	 * Processes a single model
	 * @param m A single model to process
	 * @param currUnix The current time in unix to set in the date of the list
	 * @param createVariations an array that will be pushed into by refs of all the variations to create
	 */
	protected preprocessSingleModel(req: Request, m: T, currUnix: number, createVariations: CreateVariationsType) {

		// if the item is complete and there is no endDate or it is in the future
		// then we reset the endDate to the current time
		if ((!m.endDate || m.endDate > currUnix) && this.isModelComplete(m))
			m.endDate = currUnix;

		const leftToPay = this.getTotal(m, PricedRowsModelTotalType.left);

		// move to completed status if in prepay and the last payment has been done (also check if success[0] exists for safety)
		if (this.modelStatus.successPrePay.includes(m.status) && leftToPay === 0 && this.modelStatus.success[0])
			m.status = this.modelStatus.success[0];

		// only if success (NOT PRE-PAY SUCCESS) we add the remainig totalPrice to pay
		if (this.isModelCompleteSuccessWillPay(m) && leftToPay)
			m.payments.push({ amount: leftToPay, date: currUnix, medium: MovementMedium.unspecified });

		// update the total
		const totCalc = this.getTotal(m, PricedRowsModelTotalType.calculated);
		if (typeof m.totalPrice !== 'number' || isNaN(m.totalPrice))
			m.totalPrice = totCalc;

		// set meta
		m._priceMeta = {
			priceChange: m.totalPrice - totCalc,
			maxTotal: totCalc,
			net: this.getTotal(m, PricedRowsModelTotalType.net),
			left: this.getTotal(m, PricedRowsModelTotalType.left),
		};

		// each row
		for (let i = 0; i < m.list.length; i++) {
			const l = m.list[i];

			// note the _author is later reverted if the row did not change at all
			l._meta = RequestHelperService.getCreatedDeletedObject(req);
			if (!l.date)
				l.date = currUnix;

			// products
			for (let i = 0; i < (l.products || []).length; i++) {
				const p = l.products[i];

				// remove product
				if (p.amount < 1) {
					l.products.splice(i--, 1);
					continue;
				}
				
				// check if we have to update the variation
				if (p.newVariation && !ProductGroupController.twoVariationAreTheSame({variationData: p.newVariation}, p.item.fetched))
					createVariations.push({_id: p.item.id, variationData: p.newVariation, pObjRef: p})

				delete p.newVariation;
				delete p.item.fetched;
			}

			// delete empty fields
			for (const m of l.manual || []) {
				if (!m.buyPrice)
					delete m.buyPrice;
				
				if (!m.sellPrice)
					delete m.sellPrice;

				if (m.additional && !m.additional.length)
					delete m.additional;
			}

			// remove empty items
			for (const k in l)
				if (Array.isArray(l[k]) && !(l[k] as any).length)
					delete l[k]
			
			// no thing is present in array so remove whole list row
			if (this.isRowEmpty(l))
				m.list.splice(i--, 1);
		}
	}

	/**
	 * Checks if the row has anything that will count as a priced element
	 */
	public isRowEmpty(row: PricedRow): boolean {
		if (!row.products?.length && !row.manual?.length)
			return true;

		return false;
	}

	/**
	 * As the changes are idempotent, here we have a function that iterates through all the models to "refresh" them in case there is some logic error or db changes
	 */
	protected async executeDbRegen(req: Request) {
		const allItems = await this.getCollToUse(req).find({_deleted: {$exists: false}}).toArray();
		if (!allItems.length)
			return;

		return this.executeDbSave(req, {regenMode: true, method: 'insert', base: {}}, allItems, undefined);
	}

	/**
	 * create parents tree and other stuff
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: PricedRowsDBOpts<A, T>, 
		toSave: A extends 'insert' ? T[] : T, 
		oldObjInfo:  A extends 'insert' ? undefined : T
	): Promise<DBSaveReturnValue<T>> {

		const arr = Array.isArray(toSave) ? toSave as T[] : [toSave as T];
		
		await this.setFetchedFields(req, arr, false);
		await this.preprocessRows(req, arr, opts.method);

		if (opts.method === 'update' && !opts.regenMode)
			this.fixFieldsOnUpdate(req, toSave as T, oldObjInfo);
		
		// update DB
		const saved: DBSaveReturnValue<T> = opts.regenMode
			? await this.getCollToUse(req).bulkWrite(arr.map(m => ({replaceOne: {filter: {_id: new ObjectId(m._id)}, replacement: m}}))) as any
			: await super.executeDbSave(req, opts, toSave, oldObjInfo);

		// try catch all to then delete everything on error
		// TODO add the 'transaction' logic for mongodb 5.0 so we can rollback easily
		try {
			await this.deleteForIdempotentState(req, arr);
			await this.postprocessIdempotentState(req, arr);

			// we only add the data back if not failed or draft
			const valid = arr.filter(m => !this.isModelDraft(m) && !this.isModelFailed(m));
			if (valid.length) {
				await this.postprocessValidRows(req, valid);
				await this.processPayments(req, valid);
			}
		}
		catch (e) {
			await this.rollbackOnError(req, opts, toSave, oldObjInfo);
			throw e;
		}

		return saved;
	}

	/**
	 * Updates some fields when the model is updated and not inserted
	 */
	protected fixFieldsOnUpdate(req: Request, toSave: T, oldObjInfo: T) {

		// if update mode, check if we're removing the 'completed' status
		// if we're removing it then we're also removing the relative endDate
		// so when we flag back the item to 'completed' the correct current endDate will be set
		if (this.isModelComplete(oldObjInfo) && !this.isModelComplete(toSave))
			delete toSave.endDate
		// else if both old and new are saveable, but the new does not have endDate, we set the one from the old
		// could happen when the user sends an update (put/patch) withouth the endDate field
		else if (!toSave.endDate && this.isModelComplete(oldObjInfo) && this.isModelComplete(toSave))
			toSave.endDate = oldObjInfo.endDate;

		// restore _meta if no changes were made
		for (let i = 0; i < toSave.list.length; i++)
			if (ObjectUtils.areVarsEqual(oldObjInfo.list[i], toSave.list[i], {ignorePrivateFields: true}))
				toSave.list[i]._meta = oldObjInfo.list[i]._meta;
	}

	/**
	 * Currently only deleted the inserted rows. TODO revert also the updates
	 */
	protected async rollbackOnError<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, T>, 
		toSave: A extends 'insert' ? T[] : T, 
		oldObjInfo:  A extends 'insert' ? undefined : T
	): Promise<void> {
		// currently works only on creation
		// TODO add support for revert on updaten
		if (opts.method === 'insert') {
			// remove side effects
			await this.deleteForIdempotentState(req, toSave as T[]);
			
			// remove newly created items
			const ids = (toSave as T[]).filter(t => t._id).map(t => new ObjectId(t._id.toString()));
			if (ids.length)
				await this.getCollToUse(req).deleteMany({_id: {$in: ids}});
		}
	}

	/**
	 * Removes all old movements/product movements etc as to create a "blank" slate for the new ref models to be created
	 */
	protected async deleteForIdempotentState(req: Request, models: T[]): Promise<void> {
		const modelsId = models.filter(m => m._id).map(m => m._id.toString());
		if (!models.length)
			return;

		// delete permanently as to not pollute db
		await new MovementController().getCollToUse(req).deleteMany({'_generatedFrom.id': {$in: modelsId}});
		
		await new CouponController().getCollToUse(req).updateMany({'_used.id': {$in: modelsId}}, {$unset: {_used: 1}});

		// TODO permanently delete pMovs
		// for now we mark as deleted due to the sync with woo-commerce
		// await new ProductMovementController().getCollToUse(req).deleteMany({'_generatedFrom.id': {$in: modelsId}});
		await new ProductMovementController().deleteForUser(req, {'_generatedFrom.id': {$in: modelsId}}, {deleteMulti: true, skipFilterControl: true});
	}

	/**
	 * Executed for all rows
	 * 
	 * it sets the fetched info
	 */
	protected async postprocessIdempotentState(req: Request, models: T[]): Promise<void> {
		await this.setFetchedFields(req, models, true);
	}

	/**
	 * Idempotent function to update the models' data for VALID rows only
	 */
	protected async postprocessValidRows(req: Request, models: T[]): Promise<void> {
		const allModelIds: string[] = [];
		const prodMovs: ProductMovement[] = [];
		const movs: Movement[] = [];
		const cpsIdsByModel: {[id: string]: ObjectId[]} = {};

		// build arrays
		for (const m of models) {
			allModelIds.push(m._id.toString());
			cpsIdsByModel[m._id.toString()] = [];

			for (const l of m.list) {
				for (const p of l.products || [])
					prodMovs.push(...this.createProductMovementModelForRow(m, p));

				for (const i of l.manual || [])
					if (i.buyPrice)
						movs.push(...this.createMovementModelForManualBuyPrice(m, l, i));

				for (const c of l.coupons || [])
					cpsIdsByModel[m._id.toString()].push(new ObjectId(c.item.id));
			}

			if (!cpsIdsByModel[m._id.toString()].length)
				delete cpsIdsByModel[m._id.toString()];
		}

		const bulkCps: AnyBulkWriteOperation<Coupon>[] = Object.keys(cpsIdsByModel).map(id => ({
			updateMany: {
				filter: { _id: { $in: cpsIdsByModel[id] } },
				update: { $set: { _used: new FetchableField(id, this.modelClass) } },
			}
		}) as AnyBulkWriteOperation<Coupon>);

		// save
		await new CouponController().getCollToUse(req).bulkWrite(bulkCps);
		await new ProductMovementController().saveToDb(req, prodMovs);
		await new MovementController().saveToDb(req, movs);
	}

	/**
	 * Idempotent function to update the models' money movement
	 */
	protected async processPayments(req: Request, models: T[]): Promise<void> {
		const toCreate: Movement[] = [];

		// build arrays
		for (const m of models)
			for (const r of m.payments || [])
				toCreate.push(...this.createMovementModelForPayment(m ,r));

		// we delete permanently the old one as to not pollute the db
		await new MovementController().saveToDb(req, toCreate);
	}

	/**
	 * Creates movement models to save for a specific payment row
	 */
	protected createMovementModelForPayment(model: T, p: T['payments'][0]): Movement[] {
		return [{
			...this.getBaseModelFields(model),
			date: p.date,
			priceAmount: p.amount,
			medium: p.medium,
			direction: MovementDirection.input,
		}]
	}


	/**
	 * Creates the money movement for the buyPrice of the services
	 */
	protected createMovementModelForManualBuyPrice(model: T, row: PricedRow, man: PricedRow['manual'][0]): Movement[] {
		return [{
			...this.getBaseModelFields(model),
			description: man.description,
			date: row.date,
			priceAmount: man.buyPrice,
			direction: MovementDirection.output,
			medium: MovementMedium.unspecified,
		}];
	}

	/**
	 * Returns _generatedFrom
	 */
	protected getGeneratedFromField(model: T): Pick<IBaseModel, |'_generatedFrom'> {
		return { _generatedFrom: new FetchableField(model._id, this.modelClass) };
	}

	/**
	 * Returns common fields for the movement model
	 */
	protected getBaseModelFields(model: T): Pick<IBaseModel, '_generatedFrom' | 'physicalLocation' | 'documentLocation' | 'documentLocationsFilter'> {
		return {
			...this.getGeneratedFromField(model),
			physicalLocation: model.physicalLocation || model.documentLocation,
			documentLocation: model.physicalLocation || model.documentLocation,
			documentLocationsFilter: model.documentLocationsFilter,
		}
	}

	/**
	 * Creates the product movement for a product in the priced row
	 */
	protected createProductMovementModelForRow(model: T, row: PricedRow['products'][0]): ProductMovement[] {
		const items: ProductMovement[] = []; 

		const type = this.isModelCompleteSuccess(model) 
			? this.successProdMovType 
			: ProductMovementType.reserveOrIncoming;

		items.push({
			...this.getBaseModelFields(model),
			date: model.date,
			amount: -row.amount,
			movementType: type,
			targetProductInfo: {
				productsGroupId: row.item.fetched._trackableGroupId,
				product: { id: row.item.id, modelClass: row.item.modelClass },
			},
		});

		return items;
	}

	/**
	 * Removes everything generated by this model and then removes the model itself
	 */
	async deleteForUser(req: Request, filters: Filter<T>, options?: DeleteOptions): Promise<DeleteResult> {
		const found = await this.findItemsToDelete(req, filters, options);
		await this.deleteForIdempotentState(req, found);
		return super.deleteForUser(req, filters, options);
	}

}
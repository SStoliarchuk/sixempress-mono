import { IVerifiableItemDtd, FetchableField, DeleteOptions, MongoUtils, DBSaveOptions, DBSaveOptionsMethods, Error500, DBSaveReturnValue, AuthHelperService, ObjectUtils, InsertResult, AbstractDbApiItemController, RequestHandlerService, CustomExpressApp, Error404 } from '@sixempress/main-be-lib';
import { Attribute } from '../../../utils/enums/attributes.enum';
import { ModelClass } from '../../../utils/enums/model-class.enum';
import { BePaths } from '../../../utils/enums/bepaths.enum'
import { ProductMovement, ProductMovementType } from './ProductMovement';
import { Request } from 'express';
import { Filter, ObjectId } from 'mongodb';
import to from 'await-to-js';
import { Product } from '../Product';
import { ProductController } from '../Product.controller';

export class ProductMovementController extends AbstractDbApiItemController<ProductMovement> {

	private static movementTypeEnum = Object.values(ProductMovementType).filter(p => typeof p === 'number');

	modelClass = ModelClass.ProductMovement;
	collName = ModelClass.ProductMovement;
	bePath = BePaths.productmovements;

	addDateField = true;

	// we dont need it as it's assigned the value of documentlocation
	requireDocumentLocationsFilter = false;
	requirePhysicalLocation = true;

	Attributes = {
		view: Attribute.viewProductMovements,
		add: Attribute.addProductMovements,
		modify: false,
		delete: false,
	};

	dtd: IVerifiableItemDtd<ProductMovement> = {

		movementType: { type: [Number], required: true, possibleValues: ProductMovementController.movementTypeEnum},
		amount: { type: [Number], required: true },

		targetProductInfo: { type: [Object], required: true, objDef: [{
			productsGroupId: { type: [String], required: false, regExp: MongoUtils.objectIdRegex, },
			product: FetchableField.getFieldSettings(ModelClass.Product, true),
		}], },

	};

	/**
	 * This is used only for saving items
	 */
	generateBePaths(app: CustomExpressApp, rhs: RequestHandlerService<ProductMovement>) {
		app.post('/' + this.bePath, AuthHelperService.requireAttributes([this.Attributes.add]), this.getHandler_post(rhs));
		
		app.get('/' + this.bePath, AuthHelperService.requireAttributes([this.Attributes.view]), this.getHandler_getMulti(rhs));
	}

	/**
	 * When adding or removing movements
	 * 
	 * recalcute the amounts in the product model
	 * The amount is used for quick stuff fun
	 */
	public async deleteForUser(req: Request, filter: Filter<ProductMovement>, options: Omit<DeleteOptions, 'completeDelete'> = {}): Promise<any> {

		const items = await this.findItemsToDelete(req, filter, options);
		const done = await super.deleteForUser(req, filter, options);
		// const done = await (options.deleteMulti ? this.getCollToUse(reqOrDbToUse).deleteMany(filter) : this.getCollToUse(reqOrDbToUse).deleteOne(filter));

		if (items.length !== 0) {
			// wrapping in to() prevents the object from trhowing
			// because in case it throws it's not THAT BIG of a deal ?? as the items will be recalculated on get
			await to(this.recalculateApproxProdAmount(req, items.map(p => p.targetProductInfo.product.id.toString())));
		}

		return done;
	}

	/**
	 * When adding or removing movements
	 * 
	 * recalcute the amounts in the product model
	 * The amount is used for quick stuff fun
	 * 
	 * also ensure documentLocationsFilter = documentLocation
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, ProductMovement>, 
		toSave: A extends "insert" ? ProductMovement[] : ProductMovement, 
		beObjInfo: A extends "insert" ? undefined : ProductMovement
	): Promise<DBSaveReturnValue<ProductMovement>> {
		
		// no modifcation
		if (opts.method !== 'insert')
			throw new Error500("ProductMovement Models are only allowed to be inserted, not altered");

		// ensure all products are present and assign group id
		if ((toSave as ProductMovement[]).length) {
			// product to fetch
			const allProdIdsHm: {[id: string]: ObjectId} = {};
			for (const b of toSave as ProductMovement[]) {
				allProdIdsHm[b.targetProductInfo.product.id] = new ObjectId(b.targetProductInfo.product.id);
				
				// match the doc locs ids
				b.documentLocationsFilter = [b.documentLocation];
			}

			const allProds = await new ProductController().findForUser(req, {_id: {$in: Object.values(allProdIdsHm)}}, {skipFilterControl: true});

			if (allProds.length !== Object.keys(allProdIdsHm).length) { 
				const fetchedProdsIds = allProds.map(p => p._id.toString());

				throw new Error404({
					message: 'Some target products ids were not found in db', 
					data: Object.keys(allProdIdsHm).filter(i => !fetchedProdsIds.includes(i)),
				});
			}
			
			// reassign correct data
			const hm: {[id: string]: Product} = ObjectUtils.arrayToHashmap(allProds, '_id');
			for (const b of toSave as ProductMovement[]) {
				b.targetProductInfo.productsGroupId = hm[b.targetProductInfo.product.id]._trackableGroupId;
			}
		}

		const done = await super.executeDbSave(req, opts, toSave, beObjInfo);

		// wrapping in to() prevents the object from trhowing
		// because in case it throws it's not THAT BIG of a deal ?? as the items will be recalculated on get
		if ((toSave as ProductMovement[]).length !== 0)
			await to(this.recalculateApproxProdAmount(req, (toSave as ProductMovement[]).map(i => i.targetProductInfo.product.id.toString())));
		

		return done;
	}

	/**
 	 * calculates the real products amount and sets the data in the products, but it calculates the amounts based
	 * on the locations that the user can see
 	 */
	public async calculateAmountInProdsForUser(req: Request, prods: Product[]): Promise<void> {

		// check if the projection hides this fields
		// TODO pass it as a param
		if (req.qsParsed.projection) {
			const proj: any = req.qsParsed.projection;
			const projType = MongoUtils.getProjectionType(proj);

			// check if fields will be used
			const fields = ['_amountData', '_totalAmount', 'models._amountData', 'models._totalAmount']
			const allUndefined = !Boolean(fields.find(f => typeof proj[f] !== 'undefined'));
			const allPresent = !Boolean(fields.find((f => typeof proj[f] === 'undefined')))
			
			if ( (projType === 1 && allUndefined) || (projType === 0 && allPresent) )
				return;
	
		}

		// TODO add this once we have permitted locations by model
		// const manualFilter = req.qs.locationFilter;
		// const authz = AuthHelperService.getAuthzBody(req);
		// if (!authz) throw new Error401('Expected Authorization Token not Authentication');

		// const locs = authz.user.locs;
		// const canAccessAllLocs = locs.includes('*');
			
		// let docLocFilter: object;

		// // if the user cant access every location available
		// // add default filter to only accessible data
		// if (!canAccessAllLocs) {
		// 	docLocFilter = {documentLocation: {$in: locs}};
		// }

		// // add manual filter
		// if (manualFilter && manualFilter !== '*') {
		// 	if (!canAccessAllLocs && !locs.includes(manualFilter)) { 
		// 		throw new Error403("Filtering prodMov by not allowed location: " + manualFilter); 
		// 	}
		// 	docLocFilter = {documentLocation: manualFilter};
		// }
	
		// return this.calculateRealProductsAmount(req, prods, docLocFilter);
		return this.calculateRealProductsAmount(req, prods);
	}


	/**
	 * sets the real amounts data in the products based by the product movements given
	 * fi the _approx datas dont match the real data then it recalculates the _approx data
	 * 
	 * if @param prodMov is not given, the it automatically finds all the prodMovs relative to the prods given
	 * withouth verifying the accessible locations of the Request user
	 */
	public async calculateRealProductsAmount(req: Request, products: Product[], addQueryFilter?: object, getBackEndSum?: true): Promise<void> {

		// filter the items that are not visible
		// we reassing the value as to not alter the original array
		//
		// also NOTE: the recalculateApproxAmount is not triggered uselessy as the products themselves are removed
		// and not the productMovments
		const prods: Product[] = [];

		// store all the ids to filter for the product movements to get
		const allIds = [];

		if (AuthHelperService.isAttributePresent(Attribute.viewProductMovements, req)) {
			for (const p of products) {
				// assign base values immediately in case some items are fileterd late by lack of permission
				p._amountData = {};
				p._totalAmount = 0;			
				prods.push(p);
				allIds.push(p._id.toString());
			}
		}
		
		const projection = {
			_id: 0,
			'targetProductInfo.product.id': 1,
			movementType: 1,
			amount: 1,
			documentLocation: 1,
		};
		// we dont query if no item to query remains
		// but we still need to add default empty values
		const prodMov: ProductMovement[] = !prods.length ? [] : await this.findForUser(
			req, 
			{_deleted: {$exists: false}, "targetProductInfo.product.id": {$in: allIds}, ...(addQueryFilter || {})}, 
			{skipFilterControl: true, base: {projection}}
		)

		// create hashmap of ids and the respective amount
		const amountsData = ProductMovementController.getProductsAmountsData(prodMov, getBackEndSum);

		// prods ids that have approx amount that does not match actual amount
		const idsToRecalc: string[] = [];

		// assign values and check that they are equal to the approx data
		for (const prod of prods) {
			
			// assign real data
			const relAm = amountsData[prod._id.toString()];
			if (relAm) {
				for (const k in relAm) {
					// check if the object and has some items
					if (typeof relAm[k] === 'object' && Object.keys(relAm[k]).length) {
						prod[k] = relAm[k];
					}
					// check if its a positive number (totalAmount)
					else if (relAm[k]) {
						prod[k] = relAm[k];
					}
				}
			}


			// if we have additional filters for the movements
			// then we need to ensure that if the filters hide some product mov locations
			// we need to delete them
			if (addQueryFilter && Object.keys(addQueryFilter).length && prod._approximateAmountData) {
				// update the _approx data by removing amounts from locations non accessible by the user
				for (const loc in prod._approximateAmountData) {
					if (typeof prod._amountData[loc] === 'undefined') {
						delete prod._approximateAmountData[loc];
					}
				}
				// ensure we set the field if the field is not deleted by projection
				if (typeof prod._approximateTotalAmount === 'number') {
					prod._approximateTotalAmount = Object.values(prod._approximateAmountData).reduce((car, cur) => car += cur, 0);
				}
			}


			// now as the eccess _approxData was deleted, we can check if it is equal to the true data
			// if it is not then we have to recalculate the _approxData

			// we ensure the fields are present, because they could be have deleted with a projection

			// if the totals dont match
			if (typeof prod._approximateTotalAmount === 'number' && prod._approximateTotalAmount != prod._totalAmount)  {
				idsToRecalc.push(prod._id.toString());
			}
			// or if the aproxx data is diff from the actual data
			else if (prod._approximateAmountData && ObjectUtils.objectDifference(prod._approximateAmountData, prod._amountData)) {
				idsToRecalc.push(prod._id.toString());
			}


			// assign true amoutns to approx
			// only if they were not hidden by projection
			if (typeof prod._approximateTotalAmount === 'number') {
				prod._approximateTotalAmount = prod._totalAmount;
			}
			if (prod._approximateAmountData) {
				prod._approximateAmountData = prod._amountData;
			}
		}
	
		// recalculate the approxx amount if needed
		if (idsToRecalc.length !== 0) {
			await this.recalculateApproxProdAmount(req, idsToRecalc);
		}

	}

	// TODO rewrite the function
	// this one is used for insufficient stock etc calucation
	public async setDetailedStock(req: Request, prods: Product[]): Promise<void> {
		return this.calculateRealProductsAmount(req, prods);
	}

	/**
	 * Based on product ids calculates their amounts and then saves the amounts inside the product model
	 * // TODO move to ProductGroupController() ?
	 */
	protected async recalculateApproxProdAmount(req: Request, prodIds: string[]) {
		// remove duplicates
		const cleared = prodIds.reduce((car, cur) => car[cur] = 1 && car, {});

		// get the relative movements
		// withouth filtering by REQ
		const getMov: ProductMovement[] = await this.findForUser(req,  { "targetProductInfo.product.id": {$in: Object.keys(cleared)}, _deleted: {$exists: false} }, {skipFilterControl: true});

		const amountData = ProductMovementController.getProductsAmountsData(getMov, false);

		// create update ops for bulk write
		const updateOps: Array<
			{updateOne: {
				filter: {_id: ObjectId}, 
				update: {$set: {_approximateAmountData: Product['_approximateAmountData'], _approximateTotalAmount: Product['_approximateTotalAmount']}}
			}} | 
			{updateMany: {
				filter: {_id: {$in: ObjectId[]}}, 
				update: {$set: {_approximateAmountData: {}, _approximateTotalAmount: 0}}
			}}
		> = [];

		for (const prodId in amountData) {
			delete cleared[prodId];
			updateOps.push({
				updateOne: {
					filter: {_id: new ObjectId(prodId)},
					update: {$set: {
						_approximateAmountData: amountData[prodId]._amountData,
						_approximateTotalAmount: amountData[prodId]._totalAmount
					} as {[A in keyof Product]: Product[A]} as any}
				}
			});
		}
		
		// if not all products have movements
		// then we set those products to 0 
		if (Object.keys(cleared).length !== 0) {
			updateOps.push({
				updateMany: {
					filter: {_id: {$in: Object.keys(cleared).map(k => new ObjectId(k))}},
					update: {$set: {
						_approximateAmountData: {},
						_approximateTotalAmount: 0
					} as {[A in keyof Product]: Product[A]} as any}
				}
			});
		}

		// update with raw collection
		// as to not trigger a CRUD notification
		// as these fields are """""not important""""" for crud notifiaction
		// if you need to update a product table or something
		// then sub to the product-movement crud-updates and then query the items
		if (updateOps.length !== 0)
			await new ProductController().getRawCollection(req).bulkWrite(updateOps);


	}



	/**
	 * Generates the amoutns data object to set in the product
	 */
	protected static getProductsAmountsData(movements: ProductMovement[], getBackEndSum: boolean) {
		
		// return value
		const toR: {[id: string]: Pick<Product, '_amountData' | '_totalAmount' | '_reservedData' | '_returnedData' | '_incomingData'>} = {};
		
		// add 
		for (const mov of movements) {
			// create empty item
			if (!toR[mov.targetProductInfo.product.id]) {
				toR[mov.targetProductInfo.product.id] = {_amountData: {}, _totalAmount: 0, _reservedData: {}, _returnedData: {}, _incomingData: {}};
			}

			// if reserved negative we save it to specific object before removing from the amount data also
			// TODO maybe have a differente object for the sale transfer
			if (mov.movementType === ProductMovementType.reserveOrIncoming || mov.movementType === ProductMovementType.salePendingTransfer) {
				if (mov.amount > 0) {
					if (!toR[mov.targetProductInfo.product.id]._incomingData[mov.documentLocation])
						toR[mov.targetProductInfo.product.id]._incomingData[mov.documentLocation] = 0;
					toR[mov.targetProductInfo.product.id]._incomingData[mov.documentLocation] += mov.amount;
				}
				else {
					if (!toR[mov.targetProductInfo.product.id]._reservedData[mov.documentLocation]) 
						toR[mov.targetProductInfo.product.id]._reservedData[mov.documentLocation] = 0;
					toR[mov.targetProductInfo.product.id]._reservedData[mov.documentLocation] -= mov.amount;
				}

				if (getBackEndSum)
					continue;
			}
			// defect
			else if (mov.movementType === ProductMovementType.brokenItem) {
				if (!toR[mov.targetProductInfo.product.id]._returnedData[mov.documentLocation])
					toR[mov.targetProductInfo.product.id]._returnedData[mov.documentLocation] = 0;

				toR[mov.targetProductInfo.product.id]._returnedData[mov.documentLocation] -= mov.amount;
			}

			// we dont add to the available stock the ones that are incoming (internal order)
			if (mov.amount > 0 && mov.movementType === ProductMovementType.reserveOrIncoming)
				continue;

			if (!toR[mov.targetProductInfo.product.id]._amountData[mov.documentLocation])
				toR[mov.targetProductInfo.product.id]._amountData[mov.documentLocation] = 0;

			toR[mov.targetProductInfo.product.id]._amountData[mov.documentLocation] += mov.amount;
			toR[mov.targetProductInfo.product.id]._totalAmount += mov.amount;
		}

		// delete location with 0 amounts
		for (const id in toR)
			for (const k in toR[id])
				if (typeof toR[id][k] === 'object')
					for (const locId in toR[id][k])
						if (!toR[id][k][locId])
							delete toR[id][k][locId];

		return toR;
	}

	// SHOULD WE ? i dont think so
	// TODO find out ?
	// /**
	//  * We notify the relative products of the change too
	//  */
	// static onCrudAction(req: Request, type: CrudType, modelClass: ModelClass, ids: string[]) {
		
	// 	new ProductMovementController().findForUser(req, {_id: {$in: ids.map(k => new ObjectId(k))}}, {skipFilterControl: true})
	// 	.then(movs => {
	// 		const targetProdIds = movs.map(m => m.targetProductInfo.product.id);
	// 		CrudUpdatesService.emitUpdate(req, 'update', ModelClass.Product, targetProdIds);
	// 	});

	// 	AbstractDbApiItemController.onCrudAction(req, type, modelClass, ids);
	// }

}



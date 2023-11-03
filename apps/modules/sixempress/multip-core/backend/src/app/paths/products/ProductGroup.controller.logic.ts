import { ControllersService, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue, DeleteResult, Error403, Error404, Error500, FetchableField, FindDbOptions, FindOneDbOptions, InsertResult, ObjectUtils, PatchOperation, PatchOptions, PatchResult, ReplaceOptions, ReplaceResult, RestoreDeletedOptions, SaveOptions } from "@sixempress/main-be-lib";
import { ModelClass } from '../../utils/enums/model-class.enum';
import { Request } from "express";
import { Product } from "./Product";
import { AdditionalFindOptions, ProductGroup, ProductGroupNoAmounts, ProductGroupWithAmount } from "./ProductGroup";
import { Filter, ObjectId, UpdateOptions } from "mongodb";
import to from "await-to-js";
import { TrackableVariationController } from "../../utils/trackable-variations/TrackableVariation.controller";
import { ErrorCodes } from "../../utils/enums/error.codes.enum";
import { ProductMovement, ProductMovementType } from "./product-movements/ProductMovement";
import { ProductMovementController } from "./product-movements/ProductMovement.controller";
import { ProductController } from "./Product.controller";
import { PricedRowsController } from "../../utils/priced-rows/priced-rows.controller";
import { PricedRowsModel } from "../../utils/priced-rows/priced-rows.dtd";

/**
 * Contains the save logic of the product group
 */
export abstract class ProductGroupControllerLogic extends TrackableVariationController<ProductGroup> {


	public async findForUser(req: Request, filters: Filter<ProductGroup>, opts: FindDbOptions & AdditionalFindOptions): Promise<ProductGroup[]> {
		return super.findForUser(req, filters, opts);
	}
	
	public async findOneForUser(req: Request, filters: Filter<ProductGroup>, opts: FindOneDbOptions & AdditionalFindOptions): Promise<ProductGroup> {
		opts = {...opts, skipAmountsCalculation: false};
		return super.findOneForUser(req, filters, opts);
	}
	
	// public async saveToDb(req: Request, items: ProductGroup[], options?: SaveOptions & AdditionalSaveOptions): Promise<InsertResult<ProductGroup>> {
	// 	return super.saveToDb(req, items, options);
	// }
	// public async patchSingle(req: Request, objFromBe: ProductGroup, patchOps: PatchOperation<ProductGroup>[], options?: PatchOptions & AdditionalSaveOptions): Promise<PatchResult> {
	// 	return super.patchSingle(req, objFromBe, patchOps, options);
	// }
	// public async replaceItem__READ_DESCRIPTION(req: Request, filter: Filter<ProductGroup>, doc: ProductGroup, options?: ReplaceOptions & AdditionalSaveOptions): Promise<ReplaceResult<ProductGroup>> {
	// 	return super.replaceItem__READ_DESCRIPTION(req, filter, doc, options);
	// }

	protected getGlobalFields(): (keyof ProductGroup)[] { 
		return [
			...super.getGlobalFields(),
			'externalSync',

			// meta data has to be different always
			// as each product variant has it's own remote ID :)
			// '_metaData',
		]
	};

	/**
	 * Used to simply add a variation to a group, and this function does the heavy lifting
	 * 
	 * // TODO urgently rewrite this
	 * 
	 * @warning it updates the _id by reference, so you can use the _id of the product after the function withouth problemo
	 * 
	 * @param replace default true\
	 * if true = replaces the target _id product\
	 * if false = adds the new variation with the same infoData as the target _id
	 */
	public async addNewVariations(req: Request, prods: Pick<Product, '_id' | 'variationData'>[], mode: 'replace' | 'add' | 'replace_withouth_movements') {

		// get items from BE
		const ps: ProductGroupNoAmounts[] = await this.findForUser(
			req, 
			{_id: {$in: prods.map(p => new ObjectId(p._id))}}, 
			{keepAllVariations: true, returnFullGroupOnMatch: true, skipAmountsCalculation: true, skipIdToTrackableId: true}
		);
		const psGidHm: {[pId: string]: ProductGroupNoAmounts} = {};
		for (const pg of ps)
			for (const m of pg.models)
				psGidHm[m._id.toString()] = pg;

		// create hashmap of product_id => new variation
		// as there could me umultiple prodmvos for multiple locations all pointing to the same prod var
		const gIdsHm: {[gId: string]: {[pId: string]: Product}} = {};
		for (const p of prods) {
			const pg = psGidHm[p._id.toString()];
			if (!pg)
				throw new Error404('A product has not been found in the database: "' + p._id + '"');

			if (!gIdsHm[pg._trackableGroupId])
				gIdsHm[pg._trackableGroupId] = {};

			gIdsHm[pg._trackableGroupId][p._id.toString()] = p as Product;
		}

		// create hm
		const buildedGroups = ObjectUtils.arrayToHashmap(ps, '_id');

		// replace or add the new variation to the relative group
		for (const gid in gIdsHm) {
			const groupModles = buildedGroups[gid].models;
			for (const i in gIdsHm[gid]) {

				// check for _id as we delete it later on (happens when we have the same object that we map)
				let relativeProdIdx = groupModles.findIndex(m => ProductGroupControllerLogic.twoVariationAreTheSame(m, gIdsHm[gid][i]));
				const ogIdx = groupModles.findIndex(m => m._id.toString() === gIdsHm[gid][i]._id.toString())

				if (relativeProdIdx === -1)
					relativeProdIdx = ogIdx
				
				const relativeProd = groupModles[relativeProdIdx];
				
				// copy the old ovreriding only the variation
				gIdsHm[gid][i] = { ...relativeProd, variationData: gIdsHm[gid][i].variationData };
				// ensure the target item is not _deleted as later they are filtered
				delete gIdsHm[gid][i]._deleted;

				if (mode === 'replace') {
					groupModles.splice(relativeProdIdx, 1, gIdsHm[gid][i]);
					if (relativeProdIdx !== ogIdx && ogIdx !== -1)
						groupModles.splice(ogIdx, 1);
				}
				else if (mode === 'replace_withouth_movements') {
					// remove the _id so the movements are not moved
					delete gIdsHm[gid][i]._id;
					groupModles.splice(relativeProdIdx, 1, gIdsHm[gid][i]);
					
					if (relativeProdIdx !== ogIdx && ogIdx !== -1)
						groupModles.splice(ogIdx, 1);
				}
				else if (mode === 'add') {
					// remove the _id so the movements are not moved
					delete gIdsHm[gid][i]._id;
					// add only if the variation is not already present
					if (!groupModles.some(m => ProductGroupControllerLogic.twoVariationAreTheSame(gIdsHm[gid][i], m)))
						groupModles.push(gIdsHm[gid][i]);
				}
			}
		}

		// db access in a loop
		// should not be a problem here cause not a lot of modification will go trhough here
		for (const gid in buildedGroups) {
			// remove the deleted items as to not restore them
			buildedGroups[gid].models = buildedGroups[gid].models.filter(m => !m._deleted);
			
			await this.replaceItem__READ_DESCRIPTION(req, {_trackableGroupId: gid}, buildedGroups[gid]);
		}

		const all = await new ProductController().findForUser(req, {_trackableGroupId: {$in: Object.keys(gIdsHm)}});

		this.remapUpdateItemsIds(prods as Product[], all);
	}

	/**
	 * used to update the _id by reference
	 */
	private remapUpdateItemsIds(newItems: Product[], updated: Product[]): void {

		// now we reassing back the needed identifiers
		for (const n of newItems) {
			for (const p of updated) {
				if (ProductGroupControllerLogic.twoVariationAreTheSame(n, p)) {
					n._id = p._id;
					break;
				}
			}
		}
	}

	/**
	 * Deletes the barcodes array as there could be a conflicted if restoring a product taht has a barcode already iser
	 */
	public async restoreDeletedForUser(req: Request, filters: Filter<ProductGroup>, options: RestoreDeletedOptions = {}): Promise<DeleteResult> {
		const items = await this.findItemsToDelete(req, filters, {deleteMulti: options.restoreMulti});
		if (items.length === 0)
				return {deletedCount: items.length};

		const tags: string[] = [];
		const barcodes: string[] = [];
		const allids: ObjectId[] = [];
		
		for (const i of items) {
			tags.push(...(i.groupData.uniqueTags || []));
			for (const m of i.models) {
				barcodes.push(...(i.infoData.barcode || []));
				allids.push(new ObjectId(m._id.toString()));
			}
		}

		//
		// get the info of the codes being used
		//

		const tagsInUse: string[] = [];
		const barcodeInUse: string[] = [];
		const uniqueInUse: Product[] = await this.getCollToUse(req).find({
			_groupDeleted: {$exists: false}, 
			$or: [{'infoData.barcode': {$in: barcodes}}, {'groupData.uniqueTags': {$in: tags}}],
		}).toArray();
		for (const m of uniqueInUse) {
			tagsInUse.push(...(m.groupData.uniqueTags || []))
			barcodeInUse.push(...(m.infoData.barcode || []));
		}


		// restore the items matched while removing the unique codes being used
		const update = await this.getCollToUse<ProductGroup>(req).updateMany(
			{_id: {$in: allids}},
			// remove unique items
			{$unset: {'_groupDeleted': 1}, $pullAll: {'infoData.barcode': barcodeInUse, 'groupData.uniqueTags': tagsInUse}}
		);
		
		return {deletedCount: update.modifiedCount};
	}

	/**
	 * Add additioanl ids (barcode etc)
	 * and verify that they are unique
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request,
		opts: DBSaveOptions<A, ProductGroup>,
		toSave: A extends "insert" ? ProductGroup[] : ProductGroup,
		oldObjInfo: A extends "insert" ? undefined : ProductGroup
	): Promise<DBSaveReturnValue<ProductGroup>> {

		const saveArr = Array.isArray(toSave) ? toSave as ProductGroup[] : [toSave as ProductGroup];

		// check variants
		for (const s of saveArr) {
			if (!this.validateVariants(s.models))
				throw new Error403('A product in the array have invalid variants');

				for (const m of s.models) {
				// add this so later we can check for conflicts in groupData
				m.groupData = s.groupData;
				
				// delete some fields returned from findOne() for patch/put
				delete m._incomingData;
				delete m._reservedData;
				delete m._returnedData;
				delete m._amountData;
				delete m._totalAmount;
			}


			// clear duplicates and same as main category
			if (s.groupData.additionalCategories) {

				// if the main category is not present, it means the user meant to delete the categories
				// but accidentaly forgot the additionals?
				//
				// so we just delete all
				if (!s.groupData.category) {
					delete s.groupData.additionalCategories;
				}
				// else ensure they dont collide
				else {
					const clear: FetchableField<ModelClass.InventoryCategory>[] = [];
					for (const c of s.groupData.additionalCategories)
						if (c && c.id !== s.groupData.category.id && !clear.find(a => a.id === c.id))
							clear.push(c);
						
					s.groupData.additionalCategories = clear;
				}
			}
			
			// remove if no items left
			if (s.groupData.additionalCategories && !s.groupData.additionalCategories.length)
				delete s.groupData.additionalCategories
		}
		
		// check that the tags (if given by the user) are unique
		const tagsConflict = await this.findConflictingUniqueTags(req, saveArr);
		if (tagsConflict.length) 
			throw new Error403({code: ErrorCodes.tagsConflict, message: 'Some products have tags that are already being used in the system', data: tagsConflict});

		// check that the barcode (if given by the user) is unique
		const barcodeConflict = await this.findConflictingBarcodes(req, saveArr);
		if (barcodeConflict.length) 
			throw new Error403({code: ErrorCodes.barcodeConflict, message: 'Some products have barcodes that are already being used in the system', data: barcodeConflict});
	
		// now that we know that the user given barcodes are unique
		// if we later do "checkAutomaticBarocdes" then we know
		// that the system will change only the conflicting barcodes
		// aka barcodes that will be assigned automatically
	
		if (opts.method === 'insert') {
			await this.assignIdentifiers(req, saveArr, undefined);
		}
		else {
			// ensure to get not delete item
			// we use the manual collectoin find() insteand of findForUser()
			// as the findForUser() removes automatically the deleted items
			const oldObjs: Product[] = await this.getCollToUse(req).find({_trackableGroupId: oldObjInfo._trackableGroupId}).toArray();
			await this.assignIdentifiers(req, saveArr, oldObjs);
		}


		// as when we insert/update a product group, we dont know if the _id will change or not
		// we save the variationData and the movs to set out here
		// so once we insert/update the product, we can get the target _id by comparing the variationData
		const prodMovs: {gid: string, vData: Product['variationData'], movs: Omit<ProductMovement, 'targetProductInfo'>[]}[] = [];
		
		for (const s of saveArr) {
			for (const m of s.models) {
				if (m.setAmount) {
					// add only if there is really data, as later avoid doing extra ops
					// just by cheking prodMovs.length
					if (Object.keys(m.setAmount).length) {
						prodMovs.push({ 
							gid: s._trackableGroupId,
							vData: m.variationData, 
							movs: Object.keys(m.setAmount).map(locId => ({
								amount: m.setAmount[locId],
								movementType: ProductMovementType.manualChange,
								documentLocation: locId,
								documentLocationsFilter: [locId],
							}))
						});
					}

					// clear for save
					delete m.setAmount;
				}
			}
		}


		const saved = await super.executeDbSave(req, opts, toSave, oldObjInfo);
		
		// now that the items are saved, we can refetch the builded group and diff the deside prodAmounts and the current
		// and we save the objects
		if (prodMovs.length) {
			const targetIds: string[] = opts.method === 'insert' 
				? saved.ops.map(s => s._trackableGroupId) 
				: [(toSave as ProductGroup)._trackableGroupId]
			
			// find for user as to build the product group
			// and also get the _amountData
			const updatedItems: ProductGroupWithAmount[] = await this.findForUser(
				req, 
				{_trackableGroupId: {$in: targetIds}}, 
				{skipFilterControl: true, skipAmountsCalculation: false, keepAllVariations: true},
			);
			const gidHm = ObjectUtils.arrayToHashmap(updatedItems, '_id');

			// build the missing data
			const buildedPMovs: ProductMovement[] = [];
			for (const p of prodMovs) {
				const relativeSavedVar = gidHm[p.gid].models.find(m => ProductGroupControllerLogic.twoVariationAreTheSame(m, {variationData: p.vData}));

				for (const m of p.movs as ProductMovement[]) {
					m.amount = m.amount - (relativeSavedVar._amountData[m.documentLocation] || 0);
					m.targetProductInfo = { product: new FetchableField(relativeSavedVar._id, ModelClass.Product) };
					buildedPMovs.push(m);
				}
			}

			// TODO we use to() as to not throw on error ? should we throw ?
			if (buildedPMovs.length)
				await to(new ProductMovementController().saveToDb(req, buildedPMovs));

		}


		return saved;
	}

	/**
	 * move the product amounts from old models to new models
	 */
	protected postUpdate = async (req: Request, generatedFromHm: {[from_id: string]: Product}, oldItems: Product[]) => {
		
		const prodMovController = new ProductMovementController();
		const updateStockInfo = await this.generateAutoTransferInfo(req, generatedFromHm, oldItems);

		// update the amountData
		if (updateStockInfo.create) 
			await prodMovController.saveToDb(req, updateStockInfo.create, {allowAllLocations: true});


		// update the existing incoming stock
		if (updateStockInfo.update.fromIds.length) {
			
			const baseMovFilter: Filter<ProductMovement> = {
				movementType: ProductMovementType.reserveOrIncoming, 
				'_generatedFrom.modelClass': {$in: [ModelClass.InternalOrder, ModelClass.TransferOrder]},
			};

			const incomingMovToUpdate = await prodMovController.findForUser(
				req,
				{...baseMovFilter, 'targetProductInfo.product.id': {$in: updateStockInfo.update.fromIds}},
				{skipFilterControl: true}
			);

			// incoming movs could be zero
			if (incomingMovToUpdate.length) {
				// update the movements themselves
				await prodMovController.getCollToUse(req).bulkWrite(updateStockInfo.update.fromIds.map(i => ({
					updateMany: {
						filter: {...baseMovFilter, 'targetProductInfo.product.id': i},
						update: {$set: {'targetProductInfo.product.id': updateStockInfo.update.mapIds[i]}},
					}
				})));
	
				// sort by model class
				const byModelClass: {[modelClass: string]: {[id: string]: ObjectId}} = {};
				for (const m of incomingMovToUpdate) {
					if (!byModelClass[m._generatedFrom.modelClass])
						byModelClass[m._generatedFrom.modelClass] = {};
	
					byModelClass[m._generatedFrom.modelClass][m._generatedFrom.id] = new ObjectId(m._generatedFrom.id);
				}
	
				// execute the update on the genearted from items
				for (const model in byModelClass) {
					const controller = ControllersService.getInfoByModelClass(model);
					const c = new (controller.controller as any)() as PricedRowsController<any>;
					const nin = [...c.modelStatus.fail, ...c.modelStatus.success, ...c.modelStatus.successPrePay];
	
					await c.getCollToUse(req).updateMany(
						{_id: {$in: Object.values(byModelClass[model])}, status: {$nin: nin}, _generatedFrom: {$exists: false}}, 
						{$set: updateStockInfo.update.updateSet},
						{arrayFilters: updateStockInfo.update.updateFilter},
					);
				}
			}
		}

	}

	private async generateAutoTransferInfo(req: Request, generatedFromHm: {[from_id: string]: Product}, oldItems: Product[]) {
		
		const prodMovController = new ProductMovementController();

		// get current amount infos by cloning the old items
		// as to not interfere with logic becuase the calculate function assign fields by reference
		oldItems = ObjectUtils.cloneDeep(oldItems);
		await prodMovController.calculateRealProductsAmount(req, oldItems, undefined, true);
		
		// create hm for easier access
		const oldItemHm: {[id: string]: Product} = ObjectUtils.arrayToHashmap(oldItems, '_id');
		const moveCurrentStock: ProductMovement[] = [];
		const moveIncomingStock: {
			fromIds: string[],
			mapIds: {[oldId: string]: string},
			updateSet: Filter<PricedRowsModel<any>>,
			updateFilter: UpdateOptions['arrayFilters'],
		} = {
			fromIds: [], 
			mapIds: {}, 
			updateSet: {}, 
			updateFilter: [
				{'list.products': {$exists: true}},
			],
		};

		for (const id in generatedFromHm) {
			const oldProd = oldItemHm[id];
			const newProd = generatedFromHm[id];
			
			if (!ProductGroupControllerLogic.willMoveAmountOnSave(oldProd, newProd))
				continue;

			for (const locId in oldProd._amountData) {

				// remove from old
				moveCurrentStock.push({
					amount: -oldProd._amountData[locId],
					documentLocation: locId,
					documentLocationsFilter: [locId],
					movementType: ProductMovementType.moveStockOnProductChange,
					targetProductInfo: {
						productsGroupId: oldProd._trackableGroupId,
						product: new FetchableField(oldProd._id.toString(), ModelClass.Product,),
					}
				});
	
				// add to new
				moveCurrentStock.push({
					amount: oldProd._amountData[locId],
					documentLocation: locId,
					documentLocationsFilter: [locId],
					movementType: ProductMovementType.moveStockOnProductChange,
					targetProductInfo: {
						productsGroupId: generatedFromHm[id]._trackableGroupId,
						product: new FetchableField(generatedFromHm[id]._id.toString(), ModelClass.Product),
					}
				});
			}

			// generate update incoming
			moveIncomingStock.mapIds[id] = newProd._id.toString();
			moveIncomingStock.fromIds.push(id);
			moveIncomingStock.updateSet['list.$[list].products.$[id' + id + '].item.id'] = newProd._id.toString();
			moveIncomingStock.updateFilter.push({['id' + id + '.item.id']: id});
		}

		return {create: moveCurrentStock, update: moveIncomingStock};
	}

	/**
	 * This checks if the two product variation data is different by some fields that do not affect remainings
	 * @param oldProd Old Product model
	 * @param newProd New Product model
	 */
	public static willMoveAmountOnSave(oldProd: Product, newProd: Product): boolean {
		// sellPrice or variant name we can ignore them
		const diff: Product['variationData'] = ObjectUtils.objectDifference(
			{...oldProd.variationData, sellPrice: 0, variants: oldProd.variationData.variants.map(v => v.value.toLowerCase())}, 
			{...newProd.variationData, sellPrice: 0, variants: newProd.variationData.variants.map(v => v.value.toLowerCase())}, 
		);

		return !diff;
	}

	/**
	 * Now that we know which item is from where, we can reassing properly _approxData because we lost the fields as they are forced on assignIdentifiers
	 */
	protected createUpdatedItems(req: Request, newItems: Product[], beItems: Product[]): {items: Product[], generatedFromHm: {[id: string]: Product}} {
		const tor = super.createUpdatedItems(req, newItems, beItems);
		for (const i of tor.items) {
			if (i._id) {
				const relativeItem = beItems.find(p => i._id.toString() === p._id.toString());
				i._approximateAmountData = relativeItem._approximateAmountData;
				i._approximateTotalAmount = relativeItem._approximateTotalAmount;
			}
		}
		return tor;
	}

	/**
	 * Assigns different identifiers to the products to save
	 * @param beProds the array of all the models in the backend (deleted too)
	 * pass this parameter only if doing a modification, not a save
	 */
	private async assignIdentifiers(req: Request, pgs: ProductGroup[], beProds?: Product[]) {

		if (beProds && pgs.length !== 1)
			throw new Error500("Cannot assign identifiers to more than one ProductGroup if the oldObjects are present");

		for (const pg of pgs) {
			
			// assign immediately the old groupid or a new one
			//
			// we assign immediately a new one here instead of passing undefined to trackable variation
			// as we will need the gId for faster prod movs set
			pg._trackableGroupId = pg._trackableGroupId || (pg._id && pg._id.toString()) || new ObjectId().toString();

			for (const prod of pg.models) {
				prod._trackableGroupId = pg._trackableGroupId;
				prod.groupData = pg.groupData;

				if (typeof prod._approximateAmountData === 'undefined') {
					prod._approximateAmountData = {};
				}
				if (typeof prod._approximateTotalAmount === 'undefined') {
					prod._approximateTotalAmount = 0;
				}
				
			}
		}

		const totalToSave = pgs.reduce((car, pg) => car += pg.models.length, 0);
		// count the products for the barcode offset
		// count directly on coll to avoid visibliity filters
		// as we need the number for the offset of the barcode
		const increment = await this.getNextIncrementalValue(req, totalToSave);
		const currCount = increment - totalToSave;


		// assign barcodes
		const differeBarcodeVariants: false | 'eachVariation' | 'eachVariant' = 
			req.qs.variantsDifferentBarcode === 'false' 
				? false 
				: req.qs.variantsDifferentBarcode as string as any || 'eachVariant';

		await this.assignProductIdentifiers(currCount, pgs, differeBarcodeVariants, beProds);
		
		// check that the identifiers don't collide
		await this.checkAutomaticBarcodes(req, pgs, currCount);

	}

	/**
	 * A function that sets the identifiers for a product
	 * 
	 * @param prodInBeCount used to generate automatic barcode\
	 * should be passed as a result of getNextIncrementalValue()
	 * @param pgs the products groups array\
	 * !!NOTE read param oldObjs
	 * @param barcodeDifferentMode how the barcode logic is assigned
	 * @param beProds if passed, then it will only work with the first feProd\
	 * used to assign the eachVariant barcode properly
	 */
	private async assignProductIdentifiers(prodInBeCount: number, pgs: ProductGroup[], barcodeDifferentMode: false | 'eachVariation' | 'eachVariant', beProds?: Product[]) {

		const arr = beProds ? [pgs[0]] : pgs;
		for (let j = 0; j < arr.length; j++) {

			// prevent from overflowing by increasing only when needed
			// check test it("expect the barcodes to be generated properly from the start");
			const groupBarcode = !barcodeDifferentMode && ProductGroupControllerLogic.generateAutoBarcode(prodInBeCount++);
			const feProds = arr[j].models;

			// an array where the product info was already created
			// used to restore the product info a prod withouth them
			const completedProducts = beProds ? [...beProds] : [];
			// sort with the newest _created._timestamp as the first
			// this way later when we chose the barcode we will pick the latest
			completedProducts.sort((a, b) => b._created._timestamp - a._created._timestamp);

			for (let i = 0; i < feProds.length; i++) {
				const prod = feProds[i];
	
				// assign barcode
				if (!prod.infoData.barcode || prod.infoData.barcode.length === 0) { 

					// start with base barcode
					prod.infoData.barcode = !barcodeDifferentMode 
						? [groupBarcode]
						: [ProductGroupControllerLogic.generateAutoBarcode(prodInBeCount++)];
	
					// restore equal barcode
					if (barcodeDifferentMode === 'eachVariant') {
						const equal = completedProducts.find(p => ProductGroupControllerLogic.twoVariantsAreSame(prod.variationData.variants, p.variationData.variants));
						if (equal) 
							prod.infoData.barcode = equal.infoData.barcode;
					}
				}
	
				// clear the description pls
				if (!prod.groupData.description) 
					delete prod.groupData.description;
	
				// add the prod to the info array
				completedProducts.push(prod);
			}
	
		}

	}

	/**
	 * Checks that the barcodes assigned automatically are unique in the system, and no duplicates exists
	 * If it finds duplicates, it creates new codes
	 * 
	 * // TODO instead of recrusevly querying, maybe we do a big get of all the barcodes and in memory we generate till there is no conflict ??
	 * 
	 * @param productsColl The collection where to search the items, is given the collections instead of the controller, as the check should occur on every possible modelClass
	 */
	private	async checkAutomaticBarcodes(req: Request, pgs: ProductGroup[], prodInBeCount: number, timesIter = 1): Promise<boolean> {
		const conflicts = await this.findConflictingBarcodes(req, pgs);

		// no conficlts
		if (!conflicts.length) 
			return true;

		// reassing the conflicting barcodes
		for (const g of pgs) {
			const feProds = g.models;
			for (let i = 0; i < feProds.length; i++) {
				const prod = feProds[i];
	
				for (let j = 0; j < prod.infoData.barcode.length; j++)
					if (conflicts.includes(prod.infoData.barcode[j]))
						prod.infoData.barcode[j] = ProductGroupControllerLogic.generateAutoBarcode((1 + prodInBeCount + i) * timesIter);
	
			}
		}

		if (timesIter > 100) 
			throw new Error500("Possible checkAutomatiBarcodes() loop");

		// recursive check to see if the newly assigned codes are unique
		return this.checkAutomaticBarcodes(req, pgs, prodInBeCount, ++timesIter);
	}

	/**
	 * Takes the given prodcuts barcodes and searches them in the Backend
	 */
	private async findConflictingBarcodes(req: Request, pgs: ProductGroup[]): Promise<string[]> {
		return this.findConflicting(req, pgs, 'barcode');
	}

	private async findConflictingUniqueTags(req: Request, pgs: ProductGroup[]): Promise<string[]> {
		return this.findConflicting(req, pgs, 'uniqueTags');
	}

	/**
	 * Finds conflicts of other unique values
	 */
	private async findConflicting(req: Request, pgs: ProductGroup[], type: 'barcode' | 'uniqueTags') {

		const path = type === 'barcode' ? 'infoData.barcode' : 'groupData.uniqueTags';
		const conflicts: string[] = [];
		const orQueries: Filter<ProductGroup>['$or'] = [];

		for (const pg of pgs) {
			
			// all the elements that have to be checked
			const allElements: string[] = [];

			// create an array of all the elemnts to check
			for (const m of pg.models) {
				for (const b of (ObjectUtils.getValueByDotNotation(m, path) || [])) {
					allElements.push(b);

					// search for currently saving groups conflicts
					for (const q of orQueries)
						if (q[path].$in.includes(b))
							conflicts.push(b);
				}
			}

			// add or query for db check
			if (allElements.length)
				orQueries.push(
					pg._trackableGroupId
						? {_groupDeleted: {$exists: false}, [path]: {$in: allElements}, _trackableGroupId: {$ne: pg._trackableGroupId}}
						: {_groupDeleted: {$exists: false}, [path]: {$in: allElements}}
				);
		}

		// quick check for currently saving items
		if (conflicts.length) 
			return conflicts;
		
		if (orQueries.length === 0)
			return [];

		// db check
		const objs: Product[] = await this.getCollToUse(req).find({$or: orQueries}).toArray();
		for (const o of objs) 
			conflicts.push(...ObjectUtils.getValueByDotNotation(o, path));

		// return items
		return conflicts;
	}

	/**
	 * Generates a barcode to assign automatically
	 */
	private static generateAutoBarcode(prodCount: number) {
		// create progressive ean 12 chars
		// prefix with one as some barcode readers ignore the first 0
		const barcodeToCalc = "1" + prodCount.toString().padStart(11, '0');
		// add the check digit
		const barcode = barcodeToCalc + this.eanCheckDigit(barcodeToCalc);
		return barcode;
	}

	/**
	 * Returns the check digit for an EAN barcode
	 */
	private static eanCheckDigit(s: string): number {
		let result = 0;
		for (let counter = s.length - 1; counter >= 0; counter--)
			result = result + parseInt(s.charAt(counter)) * ( 1 + ( 2 * (counter % 2)));

		return (10 - (result % 10)) % 10;
	}

	/**
	 * checks if two variations are the same
	 */
	public static twoVariantsAreSame(vars: Product['variationData']['variants'], vars2: Product['variationData']['variants']): boolean {
		if (vars.length !== vars2.length) 
			return false;

		const diff = ObjectUtils.objectDifference(
			vars.map(v => ({name: v.name.toLowerCase(), value: v.value.toLowerCase()})),
			vars2.map(v => ({name: v.name.toLowerCase(), value: v.value.toLowerCase()}))
		);

		return !diff;
	}

	/**
	 * checks if the variation AND the sell price are equal withouth checking other fields (like buyPrice, supplier etc)
	 * @param vars the first product
	 * @param vars2 the second product
	 */
	public static twoSaleableVariationsAreEqual(vars: {[A in keyof Pick<Product, 'variationData'>]: Pick<Product['variationData'], 'sellPrice' | 'variants'>}, vars2: {[A in keyof Pick<Product, 'variationData'>]: Pick<Product['variationData'], 'sellPrice' | 'variants'>}): boolean {
		return vars.variationData.sellPrice === vars2.variationData.sellPrice && ProductGroupControllerLogic.twoVariantsAreSame(vars.variationData.variants, vars2.variationData.variants)
	}

	/**
	 * Ensures that all products have the same variations length and the var names at the same index
	 */
	private	validateVariants(products: Product[]): boolean { 	

		// get the first item available
		const nonDeleted = products.find(p => !p._deleted);
		const barsVars = (nonDeleted || products[0]).variationData.variants;

		for (const prod of products) {
			if (prod._deleted) 
				continue;

			// same amount of variants
			if (prod.variationData.variants.length !== barsVars.length) 
				return false;

			// check that all the variants have the same name and name order
			for (let i = 0; i < prod.variationData.variants.length; i++)
				if (prod.variationData.variants[i].name !== barsVars[i].name) 
					return false;

		}

		// validated
		return true;
	}

}
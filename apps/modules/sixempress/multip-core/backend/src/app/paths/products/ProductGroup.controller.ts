import { AbstractDbApiItemController, AuthHelperService, CrudType, CustomExpressApp, Error401, FetchableField, FindDbOptions, FindOneDbOptions, IDtdTypes, IVerifiableItemDtd, IVerifiableItemDtdStatic, MongoUtils, ObjectUtils, RequestHandlerService, } from "@sixempress/main-be-lib";
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { Request } from "express";
import { Product } from "./Product";
import { ProductController } from "./Product.controller";
import { AdditionalFindOptions, ProductGroup } from "./ProductGroup";
import { Filter, FindOptions } from "mongodb";
import { ProductMovementController } from "./product-movements/ProductMovement.controller";
import { ProductGroupControllerLogic } from "./ProductGroup.controller.logic";
import { MultipleModelTrackableVariation } from "../../utils/trackable-variations/TrackableVariation";

/**
 * Contains the get logic of the product
 */
export class ProductGroupController extends ProductGroupControllerLogic {

	modelIsMultiple = true;
	requireDocumentLocation = false;

	/**
	 * the model class is used by the ControllerService to fetch etc
	 * so for that purpose we need to use the real ProductController
	 * 
	 * thus here we create an "alias" ?
	 */
	modelClass = ModelClass.ProductGroup;
	collName = ModelClass.Product;
	bePath = BePaths.products;

	Attributes = {
		view: Attribute.viewProducts,
		add: Attribute.addProducts,
		modify: Attribute.modifyProducts,
		delete: Attribute.deleteProducts,
	};

	/**
	 * Temporarly replace the modelclass for the correct crud emit
	 */
	public getCollToUse(req: Request) {
		this.modelClass = ModelClass.Product;
		const tor = super.getCollToUse(req);
		this.modelClass = ModelClass.ProductGroup;
		return tor;
	}

	dtd: IVerifiableItemDtdStatic<ProductGroup> = {
		groupData: new ProductController().getDtd().groupData as IDtdTypes<Product['groupData']>,
		
		models: { type: [Array], required: true, arrayDef: { type: [Object], minArrN: 1, objDef: [
			new ProductController().getDtd()
		] } },

	};

	public async findForUser(req: Request, filters: Filter<ProductGroup>, opts: FindDbOptions & AdditionalFindOptions): Promise<ProductGroup[]> {
		const skipCalc = String(req.qs.calculateAmounts) !== String(true);
		return super.findForUser(req, filters, {skipAmountsCalculation: skipCalc, ...opts});
	}
	
	public async findOneForUser(req: Request, filters: Filter<ProductGroup>, opts: FindOneDbOptions & AdditionalFindOptions): Promise<ProductGroup> {
		return super.findOneForUser(req, filters, {skipAmountsCalculation: false, ...opts});
	}

	/**
	 * it aggeragets the prduct to productgroups\
	 * this function is used as find() for the productgroups
	 */
	protected async getGroupedModels<M extends 'find' | 'findOne' | 'count'>(req: Request, mode: M, filtersToUse: Filter<ProductGroup>, opts: FindOptions<ProductGroup>, allopts: AdditionalFindOptions): Promise<M extends 'count' ? number : ProductGroup[]> {

		this.remapFilterFields(filtersToUse, allopts.skipIdToTrackableId);

		// TODO transform this into something like:
		// {$match: filtersToUse}
		// {$group: {_id: '', gids: {$push: '$_trackableGroupId'}}}
		// {$match: {_trackableGroupId: {$in: '$gids'}}}
		if (allopts.returnFullGroupOnMatch) {
			const ids = (await this.getRawCollection(req).find(filtersToUse).toArray() as Product[]).map(i => i._trackableGroupId);
			filtersToUse = {_trackableGroupId: {$in: ids}};
		}

		// create the aggregate instructions
		const pipeline: object[] = [
			// we filter BEFORE the group
			// as to allow the user to execute search on products models
			// and then build the groups based on the models
			//
			// technically we could remodel the frontend by making the queries point to "models.{field}"
			// TODO the stuff above
			{$match: filtersToUse},
			// the group contains various fields
			// because we use those fields to sort the results
			{$group: {
				_id: '$_trackableGroupId',
				
				// TODO fix _approximateTotalAmount that is off as it counts negative amounts of products non present ?
				_approximateTotalAmount: {$sum: "$_approximateTotalAmount"},
				models: {$push: '$$ROOT'},
				
				// get the first items so that the user can sort by those fields
				...this.getGlobalFields().reduce((car, cur) => {
					car[cur] = {$first: "$" + cur};
					return car;
				}, {}),
	
				// ensure that no matter the query, at least 1 not deleted item is present
				//
				// for example:
				// if i search for all the items with "no quantity"/"negative quantity" left,
				// and the only resulting product is a deleted variation, then this prevents the product group
				// from being generated from that variation, as that would be an error
				//
				// also as a bonus it kind of does what _groupDeleted does, but on a query level
				_totalDeleted: { $sum: {$cond: { if: "$_deleted", then: 1, else: 0} } },
				_totalItems: { $sum: 1 },
			}},
	
			// filter the fields about the deleted stuff
			{ $addFields: {
				_cmp_value: {$cmp: ["$_totalDeleted", "$_totalItems"]},
			} },
			{ $match: {
				_cmp_value: {$ne: 0},
			} },
		]

		// replace the filters if some special fields were triggered
		const data = this.createAfterGroupFilters(filtersToUse);
		if (data) {
			pipeline[0] = {$match: data.before};
			pipeline.splice(2, 0, { $match: data.after });
		}

		// don't add projections, as we project manually later
		if (opts.sort) { pipeline.push({$sort: opts.sort});  }
		if (opts.skip) { pipeline.push({$skip: opts.skip}); }
		if (opts.limit) { pipeline.push({$limit: opts.limit});  }

		// if the approxTotal is fitlered, and the user cant access all fields, then ovverride the apporxTotal
		// with the value that is summed from the location that the user can access
		//
		// TODO add this logic even when the user SORTS by the _approximateTotalAmount
		if (filtersToUse._approximateTotalAmount) {
			const authz = AuthHelperService.getAuthzBody(req);
			if (!authz) throw new Error401('Expected Authorization Token not Authentication');

			const locs = authz.locs;
			// if the user cant access every location available
			if (!locs.includes('*')) {
				// add it BEFORE the filter
				// as the filter will work with this field
				pipeline.unshift(
					{$addFields: {
						_approximateTotalAmount: {$sum: locs.map(l => "$_approximateAmountData." + l)}
					}}
				);
			}
		}

		// get, clear, yeet
		// ;]

		const calculateAmount = allopts.skipAmountsCalculation === false;
		const project = !calculateAmount && opts.projection;
		if (project)
			pipeline.push({$project: MongoUtils.mergeProjection(project, {'models._deleted': 1})}); // get always deleted so we can filter them out

		if (mode === 'count')
			pipeline.push({ $count: '__count' });

		const aggRes = await this.getCollToUse(req).aggregate(pipeline, {collation: {locale: 'en_US'}}).toArray() as ProductGroup[];

		if (mode === 'count')
			return (aggRes[0] as any)?.__count || 0 as M extends 'find' ? ProductGroup[] : number;

		if (String(req.qs.keepAllVariations) === 'true')
			allopts.keepAllVariations = true;
		await this.updateProductsFields(req, aggRes, allopts.keepAllVariations !== true, calculateAmount, opts.projection);

		return aggRes as M extends 'count' ? number : ProductGroup[];
	}

	/**
	 * Creates filters to use after the $group, for example _approximeate total amount
	 */
	private createAfterGroupFilters(f: Filter<ProductGroup>): undefined | {after: Filter<ProductGroup>, before: Filter<ProductGroup>} {


		const path = this.recursiveFieldSearch(f, '_approximateTotalAmount');
		if (!path) return
		
		// we clone the filters and replace them as to not delete the field by reference
		// as doing so would alter the count()
		const cloned = ObjectUtils.cloneDeep(f);
		
		// delete the key value
		if (!path.includes('.')) {
			delete cloned[path];
		}
		else {
			const split = path.split('.');
			let o = cloned;
			for (let i = 0; i < split.length - 1; i++)
				o = o[split[i]];

			delete o[split[split.length - 1]];
		}

		return {
			before: cloned, 
			after: { _approximateTotalAmount: ObjectUtils.getValueByDotNotation(f, path), }
		}

	
		// // TODO fix this workaround in the future ?
		// // when we filter by _approximateTotalAmount, we need to filter on the grouped product
		// // not on the direct model, else we take error
		// if (typeof filtersToUse._approximateTotalAmount !== 'undefined') {
		// 	const modified = ObjectUtils.cloneDeep(filtersToUse)
		// 	delete modified._approximateTotalAmount;
		// 	pipeline[0] = {$match: modified};

		// 	// we add after the group
		// 	pipeline.splice(2, 0, {
		// 		$match: { _approximateTotalAmount: filtersToUse._approximateTotalAmount }
		// 	});
		// }

	}

	private recursiveFieldSearch(o: object, f: string, path: string = ''): string | void {
		for (const k in o) {
			if (k === f)
				return path ? path + '.' + k : k;

			if (typeof o[k] === 'object') {
				const p = this.recursiveFieldSearch(o[k], f, path ? path + '.' + k : k);
				if (p) return p;
			}
		}
	}

	// /**
	//  * checks if the the filters given are _groupDeleted: {$exists: false} or undefined
	//  */
	// private filterKeepsDeleted(filter: Filter<ProductGroup>): boolean {

	// 	for (const k in filter) {
	// 		if (k === '_groupDeleted') {
	// 			// nullish value so it wont match anything as _groupDeleted: false|null|undefined does not exist
	// 			// or if a primitive still won't match anything
	// 			if (!filter[k] || typeof filter[k] !== 'object') { 
	// 				return false; 
	// 			}
	// 			// check if object is {$exists: false};
	// 			else {
	// 				// if we expect the field to not exists that means we dont keep the deleted
	// 				if (filter[k]['$exists'] === false) {
	// 					return false;
	// 				}
	// 				// else if it's another type of object then we keep them deleted
	// 				else {
	// 					return true;
	// 				}
	// 			}
	// 		}
	// 	}

	// 	// no _groupDeleted key found so the items are not filtered for deleted
	// 	return true;
	// }

	/**
	 * Updates the fields like amounts, removes fields with no attributes
	 * and add projections
	 */
	private async updateProductsFields(req: Request, aggRes: ProductGroup[], removeDeleted: boolean, calculateAmounts: boolean, projection?: any) {
		

		// temp solution to avoid calculating amount for count() operations
		if (projection && Object.keys(projection).length === 1 && projection['_id'] === 1) {
			// do nothing
		} 
		else if (calculateAmounts) {
			await new ProductMovementController().calculateAmountInProdsForUser(req, aggRes.reduce((car, cur) => car.push(...cur.models) && car, []))
		}

		for (let j = 0; j < aggRes.length; j++) {
			const agg = aggRes[j];
			
			// remove teh extra fields added in aggregation
			delete (agg as any)._totalDeleted;
			delete (agg as any)._totalItems;
			delete (agg as any)._cmp_value;
			
			// set total amount
			agg._totalAmount = 0;
			for (let i = 0; i < agg.models.length; i++) {
				const prod = agg.models[i];

				// remove the deleted products with no amount left
				if (removeDeleted && prod._deleted && !this.areMovsPresent(prod)) {
					agg.models.splice(i--, 1); 
					continue;
				}

				// add to the group total
				agg._totalAmount += prod._totalAmount || 0;
			}

		}

		// remap the main fields after removal of _deleted products
		this.remapGroupFields(aggRes as MultipleModelTrackableVariation<any, any>[]);
		
		// final clear
		ProductGroupController.clearProductsAttributes(req, aggRes);
		if (projection) 
			MongoUtils.manualProjection(aggRes, projection);
	}

	private areMovsPresent(prod: Product) {
		for (const f of (['_amountData', '_reservedData', '_returnedData', '_incomingData'] as (keyof Product)[])) 
			if (prod[f])
				for (const k in prod[f as keyof ProductGroup])
					if (typeof prod[f][k] === 'number' && prod[f][k] !== 0)
						return true;
		return false;
	}


	/**
	 * Removes not permitted fields from the product groups
	 */
	private static clearProductsAttributes(req: Request, pgs: (ProductGroup | Product)[]) {
		for (const p of pgs) { 

			if (p.groupData) {
				if (!AuthHelperService.isAttributePresent(Attribute.viewInventoryCategories, req)) { delete p.groupData.category };
			}
			
			if (p.variationData) {
				if (!AuthHelperService.isAttributePresent(Attribute.viewSuppliers, req)) { delete p.variationData.supplier };

				if (!AuthHelperService.isAttributePresent(Attribute.viewProductBuyPrice, req)) { delete p.variationData.buyPrice; }
				if (!AuthHelperService.isAttributePresent(Attribute.viewProductSellPrice, req)) { delete p.variationData.sellPrice; }
			}


			// recursvie clear models
			if ((p as ProductGroup).models)
				ProductGroupController.clearProductsAttributes(req, (p as ProductGroup).models);

		}
	}

	/**
	 * Notify external sync of changes
	 */
	public static onCrudAction(req: Request, type: CrudType, modelClass: ModelClass, ids: string[]) {
		// console.log('hello', ids);

		// i am calling you father, as thou requested me
		AbstractDbApiItemController.onCrudAction(req, type, modelClass, ids);
	}

}
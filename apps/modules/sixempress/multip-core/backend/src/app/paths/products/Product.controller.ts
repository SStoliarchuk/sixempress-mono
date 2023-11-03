import { Request } from 'express';
import { AbstractDbApiItemController, CustomExpressApp, RequestHandlerService, AuthHelperService, Error500, FetchableField, DBGetOptions, DBGetReturnValue, DBGetOptionsMethods, IVerifiableItemDtd, IDtdTypes } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { Filter } from 'mongodb';
import { Product } from './Product';
import { ProductMovementController } from './product-movements/ProductMovement.controller';

/**
 * This conrtoller should be used only for detailed products get. if you want to add/modify a product
 * then use the productgroup controller
 */
export class ProductController extends AbstractDbApiItemController<Product> {

	modelClass = ModelClass.Product;
	collName = ModelClass.Product;
	bePath = BePaths.productdetails;

	Attributes = { view: Attribute.viewProducts, add: 0, modify: 0, delete: 0 };

	/**
	 * Out here so it can be referenced by the priced rows model
	 */
	public static variationDataDtd: IDtdTypes<Product['variationData']> = { type: [Object], required: true, objDef: [{
		supplier: FetchableField.getFieldSettings(ModelClass.Supplier, false),
		buyPrice: { type: [Number], required: true, minMaxNumber: [{min: 0}], },
		sellPrice: { type: [Number], required: true, minMaxNumber: [{min: 0}], },
		variants: { type: [Array], required: true, arrayDef: { type: [Object], objDef: [{
			// we cannot have "0" as name, because woocommerce does not support "0" as attribute name... what..
			// name: { type: [String], required: true, regExp: /^(?!0$)/i },
			name: { type: [String], required: true, },
			value: { type: [String], required: true, },
		}] } }
	}] };

	dtd: IVerifiableItemDtd<Product> = {

		setAmount: { type: [Object], required: false, objDef: [Number] },

		groupData: { type: [Object], required: true, objDef: [{
			type: { type: [Number, String], required: true },
			name: { type: [String], required: true, },
			description: { type: [String], required: false, },
			category: FetchableField.getFieldSettings(ModelClass.InventoryCategory, false),
			additionalCategories: { type: [Array], required: false, arrayDef: { type: [Object], objDef: [FetchableField.getObjDef(ModelClass.InventoryCategory)] } },
			uniqueTags: { type: [Array], required: false, arrayDef: { type: [String] } },
			tags: { type: [Array], required: false, arrayDef: { type: [String] } },
			internalTags: { type: [Array], required: false, arrayDef: { type: [String] } },
		}] },

		infoData: { type: [Object], required: true, objDef: [{
			barcode: { type: [Array], required: false, arrayDef: { type: [String], } },
			// sku: { type: [Array], required: false, arrayDef: { type: [String], } },
			refSellPrice: { type: [Number], required: false, },
			images: { type: [Array], required: false, arrayDef: { type: [Object], objDef: [{
				name: { type: [String], required: true },
				url: { type: [String], required: true },
			}] } },
		}] },

		variationData: ProductController.variationDataDtd,
				
	};
	

	generateBePaths(app: CustomExpressApp, rhs: RequestHandlerService<Product>) {
		app.get('/' + this.bePath, AuthHelperService.requireAttributes([this.Attributes.view]), rhs.getMulti({customOptions: (req, fil) => {
			// as _deleted is used for the single models, when we delete the whole group, we don't set the _deleted field, as when we need to restore the object
			// we wouldn't know which models are active
			//
			// thus here we need to ensure that _groupDeleted is treated as _deleted
			if (fil._groupDeleted === null)
				delete fil._groupDeleted;
			else
				fil._groupDeleted = {$exists: false};
			return {filters: fil}
		}}));
		
		app.get('/' + this.bePath + ':id', AuthHelperService.requireAttributes([this.Attributes.view]), this.getHandler_getById(rhs));
	};

	/**
	 * Caculates the amount data of the products
	 */
	protected async executeDbGet<A extends DBGetOptionsMethods>(
		req: Request, 
		filterOrPipeline: A extends 'aggregate' ? object[] : Filter<Product>,
		opts: DBGetOptions<A>
	): Promise<DBGetReturnValue<A, Product>> {
		const done = await super.executeDbGet(req, filterOrPipeline, opts);

		// done could be null in case we do a findOne
		if (done && (opts.method === 'find' || opts.method === 'findOne'))
			await new ProductMovementController().calculateAmountInProdsForUser(req, Array.isArray(done) ? done as Product[] : [done as Product]);

		return done;
	}
	
	executeDbSave(): any {
		throw new Error500("Db operations not permitted. Use ProductGroupController");
	}

	
	public async updateProductsCategory(req: Request, oldCategoryId: string[], newCategoryId?: string) {
		
		const updateFilter = {'groupData.category.id': {$in: oldCategoryId}};

		// change the category
		if (newCategoryId) {
			await this.getCollToUse(req).updateMany(
				updateFilter, 
				{$set: {'groupData.category.id': newCategoryId}}
			);
		} 
		// remove the category
		else {
			await this.getCollToUse(req).updateMany(
				updateFilter, 
				{$unset: {'groupData.category': 1}}
			);
		}

	}

}

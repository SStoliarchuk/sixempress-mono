import { DataFormatterService, FetchableField, ObjectUtils } from "@sixempress/main-be-lib";
import { ModelClass, Product, ProductGroup, ProductType } from '@sixempress/be-multi-purpose';
import { WooProductSimple } from "../woo.dtd";
import { WooProduct } from "@sixempress/contracts-agnostic";
import { ExternalConnection } from "../../external-conn-paths/sync-config.dtd";
import { AddRemoteData } from "../../abstract/sync/sync-products.service";
import { Request } from "express";
import { WooSyncProductsServiceToRemote } from "./woo-sync-products-to-remote.service";
import { ProductGroupTypeController } from "../../abstract/sync/ProductType.controller";
import { SyncProductMovementsUtilities } from "../../abstract/sync/sync-product-movements.utils";

export const allowedWooProductTypes: WooProduct['type'][] = ['simple', 'variable']

class _WooSyncProductsService extends WooSyncProductsServiceToRemote {

	protected async translateItemToLocal(req: Request, ep: ExternalConnection, items: WooProductSimple[], local: Map<WooProductSimple, ProductGroup>): Promise<Map<WooProductSimple, ProductGroup>> {
			
		const allCatsIds = new Set<string | number>();
		const skusHm = new Set<string>();
		
		for (const val of items) {

			// category
			if (val.categories)
				for (const c of val.categories)
					allCatsIds.add(c.id);

			//
			// add skus
			//
			if (val.sku)
				skusHm.add(val.sku)
			
			if (val.variations)
				for (const v of val.variations)
					if (v.sku)
						skusHm.add(val.sku)
		}1
		

		const add = await this.getRemoteAddData(req, ep, {catIds: Array.from(allCatsIds), skus: Array.from(skusHm.values())});
		const ret = new Map<WooProductSimple, ProductGroup>();
		for (const ref of items) {
			const translated = this.translateProductGroupToLocal(ep, add, ref, local.get(ref));
			ret.set(ref, translated);
		}

		return ret;
	}

	/**
	 * Allows you to translate WooProductSimple to Local ProductGroup
	 * @param ep info about the external configuration
	 * @param additionalData Data that contains references to other fetchable items and stuff
	 * @param ref The remote item
	 * @param loc The local item, used to set values that the ref item does not contain
	 */
	private translateProductGroupToLocal(ep: ExternalConnection, additionalData: AddRemoteData, ref: WooProductSimple, loc?: ProductGroup): ProductGroup {

		// ensure that the item is enabled for this connection
		// if not enable return the unmodified version
		if (loc && loc.externalSync?.disabled?.some(f => f.id === ep._id))
			return loc;

		// we start by cloning as to not affect the original item
		const done: ProductGroup = {
			...this.getBaseProductFields(ep.locationId, true),
			...(loc ? ObjectUtils.cloneDeep(loc) : {}),
		};

		//
		// handle group data
		//
		done.groupData.name = ref.name;

		// categories
		delete done.groupData.category;
		delete done.groupData.additionalCategories;

		if (ref.categories && ref.categories.length) {
			done.groupData.category = new FetchableField(additionalData.categoriesHm[ref.categories[0].id]._id, ModelClass.InventoryCategory);
			if (ref.categories.length > 1)
				done.groupData.additionalCategories = ref.categories.slice(1).map(c => new FetchableField(additionalData.categoriesHm[c.id]._id, ModelClass.InventoryCategory));
		}

		// no sku in remote so we delete everything
		if (!ref.sku) {
			delete done.groupData.uniqueTags
		}
		// else we add it
		else {
			const skuConflict = additionalData.skus[ref.sku] && additionalData.skus[ref.sku].groupId !== done._trackableGroupId;
			
			// if the sku is already used in another group product, then we add the sku to the name just to not lose the information
			if (skuConflict) {
				done.groupData.name = '[' + ref.sku + '] ' + done.groupData.name;
			}
			// else we add it as the first one to the unique tags array, so it will be sent back to woocommerce as we send only the first
			else {
				if (!done.groupData.uniqueTags)
					done.groupData.uniqueTags = [];
	
				// add as the first one always
				if (!done.groupData.uniqueTags.includes(ref.sku))
					done.groupData.uniqueTags.unshift(ref.sku)
			}
		}
		
		// tags
		delete done.groupData.tags;

		if (ref.tags && ref.tags.length)
			done.groupData.tags = ref.tags.map(t => t.name.trim());

			
		// desc
		delete done.groupData.description;

		if (ref.short_description)
			done.groupData.description = ref.short_description;

		// 
		// handle models 
		//

		const allModels = [...done.models];
		
		// simply create one model
		if (ref.type === 'simple') {
			
			// we check if is simple by checking how many are active
			// we do < 2 because in creation mode the model array could be empty
			const activeModels = done.models.filter(m => !m._deleted)
			const isLocalSimple = activeModels.length < 2;

			// if the local and the remote are both simple then just remap the values
			if (isLocalSimple) {
				done.models = [this.translateProductModelToLocal(ep, allModels, ref, activeModels[0])];
			}
			// if the remote is simple and the local is not
			// then we create a new model, and try to parse back the most common data
			// we have no way to know which data the user actually wants so we just "guess"
			//
			// thus we should discourage the user to change from variable to simple type
			// or at least he should do it on local ?
			else {
				const prod = this.translateProductModelToLocal(ep, allModels, ref);
				prod.infoData = { 
					...prod.infoData, 
					...done.infoData, 
				};
				prod.variationData = { 
					...prod.variationData, 
					...done.variationData, /* ???? */
					// the sellprice needs to be overridden again as sometimes group variation data
					// can be present, so it will take importance
					sellPrice: prod.variationData.sellPrice,
				};
				done.models = [prod];
			}
		}
		// create a bunch of variations
		else if (ref.type === 'variable') {
			const newModels: ProductGroup['models'] = [];
			
			// get the item with the most variation enabled
			let varsAmount = 0;
			for (const v of ref.variations)
				if (v.attributes.length > varsAmount)
					varsAmount = v.attributes.length;

			for (const refVar of ref.variations) {
				// we skip the products with the variants different from the amount given
				// this is because woocommerce allows to set invalid variants, what ?
				//
				// invalid as variant 1 can be chosen, and variant 2 left empty as in "all variants"
				// i don't know how to handle this in my system so yolo
				if (refVar.attributes.length !== varsAmount)
					continue;

				// translate at start so that we can later check if there is a saleable variation equal
				let translated = this.translateProductModelToLocal(ep, allModels, refVar, undefined, ref);

				// get the old model and
				// convert again if a relative model is present as to create updated data
				const oldRefModel = SyncProductMovementsUtilities.findRelevantSaleableModelByRemoteId(done, ep, refVar.id);
				if (oldRefModel)
					translated = this.translateProductModelToLocal(ep, allModels, refVar, oldRefModel, ref);

				// woocmmerce allows to create identical products, so here we just ensure that each variation is truly unique
				if (!newModels.find(m => ProductGroupTypeController.twoVariationAreTheSame(m, translated)))
					newModels.push(translated);
			}
			done.models = newModels;
		}
		// not supported or some stuff with woocommecre
		else {
			return;
		}

		// if a woo variable product has no active variables then we return undefined as it's invalid;
		return done.models.length ? done : undefined;
	}

	/**
	 * Translates a single product model 
	 * HERE WE DO NOT HANDLE groupData
	 * we handle it transltaproductgroup
	 */
	private translateProductModelToLocal(ep: ExternalConnection, allModels: Product[], ref: WooProductSimple | WooProduct, loc?: Product, parent?: WooProductSimple | WooProduct): Product {
		// cloning as to not affect the original item
		const done: Product = {
			...this.getBaseProductFields(ep.locationId, false),
			...(loc ? ObjectUtils.cloneDeep(loc) : {}),
		};

		delete done._deleted;
		delete done.infoData.refSellPrice;

		// add base data
		// regular_price could be null
		if (typeof ref.sale_price === 'string' || typeof ref.regular_price === 'string')
			done.variationData.sellPrice = DataFormatterService.stringToCents(ref.sale_price || ref.regular_price);
		
		if (typeof ref.sale_price === 'string')
			done.infoData.refSellPrice = DataFormatterService.stringToCents(ref.regular_price || ref.sale_price);

		// to be safe in case of error with the sellPrice we set to a very high number 
		if (isNaN(done.variationData.sellPrice))
			done.variationData.sellPrice = 99999999_99
		if (isNaN(done.infoData.refSellPrice))
			done.infoData.refSellPrice = 99999999_99

		// ensure no useless data
		if (done.infoData.refSellPrice === done.variationData.sellPrice)
			delete done.infoData.refSellPrice;

		// ref.manage_stock have to be true (aka local stock managment instead of parent)
		if (ref.manage_stock === true && ref.stock_quantity)
			// if no models have an ext connection, it means we're creating a product, thus we add the setamount field
			if (!this.getRemoteExtObj(done, ep) && !allModels.some(m => this.getRemoteExtObj(m, ep)))
				done.setAmount = SyncProductMovementsUtilities.createAmountDataToSet(ep, done, ref.stock_quantity);


		delete done.infoData.images;
		// images 
		if (ref.images?.length)
			done.infoData.images = ref.images.map(i => ({name: i.name || i.alt || i.src, url: i.src}));

		this.addMetaData(done, ep, ref.id, {_wooProductGroupId: parent ? parent.id : ref.id})

		// empty the old to add new
		done.variationData.variants = [];

		// add variants
		// the ref.attributes is a hashmap if we pass ref as simple product but with attributes
		// so here we ensure that it is an array, beacuse the variation has the .attributes as arrays
		if (ref.type !== 'simple' && Array.isArray(ref.attributes)) {

			for (const att of ref.attributes) {
				// the option field is present only if the reference is a variation
				// we push ALL the options regardless of equal options etc..
				// because in the system it's not a problem
				// the only problem will be in editor where the user will 
				// be prompted to resolve the conflicts

				// we also check if the value is not undefined
				// as woocommerce can have empty string values to indicate "any variation"
				// or could be a number ?? idk
				if (typeof att.option !== 'undefined') {
					done.variationData.variants.push({name: String(att.name), value: String(att.option)});
				}
			}
		}

		
		// empty the barcodes if the local was deleted
		// as to not have conflict during restore
		// because when we restore we do also an update to ensure that
		// if woo commerce updates multiple fields during restore then we sync them
		//
		// Also we check for existence just for safety
		if (done._groupDeleted || !done.infoData.barcode) {
			done.infoData.barcode = [];
		}

		return done;
	}

	/**
	 * Returns basic empty fields for the product/group model
	 * @param locId used for documentLocationFilter
	 */
	private getBaseProductFields<T extends boolean>(locId: string, isGroup: T): T extends true ? ProductGroup : Product {
		return isGroup 
		? {
			groupData: { type: ProductType.product, name: '' },
			infoData: { },
			models: [],
			variationData: {},
			documentLocation: locId,
			documentLocationsFilter: [locId],
		} as T extends true ? ProductGroup : Product
		: {
			infoData: { },
			// to be safe in case of error with the sellPrice we set to a very high number 
			variationData: { buyPrice: 0, sellPrice: 9999999_99, variants: [], },
			documentLocation: locId,
			documentLocationsFilter: [locId],
		} as T extends true ? ProductGroup : Product
	}
	

}

export const WooSyncProductsService = new _WooSyncProductsService();
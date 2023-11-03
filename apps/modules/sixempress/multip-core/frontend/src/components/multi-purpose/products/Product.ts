import { IBaseModel, FetchableField, SelectFieldValue } from '@sixempress/main-fe-lib';
import { Supplier } from "../suppliers/Supplier";
import { InventoryCategory } from "../inventory-categories/InventoryCategories";
import { SyncableModel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/syncable.model';

export interface ProductAmountsField {
	item: FetchableField<Product>;
	amounts: { 
		[locationId: string]: number 
	};
	_price?: number;
}

export function getProductType(): {product: 1} {
	return use_filter.sxmp_productype_enum({
		product: 1
	}) as any;
}

export function getProducttypeSelectValues(): SelectFieldValue[] {
	return use_filter.sxmp_productype_values([
		{label: 'Prodotto Semplice', value: getProductType().product},
	]);
}

export interface Product extends SyncableModel {
	
	/**
	 * This is an ID string that is common to a group of variations
	 */
	_trackableGroupId?: string;

	_incomingData?: Product['_amountData'];

	/**
	 * The amount of products currently present in the system
	 * it is genereted when doing a GET,
	 * 
	 * It contains the location id and the amount ONLY if there are movements for it,
	 * so always check the presence of the location id
	 */
	_amountData?: { [locationId: string]: number };
	
	/**
	 * These amounts are the reserved products for an order or some other stuff
	 * this field exist only if there are reserved productmovements
	 * if no reserved productmovements are found then this field doesnt exist
	 */
	_reservedData?: Product['_amountData'];

	/**
	 * These fields contains information about returned DEFECT items
	 */
	_returnedData?: Product['_amountData'];

	/**
	 * This file is like the field _amountData, but this field is present in the model, and it is updated every time you add/remove product-movements
	 * but it is working 99.99% of time, it could be wrong, so be careful OwO
	 * 
	 * IT SHOULD ALWAYS BE PRESENT
	 * (generate on POST/PUT)
	 * update on product-movements adding
	 */
	_approximateAmountData?: Product['_amountData'];
	
	/**
	 * The total amount of items in the DB
	 * // TODO check if useful
	 */
	_totalAmount?: number;
	
	/**
	 * Same as _approximateAmountData but it is the total amount
	 * IT SHOULD ALWAYS BE PRESENT
	 * (generate on POST/PUT)
	 * update on product-movements adding
	 */
	_approximateTotalAmount?: number;


	infoData: {
		/**
		 * An array of barcodes to identify the product
		 */
		barcode: string[];
		/**
		 * When we want to add a discounted price, here we store the non discounted price
		 * allowing us to print labels with discounts on them
		 */
		refSellPrice?: number;
		/**
		 * Files to show
		 */
		images?: {name: string, url: string}[];
	}

	/**
	 * this info should be equal in ALL product variations models
	 */
	groupData: {

		type?: string | number;

		name: string;

		description?: string;

		category?: FetchableField<InventoryCategory>;

		uniqueTags?: string[];

		tags?: string[];

		internalTags?: string[];
		
		additionalCategories?: FetchableField<InventoryCategory>[];

	};

	/**
	 * This object contains the information that identifies uniquely a single product model
	 */
	variationData: {
			
		buyPrice: number;

		sellPrice: number;

		supplier?: FetchableField<Supplier>;

		variants: Array<{ name: string, value: string }>;

	};

}


export enum ProductMovementType {
	/** The product has been loaded into the system */
	loadProducts = 1,
	/** The product has been sold */
	sellProducts,
	/** The product has changed it's physical location */
	locationMovement,
	/** Manual fixes of the user */
	manualChange,
	// TODO split this movement type into reserve and incoming, so it's better ? 
	/** Announce that the product amount will change */
	reserveOrIncoming,
	/** A user has asked for a return */
	returns,
	/** Used for operations on Product that causes an automatic transfer of the stock, it is used to force the stock sync to remote connections */
	automaticTransfer,
	/** When an item has been returned with the product movement "returns" we sign it -1 with this movement if it is broken */
	brokenItem,
	/** When a returned item has been returned to supplier (useful if return is broke) */
	returnedToSupplier,
	/** Products have been throw away */
	trashed
}

/**
 * The product movement documentLocationFilter SHOULD BE EQUAL TO documentLocation AT ALL TIMES
 * 
 * Example
 * documentLocation: 'abc123'
 * documentLocationFilter: ['abc123']
 * 
 * ALWAYS
 */
export interface ProductMovement extends IBaseModel {
	targetProductInfo: {
		// group
		productsGroupId?: string;
		// variation id
		product: FetchableField<Product>;
	};

	movementType: ProductMovementType;

	/**
	 * Signed integer of the movement
	 * if decrease then negative INTEGER
	 * if increase then positive INTEGER
	 * 
	 * it is used with $sum during aggregation,
	 * thats why signed integers are needed
	 */
	amount: number; 
}

/**
 * Adds the new variation to save to the DB
 */
export interface ProductMovementLoad extends ProductMovement {
	newVariation?: Product['variationData'];
}




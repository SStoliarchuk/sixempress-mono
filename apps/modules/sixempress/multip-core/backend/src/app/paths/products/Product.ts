import { FetchableField, IBaseModel, IDeletedCreatedData, } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { SyncableModel } from '@sixempress/main-be-lib';
import { TrackableVariation } from '../../utils/trackable-variations/TrackableVariation';


export enum ProductType {
	product = 1,
	// replacement,
}

export enum ProductAmountType {
	unit = 1,
	weight,
	box, // ?
}

export type ProductNoAmounts = Omit<Product, '_amountData' | '_totalAmount' | '_incomingData' | '_reservedData' | '_returnedData'>;
export type ProductWithAmounts = ProductNoAmounts & Pick<Product, '_amountData' | '_totalAmount' | '_incomingData' | '_reservedData' | '_returnedData'>;

export interface Product extends TrackableVariation<ModelClass.Product>, SyncableModel {
	
	/**
	 * The amount of products currently present in the system
	 * it is genereted when doing a GET, it is not present in the model
	 *
	 * It contains the location id and the amount ONLY if there are movements for it,
	 * so always check the presence of the location id
	 * 
	 * The amounts should also subtract the reservedAmounts
	 * this means these are the SALEABLE amounts
	 * 
	 * we use a hashmap as the data type because this way 
	 * we can filter easier the unaccesable location for the user in case the user
	 * cannot see all locations
	 */
	_amountData?: { 
		[locationId: string]: number 
	};
	
	/**
	 * The total amount of items in the DB
	 * The amounts should also subtract the reservedAmounts
	 * this means these is the SALEABLE amount
	 */
	_totalAmount?: number;

	_incomingData?: Product['_amountData'];

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
	 * Same as _approximateAmountData but it is the total amount
	 * IT SHOULD ALWAYS BE PRESENT
	 * (generate on POST/PUT)
	 * update on product-movements adding
	 */
	_approximateTotalAmount?: number;

	/**
	 * This field is not present in db, it is only used during save/update to change the quantity in a given location
	 * 
	 * it will update only the given location, so if you want to reset a location, you should explicitely pass 0 as value => {[locId]: 0}
	 */
	setAmount?: {
		[locId: string]: number
	};

	infoData: {
		
		// /**
		//  * when we create a variation that is temporary, aka it's a variation that has an expire date
		//  * or some other fields that are not the "base" ones
		//  * 
		//  * then if we set this field to true, it will signal the controller to delete the product when the amount is < 1
		//  */
		// autoDelete?: true;

		/**
		 * An array of barcodes to identify the product
		 */
		barcode?: string[];

		/**
		 * Array of skus for the product variant
		 * // TODO implement logic in the controller different from ALL The other *_variant_* but not variation
		 */
		sku?: string[];

		/**
		 * When we want to add a discounted price, here we store the non discounted price
		 * allowing us to print labels with discounts on them
		 */
		refSellPrice?: number;

		/**
		 * Images to show of the product
		 */
		images?: {name: string, url: string}[],
	}
	
	groupData: {

		/**
		 * The type of the product 
		 */
		type?: number | string;

		/**
		 * The name of the product
		 */
		name: string;

		/**
		 * Long description of the product
		 * should be a WYSIWYG
		 */
		description?: string;
		
		/**
		 * Tags that are unique to a single group
		 */
		uniqueTags?: string[];

		/**
		 * Additional tags for the product group
		 * eg.: season, trend, etc
		 */
		tags?: string[];
		
		/**
		 * Tags that are not added to the e-commerce UI etc, used mainly for search
		 */
		internalTags?: string[];

		/**
		 * The main category of the product that the item is in
		 */
		category?: FetchableField<ModelClass.InventoryCategory>;

		/**
		 * Additional categories used primary for e-commerce purposes
		 */
		additionalCategories?: FetchableField<ModelClass.InventoryCategory>[];

	};

	variationData: {
			
		buyPrice: number;

		sellPrice: number;

		supplier?: FetchableField<ModelClass.Supplier>;

		/**
		 * These variants are always ordered by name, so other product variations have the same name order :D
		 */
		variants: Array<{ name: string, value: string }>;

	};

}

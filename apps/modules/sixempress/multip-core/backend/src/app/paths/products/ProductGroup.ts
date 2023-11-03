import { Product, ProductNoAmounts, ProductWithAmounts } from "./Product";
import { ModelClass } from '../../utils/enums/model-class.enum';
import { ObjectId } from "mongodb";
import { MultipleModelTrackableVariation } from "../../utils/trackable-variations/TrackableVariation";
import { SyncableModel } from '@sixempress/main-be-lib';

// needed in the interim used to remove the amounts flag where needed
export type ProductGroupNoAmounts = Omit<ProductGroup, 'models'> & {
	models: Array<ProductNoAmounts>;
}
export type ProductGroupWithAmount = Omit<ProductGroup, 'models'> & {
	models: Array<ProductWithAmounts>;
}

/**
 * DTD used for the GET only
 */
export interface ProductGroup extends MultipleModelTrackableVariation<ModelClass.Product, Product>, SyncableModel {

	_id?: string | ObjectId;

	_approximateTotalAmount?: Product['_approximateTotalAmount'];

	_trackableGroupId?: Product['_trackableGroupId'];

	_totalAmount?: number;
	
	groupData: Product['groupData'];
	
	infoData?: Partial<Product['infoData']>;

	variationData?: Partial<Product['variationData']>;

}

export interface AdditionalFindOptions {

	/**
	 * keeps the _deleted items even if the amount is 0
	 */
	keepAllVariations?: boolean,

	/**
	 * Normally when you pass the _id parameter, it is remapped to _trackableGroupId
	 * this flags prevents it
	 */
	skipIdToTrackableId?: boolean,

	/**
	 * by default when you pass filters, it returns only the models that match that filter
	 * 
	 * if this is true, it will match the models, and then match the rest by _trackableGroupId
	 * thus returning all the models even if you pass only a specific model _id
	 */
	returnFullGroupOnMatch?: boolean,

	/**
	 * does not calculate _amountData
	 */
	skipAmountsCalculation: boolean;

}


export interface AdditionalSaveOptions {

	/**
	 * false => same barcode for everyone\
	 * 'eachVariation' => each VARIATION, meaning even if price changes, gets unique barcode\
	 * 'eachVariant' => each Variant combination, meaning "color: red" has the same barcode as another color red with different price
	 */
	barcodeCreationMode?: false | 'eachVariation' | 'eachVariant';
}

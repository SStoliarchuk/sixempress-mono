import { WooProductSimple, WooProduct, WooOrder, WooProductCategory, WooCustomer } from "@sixempress/contracts-agnostic";
import { ObjectId } from "mongodb";
import { SyncableModel } from "../syncable-model";
import { WooTypes } from "./woo.enum";
import { WooProductSetStock } from '../abstract/woo.dtd';

export { WooProductSimple };

export type WooProductCategorySimple = WooProductCategory & {
	/** 
	 * The local id of the category (ObjectId) 
	 */
	__id: string,
	/** 
	 * In case both the parent and child are synced at the same time 
	 * then we won't have the remote parent id, thus here we set the local id
	 * and then we build a sync tree in wordpress plugin as we do here in local
	 */
	__extends?: string,
}

export interface WooFetchedAggregatedInfo {
	[WooTypes.product]?:           {[id: string]: WooProductSimple},
	[WooTypes.customer]?:          {[id: string]: WooCustomer},
	[WooTypes.prod_category]?:     {[id: string]: WooProductCategory},
	[WooTypes.order]?:             {[id: string]: WooOrder},
	[WooTypes.product_amount]?:    {[id: string]: WooProductSetStock},
}

export interface WooGetAggregateParams {
	projection: {
		[WooTypes.product]?:          1 | 0 | {[A in keyof WooProductSimple]: 1}   | {[A in keyof WooProductSimple]: 0},
		[WooTypes.customer]?:         1 | 0 | {[A in keyof WooCustomer]: 1}        | {[A in keyof WooCustomer]: 0},
		[WooTypes.prod_category]?:    1 | 0 | {[A in keyof WooProductCategory]: 1} | {[A in keyof WooProductCategory]: 0},
		[WooTypes.order]?:            1 | 0 | {[A in keyof WooOrder]: 1}           | {[A in keyof WooOrder]: 0},
	}
}

export interface WooSavedProductResponse {
	/**
	 * the product woo group ids saved
	 */
	items: { [k: string]: { 
		meta_data: WooProduct['meta_data'],
		// same for variations
		variations?: { [k: string]: {
			meta_data: WooProduct['meta_data'] 
		} }
	} };

	delete?: number[]
}

export interface WooPostBatchRespose {
	items: {[localId: string]: number};
	delete?: number[];
}

export type CrudActions<T extends SyncableModel> = {
	/**
	 * Contains the local items to create
	 */
	create: T[],
	/**
	 * Contains the local items to pdate
	 */
	update: T[],
	/**
	 * Contains ObjectId() of local items to remove
	 */
	delete: ObjectId[],
	/**
	 * Contains the local items to restore
	 * 
	 * @warning
	 * This property contains an array of models instead of objects because it could be possibile
	 * that when an item is restored on woo, some of it's property could be changed also
	 * (idk if this is the case, but better be safe than sorry)
	 * 
	 * so instead of just restoring a model, you should also check for diffs before saving
	 */
	restore: T[],
};

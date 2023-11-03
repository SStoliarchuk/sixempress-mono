import { Request } from 'express';
import { WooProduct, WooOrder, WooProductCategory, WooCustomer } from "@sixempress/contracts-agnostic";
import { CrudType, IVerifiableItemDtd } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { SyncableModel } from "../syncable-model";
import { WooTypes } from "./woo.enum";
import { WooProductSimple } from '../wordpress/woo.dtd';


/**
 * Additional options for processing data
 */
export type ItemsBuildOpts = {
	/**
	 * Forces to sync the stock between two conns
	 */
	forceProductStock?: true,
	/**
	 * Forces to sync the products by the specified ids
	 */
	forceProductMapping?: {
		/**
		 * localId (ObjectId)  => remote "group" id
		 * 
		 * if the remote product is simple, then we put the product.id
		 * if the remote item is a variable, then we put the product.parent_id
		 * 
		 * this is to ensure we have the topmost remote id
		 */
		localRemote: {[localId: string]: number},
		/**
		 * remoteId => localId  (ObjectId)
		 */
		remoteLocal: {[remoteId: string]: string},
	}

	selectMapItems?: {
		customers?: boolean,
		productCategories?: boolean,
		products?: boolean,
		orders?: boolean
	}
}

export const VerifiableMapping: IVerifiableItemDtd<ItemsBuildOpts['forceProductMapping']> = {
	localRemote: {type: [Object], required: true, objDef: [Number, String]},
	remoteLocal: {type: [Object], required: true, objDef: [Number, String]},
}

export type SyncCacheObject<T> = {
	[slug_or_url: string]: SyncDataItems<T>;
}

export type SyncDataItems<T> = {
	req: Request,
	data: ModelIdsHm,
	meta: T,
}

export type ModelIdsHm = {
	[ModelClass_or_WooType: string]: AddedIdInfo
}

export type AddedIdInfo = Map<string | number, AddedIdObject>;

export type AddedIdObject = {
	/**
	 * This field is present only for productGroups as we log the single model _id
	 * but we need to check the latest _trackableGroupId to know which to ignore
	 * 
	 * so we compare all the models changes and we ingore the originUrl with the latest added time :]
	 */
	addedMs: number;
	/**
	 * if present this origin url won't be notified of the crud update
	 * used for example if the crud update comes from this origin, so we ignore it
	 */
	omitOriginUrls?: string[],
	/**
	 * Used by ProductMovement to not emit if we update a non synced movement
	 */
	emitType?: CrudType,
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

export interface WooBuiltAggregatedInfo {
	[WooTypes.product]?:           Map<string | number, WooProductSimple>,
	[WooTypes.customer]?:          Map<string | number, WooCustomer>,
	[WooTypes.prod_category]?:     Map<string | number, WooProductCategory>,
	[WooTypes.order]?:             Map<string | number, WooOrder>,
	[WooTypes.product_amount]?:    Map<string | number, WooProductSetStock>,
}

export interface WooProductSetStock {
	/**
	 * The woo id of the product
	 */
	id: number;

	/**
	* Used by WooTypes.product_amount
	* signals the desired manual value of a product
	*/
	value?: number;
}

export interface WooCrudUpdate extends WooProductSetStock {
	/**
	 * Where the crud update request came from
	 */
	origin_url: string;
	/**
	 * The woo commerce "modelClass" of the item
	 */
	item_type: WooTypes;
	/**
	 * The woo id of the item
	 */
	id: number;
}

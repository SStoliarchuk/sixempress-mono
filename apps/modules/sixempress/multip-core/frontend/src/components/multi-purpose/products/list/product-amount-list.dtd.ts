import { RouteComponentProps } from "@sixempress/main-fe-lib";
import { Product } from "../Product";

export const productCommunicationServiceKey = 'for-product-list-page';

export declare type productCommunicationObject = Array<{
	productId: string,
	amounts?: {[locId: string]: number},
}>;

export declare type _internal_productCommunicationObject = Array<{
	item: Product,
	amounts?: {[locId: string]: number},
}>;

export interface PALProps extends RouteComponentProps {
	editable?: boolean;

	expandTable?: boolean;
	disableComplexLocation?: boolean;

	/**
	 * When you have multiple lists on the same page, we need to be able to differentiate them
	 * for example when flashing the barcode row, as it uses class/id that collide if there are multiple
	 * tables with the same element
	 */
	multiListPrefixKey?: string;

}

export interface PALState {

	/**
	 * if in simple mode, then the user can chose only 1 location
	 * if not in simple mode, then the user can chose multiple location independently
	 */
	simpleMode: false | { locationId: string };

	addComplexLocationPopover: null | {
		anchor: HTMLElement,
		gId: string,
		pId: string,
	};

	/**
	 * Hashamap where the key is the groupId and value is a 
	 * 		hashmap where the key is the productId and the value is the data of the product in the list
	 */
	products: {
		[gId: string]: {
			[pId: string]: StateProduct
		}
	};

}
export interface StateProduct {
	/**
	 * The fetched product object
	 */
	item: Product;
	/**
	 * Hashmap that contains the locationId as the key, and an object with the information of the table as value
	 * (usually only the amount)
	 */
	amounts: {
		[locId: string]: StateProductAmountValue,
	};
}

export interface StateProductAmountValue {
	amount: number;
}

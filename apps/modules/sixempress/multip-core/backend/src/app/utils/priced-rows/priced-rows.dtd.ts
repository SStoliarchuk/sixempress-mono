import { Coupon } from "../../paths/coupons/Coupon.dtd";
import { MovementMedium } from "../../paths/movements/Movement";
import { Product } from "../../paths/products/Product";
import { ModelClass } from "../../utils/enums/model-class.enum";
import { DBSaveOptionsMethods, DBSaveOptions, FetchableField, IBaseModel } from "@sixempress/main-be-lib";

export type CreateVariationsType = (Pick<Product, '_id' | 'variationData'> & {pObjRef: PricedRow['products'][0]})[];

export enum PricedRowsModelTotalType {
	net = 1,
	calculated,
	left,
	granTotal,
	buyPrice,
	// for coupons genearted from the customreturns
	netReduction,
}

export interface PricedRowsDBOpts<A extends DBSaveOptionsMethods, T> extends DBSaveOptions<A, T> {
	regenMode?: true;
}

export interface PricedRow {

	/** Unix date for the pricedRow, defaults to moment().unix() */
	date?: number;

	/** The info of the last user that has modified this specific row */
	_meta?: IBaseModel['_created'],

	/** Any product added to the row */
	products?: Array<{
		item: FetchableField<ModelClass.Product, Product>,
		amount: number,
		/** Allows you to change variation data automatically on save */
		newVariation?: Product['variationData'],
	}>;

	/** Manually set the items */
	manual?: Array<{
		/** A description of the action */
		description: string,
		/** A sellPrice for the customer */
		sellPrice?: number,
		/** A buyprice if present */
		buyPrice?: number,
		/** Any additional columns */
		additional?: Array<{name: string, value: string}>,
	}>;

	/** Reductions */
	coupons?: Array<{
		item: FetchableField<ModelClass.Coupon, Coupon>,
	}>;

}

export interface PricedRowsModel<T extends number> extends IBaseModel {

	/** A date used when the model is "complete" */
	endDate?: number;
	
	/** The status of the Model */
	status: T;

	/** List of different rows of the Model */
	list: PricedRow[];

	/** Optional payments for the model */
	payments: Array<{
		date: number,
		amount: number,
		medium: MovementMedium,
	}>;

	/** The total price of the model, will be automatically set if not given */
	totalPrice?: number;

	/** Information about the price for statistics */
	_priceMeta?: {
		/** When total is diff than calculated, here we store the diff */
		priceChange: number;
		/** The maximum total calculated without any discounts */
		maxTotal: number;
		/** The actual net total of the model (using the totalPrice given by the user, and not the max possible) */
		net: number;
		/** Left to pay to complete the order */
		left: number,
	};

}

import { Coupon } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon";
import { MovementMedium } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/Movement";
import { Product } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product";
import { FetchableField, IBaseModel } from "@sixempress/main-fe-lib";

export interface PricedRow {

	/** Unix date for the pricedRow, defaults to moment().unix() */
	date?: number;

	/** The info of the last user that has modified this specific row */
	_meta?: IBaseModel['_created'],

	/** Any product added to the row */
	products?: Array<{
		item: FetchableField<Product>,
		amount: number,
		/** Allows you to change variation data automatically on save */
		newVariation?: Product['variationData'],
	}>;

	/** Manually set the items */
	manual?: Array<{
		description: string,
		sellPrice?: number,
		buyPrice?: number,
		/** Any additional columns */
		additional?: Array<{name: string, value: string}>,
	}>;

	/** Reductions */
	coupons?: Array<{
		item: FetchableField<Coupon>,
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

export interface PricedRowsModelForm<T extends number> extends PricedRowsModel<T> {

	_totalPriceControl?: {
		percentage?: number,
		manual?: number,
		percentageMode?: boolean,
	}

}

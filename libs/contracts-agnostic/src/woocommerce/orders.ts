import { WooBaseItem, DateString, WooMetaData } from './base';

export type WooCurrency = 'AED' | 'AFN' | 'ALL' | 'AMD' | 'ANG' | 'AOA' | 'ARS' | 'AUD' | 'AWG' | 'AZN' | 'BAM' | 'BBD' | 'BDT' | 'BGN' | 'BHD' | 'BIF' | 'BMD' | 'BND' | 'BOB' | 'BRL' | 'BSD' | 'BTC' | 'BTN' | 'BWP' | 'BYR' | 'BZD' | 'CAD' | 'CDF' | 'CHF' | 'CLP' | 'CNY' | 'COP' | 'CRC' | 'CUC' | 'CUP' | 'CVE' | 'CZK' | 'DJF' | 'DKK' | 'DOP' | 'DZD' | 'EGP' | 'ERN' | 'ETB' | 'EUR' | 'FJD' | 'FKP' | 'GBP' | 'GEL' | 'GGP' | 'GHS' | 'GIP' | 'GMD' | 'GNF' | 'GTQ' | 'GYD' | 'HKD' | 'HNL' | 'HRK' | 'HTG' | 'HUF' | 'IDR' | 'ILS' | 'IMP' | 'INR' | 'IQD' | 'IRR' | 'IRT' | 'ISK' | 'JEP' | 'JMD' | 'JOD' | 'JPY' | 'KES' | 'KGS' | 'KHR' | 'KMF' | 'KPW' | 'KRW' | 'KWD' | 'KYD' | 'KZT' | 'LAK' | 'LBP' | 'LKR' | 'LRD' | 'LSL' | 'LYD' | 'MAD' | 'MDL' | 'MGA' | 'MKD' | 'MMK' | 'MNT' | 'MOP' | 'MRO' | 'MUR' | 'MVR' | 'MWK' | 'MXN' | 'MYR' | 'MZN' | 'NAD' | 'NGN' | 'NIO' | 'NOK' | 'NPR' | 'NZD' | 'OMR' | 'PAB' | 'PEN' | 'PGK' | 'PHP' | 'PKR' | 'PLN' | 'PRB' | 'PYG' | 'QAR' | 'RON' | 'RSD' | 'RUB' | 'RWF' | 'SAR' | 'SBD' | 'SCR' | 'SDG' | 'SEK' | 'SGD' | 'SHP' | 'SLL' | 'SOS' | 'SRD' | 'SSP' | 'STD' | 'SYP' | 'SZL' | 'THB' | 'TJS' | 'TMT' | 'TND' | 'TOP' | 'TRY' | 'TTD' | 'TWD' | 'TZS' | 'UAH' | 'UGX' | 'USD' | 'UYU' | 'UZS' | 'VEF' | 'VND' | 'VUV' | 'WST' | 'XAF' | 'XCD' | 'XOF' | 'XPF' | 'YER' | 'ZAR' | 'ZMW';

export type WooOrderStatus = 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';

export interface WooOrder extends WooOrderReadOnly, WooBaseItem {
	/**
	 * Parent order ID. 
	 */
	parent_id?: number;
	/** 
	 * Order status. Options: 'pending' | processing, on-hold, completed, cancelled, refunded, failed and trash. Default is pending. 
	 */
	status?: WooOrderStatus;
	/** 
	 * Currency the order was created with, in ISO format. Default is USD. 
	 */
	currency?: WooCurrency;
	/** 
	 * User ID who owns the order. 0 for guests. Default is 0. 
	 */
	customer_id?: number;
	/** 
	 * Note left by customer during checkout. 
	 */
	customer_note?: string;
	/** 
	 * Billing address. See Order - Billing properties 
	 */
	billing?: {
		/**
		 * First name.
		 */
		first_name: string,
		/**
		 * Last name.
		 */
		last_name: string,
		/**
		 * Company name.
		 */
		company: string,
		/**
		 * Address line 1
		 */
		address_1: string,
		/**
		 * Address line 2
		 */
		address_2: string,
		/**
		 * City name.
		 */
		city: string,
		/**
		 * ISO code or name of the state, province or district.
		 */
		state: string,
		/**
		 * Postal code.
		 */
		postcode: string,
		/**
		 * Country code in ISO 3166-1 alpha-2 format.
		 */
		country: string,
		/**
		 * Email address.
		 */
		email: string,
		/**
		 * Phone number.
		 */
		phone: string,
	};
	/** 
	 * Shipping address. See Order - Shipping properties 
	 */
	shipping?: {
		/**
		 * First name.
		 */
		first_name: string,
		/**
		 * Last name.
		 */
		last_name: string,
		/**
		 * Company name.
		 */
		company: string,
		/**
		 * Address line 1
		 */
		address_1: string,
		/**
		 * Address line 2
		 */
		address_2: string,
		/**
		 * City name.
		 */
		city: string,
		/**
		 * ISO code or name of the state, province or district.
		 */
		state: string,
		/**
		 * Postal code.
		 */
		postcode: string,
		/**
		 * Country code in ISO 3166-1 alpha-2 format.
		 */
		country: string,
		/**
		 * Email (just in case).
		 */
		email: string,
		/**
		 * Phone number.
		 */
		phone: string,
	};
	/** 
	 * Payment method ID. 
	 */
	payment_method?: string;
	/** 
	 * Payment method title. 
	 */
	payment_method_title?: string;
	/** 
	 * Unique transaction ID. 
	 */
	transaction_id?: string;
	/** 
	 * Meta data. See Order - Meta data properties 
	 */
	meta_data?: Array<WooMetaData>;
	/** 
	 * Line items data. See Order - Line items properties 
	 */
	line_items?: Array<{
		/**
		 * Item ID.
		 * @readonly
		 */
		id?: number,
		/**
		 * Product name.
		 */
		name: string,
		/**
		 * Product ID.
		 */
		product_id: number,
		/**
		 * Variation ID, if applicable.
		 */
		variation_id: number,
		/**
		 * Quantity ordered.
		 */
		quantity: number,
		/**
		 * Slug of the tax class of product.
		 */
		tax_class: string,
		/**
		 * Line subtotal (before discounts).
		 */
		subtotal: string,
		/**
		 * Line subtotal tax (before discounts).
		 * @readonly
		 */
		subtotal_tax?: string,
		/**
		 * Line total (after discounts).
		 */
		total: string,
		/**
		 * Line total tax (after discounts).
		 * @readonly
		 */
		total_tax?: string,
		/**
		 * Line taxes. See Order - Taxes properties
		 * @readonly
		 */
		taxes?: Array<WooOrderTaxes>,
		/**
		 * Meta data. See Order - Meta data properties
		 */
		meta_data: Array<WooMetaData>,
		/**
		 * Product SKU.
		 * @readonly
		 */
		sku?: string,
		/**
		 * Product price.
		 * @readonly
		 */
		price?: string,
	}>;
	/** 
	 * Shipping lines data. See Order - Shipping lines properties 
	 */
	shipping_lines?: Array<{
		/**
		 * 	Item ID.
		 * @readonly
		 */
		id?: number,
		/**
		 * 	Shipping method name.
		 */
		method_title: string,
		/**
		 * 	Shipping method ID.
		 */
		method_id: string,
		/**
		 * 	Line total (after discounts).
		 */
		total: string,
		/**
		 * 	Line total tax (after discounts).
		 * @readonly
		 */
		total_tax?: string,
		/**
		 * 	Line taxes. See Order - Taxes properties
		 * @readonly
		 */
		taxes?: Array<WooOrderTaxes>,
		/**
		 * 	Meta data. See Order - Meta data properties
		 */
		meta_data: Array<WooMetaData>,
	}>;
	/** 
	 * Fee lines data. See Order - Fee lines properties 
	 */
	fee_lines?: Array<{
		/**
		 * Item ID.
		 * @readonly
		 */
		id?: number,
		/**
		 * Fee name.
		 */
		name: string,
		/**
		 * Tax class of fee.
		 */
		tax_class: string,
		/**
		 * Tax status of fee. Options: taxable and none.
		 */
		tax_status: string,
		/**
		 * Line total (after discounts).
		 */
		total: string,
		/**
		 * Line total tax (after discounts).
		 * @readonly
		 */
		total_tax?: string,
		/**
		 * Line taxes. See Order - Taxes properties
		 * @readonly
		 */
		taxes?: Array<WooOrderTaxes>,
		/**
		 * Meta data. See Order - Meta data properties
		 */
		meta_data: Array<WooMetaData>,
	}>;
	/** 
	 * Coupons line data. See Order - Coupon lines properties 
	 */
	coupon_lines?: Array<{
		/**
		 * Item ID.
		 * @readonly
		 */
		id?: number,
		/**
		 * Coupon code.
		 */
		code: string,
		/**
		 * Discount total.
		 * @readonly
		 */
		discount?: string,
		/**
		 * Discount total tax.
		 * @readonly
		 */
		discount_tax?: string,
		/**
		 * Meta data. See Order - Meta data properties
		 */
		meta_data: Array<WooMetaData>,
	}>;
	/** 
	 * Define if the order is paid. It will set the status to processing and reduce stock items. Default is false.
	 * @writeonly
	 */
	set_paid?: boolean;
}

export interface WooOrderReadOnly {
	/** 
	 * Unique identifier for the resource.
	 * @readonly 
	 */
	id?: number;
	/** 
	 * Order number.
	 * @readonly 
	 */
	number?: string;
	/** 
	 * Order key.
	 * @readonly 
	 */
	order_key?: string;
	/** 
	 * Shows where the order was created.
	 * @readonly 
	 */
	created_via?: string;
	/** 
	 * Version of WooCommerce which last updated the order.
	 * @readonly 
	 */
	version?: string;
	/** 
	 * The date the order was created, in the site's timezone.
	 * @readonly 
	 */
	date_created?: DateString;
	/** 
	 * The date the order was created, as GMT.
	 * @readonly 
	 */
	date_created_gmt?: DateString;
	/** 
	 * The date the order was last modified, in the site's timezone.
	 * @readonly 
	 */
	date_modified?: DateString;
	/** 
	 * The date the order was last modified, as GMT.
	 * @readonly 
	 */
	date_modified_gmt?: DateString;
	/** 
	 * Total discount amount for the order.
	 * @readonly 
	 */
	discount_total?: string;
	/** 
	 * Total discount tax amount for the order.
	 * @readonly 
	 */
	discount_tax?: string;
	/** 
	 * Total shipping amount for the order.
	 * @readonly 
	 */
	shipping_total?: string;
	/** 
	 * Total shipping tax amount for the order.
	 * @readonly 
	 */
	shipping_tax?: string;
	/** 
	 * Sum of line item taxes only.
	 * @readonly 
	 */
	cart_tax?: string;
	/** 
	 * Grand total.
	 * @readonly 
	 */
	total?: string;
	/** 
	 * Sum of all taxes.
	 * @readonly 
	 */
	total_tax?: string;
	/** 
	 * True the prices included tax during checkout.
	 * @readonly 
	 */
	prices_include_tax?: boolean;
	/** 
	 * Customer's IP address.
	 * @readonly 
	 */
	customer_ip_address?: string;
	/** 
	 * User agent of the customer.
	 * @readonly 
	 */
	customer_user_agent?: string;
	/** 
	 * The date the order was paid, in the site's timezone.
	 * @readonly 
	 */
	date_paid?: DateString;
	/** 
	 * The date the order was paid, as GMT.
	 * @readonly 
	 */
	date_paid_gmt?: DateString;
	/** 
	 * The date the order was completed, in the site's timezone.
	 * @readonly 
	 */
	date_completed?: DateString;
	/** 
	 * The date the order was completed, as GMT.
	 * @readonly 
	 */
	date_completed_gmt?: DateString;
	/** 
	 * MD5 hash of cart items to ensure orders are not modified.
	 * @readonly 
	 */
	cart_hash?: string;
	/** 
	 * Tax lines data. See Order - Tax lines properties
	 * @readonly 
	 */
	tax_lines?: Array<WooOrderTaxes>;
	/** 
	 * List of refunds. See Order - Refunds properties
	 * @readonly 
	 */
	refunds?: Array<{
		/**
		 * Refund ID.
		 * @readonly
		 */
		id?: number,
		/**
		 * Refund reason.
		 * @readonly
		 */
		reason?: string,
		/**
		 * Refund total.
		 * @readonly
		 */
		total?: string,
	}>;
}

export interface WooOrderTaxes {
	/**
	 * Tax rate code.
	 * @readonly
	 */
	rate_code?: string,
	/**
	 * Tax rate ID.
	 * @readonly
	 */
	rate_id?: string,
	/**
	 * Tax rate label.
	 * @readonly
	 */
	label?: string,
	/**
	 * Show if is a compound tax rate.
	 * @readonly
	 */
	compound?: boolean,
	/**
	 * Tax total (not including shipping taxes).
	 * @readonly
	 */
	tax_total?: string,
	/**
	 * Shipping tax total.
	 * @readonly
	 */
	shipping_tax_total?: string,
	/**
	 * Meta data. See Order - Meta data properties
	 */
	meta_data?: Array<WooMetaData>;
}

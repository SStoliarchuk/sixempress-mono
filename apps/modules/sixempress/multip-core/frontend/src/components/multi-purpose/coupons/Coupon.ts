import { FetchableField, IBaseModel } from '@sixempress/main-fe-lib';
import { Customer } from '../customers/Customer';
import { MovementMedium } from '../movements/Movement';

export enum CouponDiscountType {
	fixed = 1,
	// percentage = 1,
}

export enum CouponDiscountTypeLabel {
	'Fisso' = CouponDiscountType.fixed,
	// 'Percentuale' = CouponDiscountType.percentage,
}


export interface Coupon extends IBaseModel {

	/**
	 * an optional customer associated with this coupon
	 */
	customer?: FetchableField<Customer>;

	/**
	 * Unique code identifier
	 * either created by the USER or automatically generated
	 */
	code?: string,

	/**
	 * Any additional note for the coupon
	 */
	notes?: string,

	/**
	 * The payment medium the customer used to buy this "gift card"
	 */
	paymentMedium?: MovementMedium,

	/**
	 * The type of reduction that will be applied to the total
	 */
	discountType: CouponDiscountType,

	/**
	 * The amount to discount which will have different behavior based on discountType
	 */
	amount: number,

	/**
	 * Wheter the coupon was already used or not and from where it was used
	 */
	_used?: FetchableField<any>,
}

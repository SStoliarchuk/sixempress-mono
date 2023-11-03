import { ModelClass } from '../../utils/enums/model-class.enum';
import { FetchableField, IBaseModel } from '@sixempress/main-be-lib';
import { Customer } from '../customers/Customer.dtd';
import { MovementMedium } from '../movements/Movement';

export enum CouponDiscountType {
	fixed = 1,
	// percentage = 1,
}

export interface Coupon extends IBaseModel {

	/**
	 * an optional customer associated with this coupon
	 */
	customer?: FetchableField<ModelClass.Customer, Customer>;
	
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
	_used?: FetchableField<ModelClass>,
}

import React from 'react';
import { BusinessLocationsService, FetchableField } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import moment from 'moment';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { PricedRowSale } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd';
import { MovementMedium } from '../../movements/Movement';
import { Product } from '../../products/Product';
import { SaleController } from '../sale.controller';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { SDTProps, SDTState } from './sale-desk.dtd';
import { Coupon } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/Coupon';


export class SaleDeskTabLogic extends React.Component<SDTProps, SDTState> {

	/**
	 * Wheter the user can discount the totalPrice
	 */
	protected canDiscount = AuthService.isAttributePresent(Attribute.allowSaleDiscount);

	protected viewCoupon = AuthService.isAttributePresent(Attribute.viewCoupon);
	
	state: SDTState = this.getStartingState(true);

	/**
	 * Returns the starting state while conserving some innocuous values
	 */
	protected getStartingState(useDefaultState?: true): SDTState {
		const currState: Partial<SDTState> = this.state || {};

		return {
			customer: undefined,
			ovverridePrice: undefined,
			partialPayment: undefined,
			payments: undefined,
			products: undefined,
			manual: undefined,
			coupons: undefined,

			saleControlOpen: !BusinessLocationsService.chosenLocationId,
			// physicalLocation: undefined,
			// date: undefined,
			// activePayMedium: undefined,

			physicalLocation: currState.physicalLocation || BusinessLocationsService.chosenLocationId,
			activePayMedium: currState.activePayMedium || MovementMedium.cash,

			...((useDefaultState && this.props.defaultState) || {}),
		}
	}

	/**
	 * The calculated total to pay
	 */
	protected getCalculatedTotal() {
		return SaleController.getListTotal([this.state]);
	}

	/**
	 * Reads also the override price values
	 */
	protected getFinalTotal(): number {
		if (typeof this.state.ovverridePrice?.value !== 'number' || !this.validate('discount'))
			return this.getCalculatedTotal();

		if (this.state.ovverridePrice.type === 'manual')
			return this.state.ovverridePrice.value as number;
		else
			return this.getPercentageTotal();
	}


	/**
	 * Adds a manual voice to the tab
	 */
	public addManualToTab(m: Partial<PricedRowSale['manual'][0]> = {}) {
		this.setState(s => ({manual: [...(s.manual || []), {description: 'Rep. 01', ...m}]}));
	}

	public addCouponToTab(m: Coupon) {
		this.setState(s => {
			const cps = [...(s.coupons || [])];
			
			if (!cps.some(c => c.item.id === m._id))
				cps.push({item: new FetchableField(m._id, ModelClass.Coupon, m)});

			return {coupons: cps};
		});
	}

	/**
	 * Adds the products to the current active tab
	 * @param changeAmount change the amount of the product when adding/updating the product
	 */
	public addProductToTab(p: Product, changeAmount = 1) {
		this.setState(
			s => {
				const prods = [...(s.products || [])];
				let product = prods.find(list => list.item.id === p._id);
				
				// if not present in list we add it
				if (!product) {
					product = { amount: 0, item: new FetchableField(p._id, ModelClass.Product, p) };
					prods.push(product);
				}
				product.amount += changeAmount;

				// remove if the product is negative
				if (product.amount < 1) {
					const idx = prods.findIndex(list => list.item.id === p._id);
					prods.splice(idx, 1);
				}

				return {products: prods};
			}, 
			() => this.props.onProductsChange([p], this.state)
		);
	}

	/**
	 * Removes completetly a product from receipt
	 */
	protected removeProductFromTab(id: string) {
		let prod: Product;
		this.setState(
			s => {
				const prods = [...(s.products || [])];
				
				let idx = prods.findIndex(list => list.item.id === id);
				if (idx === -1)
					return null;

				// clone items and remove product
				prod = prods[idx].item.fetched;
				prods.splice(idx, 1);

				return {products: prods};
			},
			() => {
				if (prod)
					this.props.onProductsChange([prod], this.state)
			}
		);
	}
	

	/**
	 * Checks various fields for their validity
	 */
	protected validate(what: 'all' | 'location' | 'discount' | 'pay_date' | 'pay_price' | 'man_description' | 'man_price', p?: number | string): boolean {

		switch(what) {

			case 'location': 
				return Boolean(this.state.physicalLocation);

			case 'pay_date':
				return Boolean(p);

			case 'pay_price':
				return typeof p === 'number';

			case 'man_description':
				return Boolean(p);

			case 'man_price':
				return !p || typeof p === 'number';

			case 'discount': 
				if (!this.state.ovverridePrice || !this.state.ovverridePrice.value)
					return true;

				// string so not yet a valid value
				if (typeof this.state.ovverridePrice.value === 'string')
					return false;

				// always true as the value is set only if valid number
				if (this.state.ovverridePrice.type === 'manual')
					return true;
				
				// 0 < x < 100
				if (this.state.ovverridePrice.type === 'percentage')
					return 0 <= this.state.ovverridePrice.value && this.state.ovverridePrice.value <= 100;

				return false;

			case 'all': 
				// base check
				if (!this.validate('location') || !this.validate('discount'))
					return false;

				// check payments
				for (const p of this.state.payments || [])
					if (!this.validate('pay_date', p.date) || !this.validate('pay_price', p.amount))
						return false;

				// check manual
				for (const p of this.state.manual || [])
					if (!this.validate('man_description', p.description) || !this.validate('man_price', p.buyPrice) || !this.validate('man_price', p.sellPrice))
						return false;

				return true;

			default: 
				return false;
		}

	}

	/**
	 * Returns the discounted price when the % value is active
	 */
	protected getPercentageTotal() {
		if (!this.validate('discount'))
			return this.getCalculatedTotal();

		const discount = this.state.ovverridePrice.value as number;
		const curr = this.getCalculatedTotal();
		const toRemove = curr * discount / 100;
		return curr - toRemove;
	}


	/**
	 * Total count of the items in the list
	 */
	protected getItemsCount() {
		return SaleController.getCount({list: [this.state]}, 'total');
	}


	/**
	 * Validates and sends back the info of the tab
	 */
	protected createCurrentTab() {
		if (!this.validate('all'))
			return;

		this.props.onConfirm(this.state, this.getFinalTotal());
	}

	/**
	 * Restores the state after a successfull sale
	 * NOTE: this does not trigger readjust product function as the new amountLeft is the "real" amount that is left as we sold the products\
	 * if a user does a new GET, then the new product amount will be set in the _amountData field
	 */
	public clearStateAfterCompleted() {
		this.setState(this.getStartingState());
	}


}
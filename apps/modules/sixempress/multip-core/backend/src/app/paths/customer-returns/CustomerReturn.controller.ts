import { IVerifiableItemDtd, FetchableField, Error403 } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { CustomerReturnItemStatus, CustomerReturn, CustomerReturnStatus } from './CustomerReturn';
import { ProductMovement, ProductMovementType } from '../products/product-movements/ProductMovement';
import { PricedRowsController } from '../../utils/priced-rows/priced-rows.controller';
import { CreateVariationsType, PricedRow, PricedRowsModelTotalType } from '../../utils/priced-rows/priced-rows.dtd';
import { Movement, MovementDirection } from '../movements/Movement';
import { Request } from 'express';
import { Coupon, CouponDiscountType } from '../coupons/Coupon.dtd';
import { CouponController } from '../coupons/Coupon.controller';
import { ErrorCodes } from '../../utils/enums/error.codes.enum';

export class CustomerReturnController extends PricedRowsController<CustomerReturn> {

	modelClass = ModelClass.CustomerReturn;
	collName = ModelClass.CustomerReturn;
	bePath = BePaths.customerreturns;

	Attributes = { 
		view: Attribute.viewCustomerReturns,
		add: Attribute.addCustomerReturns,
		modify: Attribute.modifyCustomerReturns,
		delete: Attribute.deleteCustomerReturns,
	};

	dtd: IVerifiableItemDtd<CustomerReturn> = {
		customer: FetchableField.getFieldSettings(ModelClass.Customer, false),
		itemStatus: {type: [Number], required: true, possibleValues: Object.values(CustomerReturnItemStatus).filter(v => typeof v === 'number') },
	};

	successProdMovType = ProductMovementType.returns;

	modelStatus = {
		all: Object.values(CustomerReturnStatus).filter(v => typeof v === 'number') as number[],
		// we create the movs only if accepted
		draft: [CustomerReturnStatus.draft, CustomerReturnStatus.pending],
		fail: [CustomerReturnStatus.cancelled],
		success: [CustomerReturnStatus.refunded],
		successPrePay: [CustomerReturnStatus.accepted, CustomerReturnStatus.generatedCoupon, CustomerReturnStatus.trashed],
	};

	protected async preprocessRows(req: Request, ms: CustomerReturn[], method: 'insert' | 'update'): Promise<void> {

		// if modifying, check the coupon has not been used
		const msIds = ms.filter(m => m._id).map(m => m._id.toString());
		if (msIds.length) {
			const coupons = await new CouponController().findForUser(req, {'_generatedFrom.id': {$in: msIds}, _used: {$exists :true}, _deleted: {$exists: false}}, {skipFilterControl: true});
			if (coupons.length)
				throw new Error403({ code: ErrorCodes.customerReturnCouponUsed, data: coupons });
		}

		return super.preprocessRows(req, ms, method);
	}

	// the priced row logic automatically set the status to complete if all payments are present
	// here we override that logic as we use the status in a "weird" way
	protected preprocessSingleModel(req: Request, m: CustomerReturn, currUnix: number, createVariations: CreateVariationsType) {
		const savedStatus = m.status;
		super.preprocessSingleModel(req, m, currUnix, createVariations);
		m.status = savedStatus;
	}

	/**
	 * Delete generated coupons
	 */
	protected async deleteForIdempotentState(req: Request, models: CustomerReturn[]): Promise<void> {
		await super.deleteForIdempotentState(req, models);
		const modelsId = models.filter(m => m._id).map(m => m._id.toString());
		if (!modelsId.length)
			return;

		await new CouponController().getCollToUse(req).deleteMany({ '_generatedFrom.id': { $in: modelsId } });
	}

	/**
	 * Create coupons
	 */
	protected async postprocessValidRows(req: Request, models: CustomerReturn[]): Promise<void> {
		await super.postprocessValidRows(req, models);
		
		const coupons: Coupon[] = [];
		// create coupons
		for (const m of models) {
			if (m.status !== CustomerReturnStatus.generatedCoupon)
				continue;

			const coupon: Coupon = {
				...this.getGeneratedFromField(m),
				documentLocation: m.documentLocation,
				documentLocationsFilter: m.documentLocationsFilter,
				date: m.date || m._created._timestamp,
				
				// use a deterministic code
				code: CouponController.generateCodeByCustomerReturn(m),
				amount: this.getTotal(m, PricedRowsModelTotalType.granTotal),
				discountType: CouponDiscountType.fixed,
			};

			if (m.customer)
				coupon.customer = m.customer;

			coupons.push(coupon);
		}

		await new CouponController().saveToDb(req, coupons, {allowAllLocations: true});
	}

	protected createProductMovementModelForRow(model: CustomerReturn, row: PricedRow['products'][0]): ProductMovement[] {
		// else we add the productmovs which will be "returns" type
		const movs = super.createProductMovementModelForRow(model, row);
		// create negative stock to balance the return info
		const addMovs: ProductMovement[] = [];

		// the items has been throw away
		if (model.status === CustomerReturnStatus.trashed) {
			for (const m of movs)
				addMovs.push({...m, movementType: ProductMovementType.trashed, date: model.endDate || model.date});
		}
		// the items are broken :/
		else if (model.itemStatus === CustomerReturnItemStatus.itemsDamaged) {
			for (const m of movs)
				addMovs.push({...m, movementType: ProductMovementType.brokenItem});
		}


		// invert the amount of the original stock, as the return info are products added and not removed
		for (const m of movs)
			m.amount = -m.amount;

		return [...movs, ...addMovs];
	}

	// invert the direction
	protected createMovementModelForPayment(model: CustomerReturn, p: CustomerReturn['payments'][0]): Movement[] {
		const movs = super.createMovementModelForPayment(model, p);
		for (const m of movs)
			m.direction = MovementDirection.output;

		return movs;
	}

}

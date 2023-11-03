import { Request } from 'express';
import { AbstractDbApiItemController, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue, Error403, FetchableField, IVerifiableItemDtd } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { Coupon, CouponDiscountType } from './Coupon.dtd';
import { ErrorCodes } from '../../utils/enums/error.codes.enum';
import { Movement, MovementDirection, MovementMedium } from '../movements/Movement';
import { MovementController } from '../movements/Movement.controller';
import { CustomerReturn } from '../customer-returns/CustomerReturn';

export class CouponController extends AbstractDbApiItemController<Coupon> {
	
	private static discType = Object.values(CouponDiscountType).filter(m => typeof m === 'number');
	private static movMed = Object.values(MovementMedium).filter(m => typeof m === 'number');
	
	addDateField = true;

	modelClass = ModelClass.Coupon;
	collName = ModelClass.Coupon;
	bePath = BePaths.Coupon;

	Attributes = {
		view: Attribute.viewCoupon,
		add: Attribute.addCoupon,
		modify: Attribute.modifyCoupon,
		delete: Attribute.deleteCoupon,
	}

	dtd: IVerifiableItemDtd<Coupon> = {
		date: { type: [Number], required: false, },
		customer: FetchableField.getFieldSettings(ModelClass.Customer, false),
		notes: { type: [String], required: false, },
		code: { type: [String], required: false, },
		paymentMedium: { type: [Number], required: false, possibleValues: CouponController.movMed, },
		discountType: { type: [Number], required: true, possibleValues: CouponController.discType, },
		amount: { type: [Number], required: true },
	};

	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request,
		opts: DBSaveOptions<A, Coupon>,
		toSave: A extends "insert" ? Coupon[] : Coupon,
		oldObjInfo: A extends "insert" ? undefined : Coupon
	): Promise<DBSaveReturnValue<Coupon>> {

		const arr: Coupon[] = Array.isArray(toSave) ? toSave as Coupon[] : [toSave as Coupon];
		
		// normalize to uppercase
		for (const a of arr)
			if (a.code)
				a.code = a.code.toUpperCase();

		if (opts.method === 'insert') {
			// ensure no code is used
			const used = await this.usedCodes(req, arr.map(a => a.code));
			if (used.length)
				throw new Error403({ code: ErrorCodes.codeConflict, data: used });

			// set auto codes
			await this.setAutoCode(req, toSave as Coupon[]);
		}
		else {
			if (oldObjInfo._generatedFrom)
				throw new Error403('Cannot edit a coupon that was generated from some other action like customer return');

			if (oldObjInfo._used)
				throw new Error403('Coupon was used and thus cannot be modified');

			if ((toSave as Coupon).code !== oldObjInfo.code)
				throw new Error403('Cannot change coupon code');
		}

		// idempotent save
		await this.deleteForIdempotentState(req, arr);
		const d = await super.executeDbSave(req, opts, toSave, oldObjInfo);
		await this.posprocessCoupons(req, arr);

		return d;
	}

	/**
	 * Removes all the movement of the coupons
	 */
	private async deleteForIdempotentState(req: Request, models: Coupon[]): Promise<void> {
		const modelsId = models.filter(m => m._id).map(m => m._id.toString());
		if (!models.length)
			return;

		// delete permanently as to not pollute db
		await new MovementController().getCollToUse(req).deleteMany({ '_generatedFrom.id': { $in: modelsId } });
	}

	/**
	 * Create money movements for the purchased gift cards
	 */
	private async posprocessCoupons(req: Request, models: Coupon[]): Promise<void> {
		const movs: Movement[] = [];
		for (const m of models)
			if (m.paymentMedium)
				movs.push(...this.createMovementForCoupon(m));

		await new MovementController().saveToDb(req, movs);
	}

	/**
	 * Creates the money movement for the buyPrice of the services
	 */
	protected createMovementForCoupon(model: Coupon): Movement[] {
		return [{ 
			_generatedFrom: new FetchableField(model._id, this.modelClass),
			physicalLocation: model.physicalLocation || model.documentLocation,
			documentLocation: model.physicalLocation || model.documentLocation,
			documentLocationsFilter: model.documentLocationsFilter,
			
			date: model.date || model._created._timestamp,
			priceAmount: model.amount,
			direction: MovementDirection.input,
			medium: model.paymentMedium,
		}];
	}

	/**
	 * add incremental value as suffix to the code to ensure its uniqueness
	 */
	private async setAutoCode(req: Request, items: Coupon[]) {
		let incremental = await this.getNextIncrementalValue(req, items.length);
		for (let i = items.length - 1; i > -1; i--) {
			if (!items[i].code)
				items[i].code = this.getFourChar() + '-' + this.getFourChar() + '-' + (incremental.toString().padStart(4, '0'));

			incremental--;
		}
	}

	/**
	 * Queries for given code to check if they exists
	 */
	private async usedCodes(req: Request, code: string | string[]): Promise<string[]> {
		const codes = Array.isArray(code) ? code : [code];
		const res: Coupon[] = await this.getCollToUse(req).find({ code: { $in: codes } }).toArray();
		return res.map(r => r.code);
	}

	public static generateCodeByCustomerReturn(m: CustomerReturn): string {
		return 'CRCC-' + m._progCode + '-' + m._created._timestamp.toString().slice(-4);
	}

	private getFourChar() {
		return Math.random().toString(16).substr(2, 4).toUpperCase();
	}

}

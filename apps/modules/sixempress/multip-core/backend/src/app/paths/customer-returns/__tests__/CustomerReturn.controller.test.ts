import { Filter, ObjectId } from "mongodb";
import { ProductMovement, ProductMovementType } from "../../products/product-movements/ProductMovement";
import { ProductMovementController } from "../../products/product-movements/ProductMovement.controller";
import { CustomerReturn, CustomerReturnItemStatus, CustomerReturnStatus } from "../CustomerReturn";
import { CustomerReturnController } from "../CustomerReturn.controller";
import { partToFull, PartialPricedRows } from "@utils/priced-rows/__tests__/priced-rows.test.utils";
import { Movement, MovementDirection } from "@paths/multi-purpose/movements/Movement";
import { MovementController } from "@paths/multi-purpose/movements/Movement.controller";
import { Coupon } from "@paths/multi-purpose/coupons/Coupon.dtd";
import { CouponController } from "@paths/multi-purpose/coupons/Coupon.controller";
import to from "await-to-js";

declare type PartialCustomerReturn = Partial<CustomerReturn> & PartialPricedRows;

const utils = (() => {
	return {
		...tt.getBaseControllerUtils<CustomerReturn, PartialCustomerReturn, CustomerReturnController>({
			controller: new CustomerReturnController(),
			partialToFull: async (items) => {
				for (const i of items) {
					i.itemStatus = i.itemStatus || CustomerReturnItemStatus.itemsWorking;
					i.status = i.status || CustomerReturnStatus.accepted;
				}

				return partToFull(items) as Promise<CustomerReturn[]>;
			},
		}),
		pMovContr: tt.getBaseControllerUtils<ProductMovement, Partial<ProductMovement>, ProductMovementController>({
			controller: new ProductMovementController(),
		}),
		movContr: tt.getBaseControllerUtils<Movement, Partial<Movement>, MovementController>({
			controller: new MovementController(),
		}),
		coupContr: tt.getBaseControllerUtils<Coupon, Partial<Coupon>, CouponController>({
			controller: new CouponController(),
		}),
	};
})();

beforeEach(async () => {
	await tt.dropDatabase();
});

describe('CustomerReturn Controller', () => {

	describe('paying back to customer', () => {

		it('fully pays', async () => {
			await utils.save([{l: [{prod: [{am: 1, sell: 1}]}, {prod: [{am: 5, sell: 1}]}], itemStatus: CustomerReturnItemStatus.itemsWorking, status: CustomerReturnStatus.refunded}]);
			expect(await utils.movContr.find({})).toEqual(tt.ea([
				tt.eo({priceAmount: 6, direction: MovementDirection.output}),
			]));
		});

	});

	describe('coupon', () => {

		it('generates a coupon with same code even when modifying model', async () => {
			const ret = await utils.save([{l: [{prod: [{am: 1, sell: 10}]}, {prod: [{am: 5, sell: 10}]}], status: CustomerReturnStatus.generatedCoupon}]);
			let c = await utils.coupContr.find({});
			expect(c[0].amount).toEqual(60);
			const code = c[0].code;

			await utils.patch(ret[0], [{op: 'set', path: 'totalPrice', value: 50}]);
			c = await utils.coupContr.find({});
			expect(c[0].amount).toEqual(50);
			// expect same code
			expect(c[0].code).toEqual(code);
		});
		
		it('throws error when modifying a return with a used coupon', async () => {
			const ret = await utils.save([{ l: [{ prod: [{ am: 1, sell: 10 }] }, { prod: [{ am: 5, sell: 10 }] }], status: CustomerReturnStatus.generatedCoupon }]);
			expect(await utils.coupContr.find({})).toHaveLength(1);

			let [e] = await to(utils.patch(ret[0], [{ op: 'set', path: 'totalPrice', value: 50 }]));
			expect(e).toBe(null);

			// "use" the coupon
			await utils.coupContr.controller.getCollToUse(tt.generateRequestObject()).updateMany({}, {$set: {_used: 1}});
			
			// expect error when updating
			[e] = await to(utils.patch(ret[0], [{ op: 'set', path: 'totalPrice', value: 40 }]));
			expect(e).not.toBe(null);
			
			// expect coupon to be present
			expect(await utils.coupContr.find({})).toHaveLength(1);
		});

		it('removes coupon when changin status', async () => {
			const ret = await utils.save([{ l: [{ prod: [{ am: 1, sell: 10 }] }, { prod: [{ am: 5, sell: 10 }] }], status: CustomerReturnStatus.generatedCoupon }]);
			expect(await utils.coupContr.find({})).toHaveLength(1);
			
			await utils.patch(ret[0], [{ op: 'set', path: 'status', value: CustomerReturnStatus.accepted }]);
			expect(await utils.coupContr.find({})).toHaveLength(0);
		});

	});

	describe('balances the prodMov with negative one when needed', () => {

		it('trashed', async () => {
			await utils.save([{l: [{prod: [{am: 1}]}, {prod: [{am: 5}]}], itemStatus: CustomerReturnItemStatus.itemsDamaged, status: CustomerReturnStatus.trashed}]);
			expect(await utils.pMovContr.find({})).toEqual(tt.ea([
				tt.eo({amount: 1, movementType: ProductMovementType.returns}),
				tt.eo({amount: 5, movementType: ProductMovementType.returns}),
				tt.eo({amount: -1, movementType: ProductMovementType.trashed}),
				tt.eo({amount: -5, movementType: ProductMovementType.trashed}),
			]));
		});


		it('brokenItem', async () => {
			await utils.save([{l: [{prod: [{am: 1}]}, {prod: [{am: 5}]}], itemStatus: CustomerReturnItemStatus.itemsDamaged, status: CustomerReturnStatus.accepted}]);
			expect(await utils.pMovContr.find({})).toEqual(tt.ea([
				tt.eo({amount: 1, movementType: ProductMovementType.returns}),
				tt.eo({amount: 5, movementType: ProductMovementType.returns}),
				tt.eo({amount: -1, movementType: ProductMovementType.brokenItem}),
				tt.eo({amount: -5, movementType: ProductMovementType.brokenItem}),
			]));
		});
		
		
	});

});

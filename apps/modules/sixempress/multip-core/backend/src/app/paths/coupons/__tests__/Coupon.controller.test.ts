import to from "await-to-js";
import { CouponController } from "../Coupon.controller";
import { Coupon } from "../Coupon.dtd";

const utils = (() => {


	return {
		contr: tt.getBaseControllerUtils<Coupon, Partial<Coupon>, CouponController>({
			controller: new CouponController(), 
			partialToFull: (is) => {
				for (const i of is) {
					i.discountType = typeof i.discountType === 'undefined' ? 1 : i.discountType;
					i.amount = typeof i.amount === 'undefined' ? 1 : i.amount;
					i.documentLocation = i.documentLocation || '1';
					i.documentLocationsFilter = i.documentLocationsFilter || ['1'];
				}

				return is as Coupon[];
			},
		})
	}

})();

describe('CouponController', () => {

	it('creates auto code', async () => {
		
		await utils.contr.save([{}]);
		const a = await utils.contr.find();
		const code = a[0].code;
		const split = code.split('-');
		
		// expect 3 set of 4 hex chars
		expect(split).toHaveLength(3);
		for (const s of split)
			expect(s).toMatch(/[0-9A-F]{4}/)
	});

	it('throws error on conflict code', async () => {
		let e;
		[e] = await to(utils.contr.save([{code: 'abc'}]));
		expect(e).toBe(null);

		[e] = await to(utils.contr.save([{ code: 'abc' }]));
		expect(e).not.toBe(null);
	});

});
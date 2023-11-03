import { Request } from 'express';
import { Movement, MovementMedium } from "@paths/multi-purpose/movements/Movement";
import { MovementController } from "@paths/multi-purpose/movements/Movement.controller";
import { Product } from "@paths/multi-purpose/products/Product";
import { ProductMovement } from "@paths/multi-purpose/products/product-movements/ProductMovement";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";
import { ModelClass } from "@utils/enums/model-class.enum";
import { FetchableField } from "@sixempress/main-be-lib";
import { PricedRowsController } from "../priced-rows.controller";
import { PricedRow, PricedRowsModelTotalType } from "../priced-rows.dtd";
import { partToFull, PricedRowsModel, PartialPricedRows } from './priced-rows.test.utils';

const utils = (() => {

	class Inst extends PricedRowsController<PricedRowsModel> {
		Attributes = {view: 1, modify: 1, add: 1, delete: 1};
		successProdMovType = 1;
		dtd = { status: { type: [Number], required: true } };
		modelStatus = {all: [1, 2, 3, 4, 5], draft: [5], success: [2], successPrePay: [3], fail: [4]};
		bePath = '__test_priced_rows';
		collName  = '__test_priced_rows';
		modelClass = '__test_priced_rows' as any;
	}


	const reqObjWA: {_: Request} = { _: undefined };

	return {
		partToFull: partToFull,
		allRowFieldsMap: {man: 'manual', prod: 'products'} as {[A in (keyof PartialPricedRows['l'][0])]: keyof PricedRow},
		setReqObj: (req?: Request) => reqObjWA._ = req,
		prodContr: tt.getProdController(),
		pMovContr: tt.getBaseControllerUtils<ProductMovement, Partial<ProductMovement>, ProductMovementController>({
			controller: new ProductMovementController(),
		}),
		movContr: tt.getBaseControllerUtils<Movement, Partial<Movement>, MovementController>({
			controller: new MovementController(),
		}),
		contr: tt.getBaseControllerUtils<PricedRowsModel, PartialPricedRows, Inst>({
			controller: new Inst(),
			reqObj: () => reqObjWA._ || tt.generateRequestObject(),
			// reqObj: () => utils.controllerReqObj || tt.generateRequestObject(),
			partialToFull: partToFull
		}),
	}
})();

beforeEach(async () => {
	utils.setReqObj();
	await tt.dropDatabase();
});

describe('priced rows controller', () => {

	it.todo('regens the db');

	it.todo('checks if the product amount locations are permitted to the user');
	
	it('adds correct _priceMeta.left as 0 when we create with status complete', async () => {
		let x = (await utils.contr.save([{ l: [{man: [{sell: 10}]}] }]))[0];
		expect(x._priceMeta.left).toEqual(10);

		// success status
		x = (await utils.contr.save([{status: 2, l: [{ man: [{ sell: 10 }] }] }]))[0];
		expect(x._priceMeta.left).toEqual(0);
	});

	it('removes empty list rows', async () => {
		let x = (await utils.contr.save([{l: [{}, {}, {}]}]))[0];
		expect(x.list).toHaveLength(0);
		
		for (const [k, v] of Object.entries(utils.allRowFieldsMap)) {
			x = (await utils.contr.save([{l: [{[k]: [{sell: 1}]}, {}, {[k]: [{sell: 2}]}, {}]}]))[0];
			expect(x.list).toHaveLength(2);
			expect(x.list).toEqual(tt.ea([tt.eo({[v]: [tt.eo({})]}), tt.eo({[v]: [tt.eo({})]})]))
			expect(x.totalPrice).toEqual(3);
		}
	});

	it('list rows _author field is added and kept if no changes were made', async () => {
		utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userId: '111'})}));
		let x = (await utils.contr.save([{l: [{man: [{sell: 1}]}, {}, {man: [{sell: 2}]}, {}]}]))[0];
		expect(x.list.map(l => l._meta._author.id)).toEqual(['111', '111']);

		// same element so no changes in id
		utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userId: '4444'})}));
		await utils.contr.put(x, x);
		x = (await utils.contr.find())[0];
		expect(x.list.map(l => l._meta._author.id)).toEqual(['111', '111']);

		// change the price
		let changed = (await utils.partToFull([{date: 0, l: [{man: [{sell: 1}]}, {man: [{sell: 3}]}]}]))[0];
		await utils.contr.put(x, changed);
		x = (await utils.contr.find())[0];
		expect(x.list.map(l => l._meta._author.id)).toEqual(['111', '4444']);

		// add another voice
		changed = (await utils.partToFull([{date: 0, l: [{man: [{sell: 1}, {sell: 1}]}, {man: [{sell: 3}]}]}]))[0];
		await utils.contr.put(x, changed);
		x = (await utils.contr.find())[0];
		expect(x.list.map(l => l._meta._author.id)).toEqual(['4444', '4444']);
	});

	describe('price calculations', () => {

		const fn = async (m: PartialPricedRows) => {
			const t = (await utils.contr.save([m]))[0];
			return {
				'net':  t._priceMeta.net,
				'cal':  t._priceMeta.maxTotal,
				'lef':  utils.contr.controller.getTotal(t, PricedRowsModelTotalType.left),
				'gra':  t.totalPrice,
				'dif': t._priceMeta.priceChange,
			}
		}

			
		it('works with single fields', async () => {
			const fields = Object.keys(utils.allRowFieldsMap);
			for (const f of fields) {
				expect(await fn({l: [{[f]: [{sell: 2}]}]}))
					.toEqual({dif: 0, net: 2, cal: 2, lef: 2, gra: 2});
				
				expect(await fn({l: [{[f]: [{sell: 2, buy: 1}, {sell: 2, buy: 1}]}]}))
					.toEqual({dif: 0, net: 2, cal: 4, lef: 4, gra: 4});

				expect(await fn({l: [{[f]: [{sell: 2, buy: 1}, {sell: 2, buy: 1}]}, {[f]: [{sell: 2}]}]}))
					.toEqual({dif: 0, net: 4, cal: 6, lef: 6, gra: 6});

				expect(await fn({l: [{[f]: [{sell: 2, buy: 1}, {sell: 2, buy: 1}]}, {[f]: [{sell: 2, buy: 1}, {sell: 2, buy: 1}]}]}))
					.toEqual({dif: 0, net: 4, cal: 8, lef: 8, gra: 8});
			}
		});

		it('works with all fields', async () => {
			const fields = Object.keys(utils.allRowFieldsMap);

			// 5 fields * 3 rows * 2 elements * 2 sellPrice = total 60
			const total = fields.length * 2 * 2 * 3;
			const net   = fields.length * 2 * 1 * 3;

			expect(await fn({l: [
				fields.reduce((car, cur) => (car[cur] = [{sell: 2, buy: 1}, {sell: 2, buy: 1}], car), {}),
				fields.reduce((car, cur) => (car[cur] = [{sell: 2, buy: 1}, {sell: 2, buy: 1}], car), {}),
				fields.reduce((car, cur) => (car[cur] = [{sell: 2, buy: 1}, {sell: 2, buy: 1}], car), {}),
			]}))
			.toEqual({dif: 0, net: net, cal: total, lef: total, gra: total});
		});

		it('removes payments from the grantotal', async () => {
			// payed more than the total, should be left 0
			expect(await fn({l: [{man: [{sell: 2}]}], p: [{am: 10}]}))
				.toEqual(tt.eo({lef: 0}));

			expect(await fn({l: [{man: [{sell: 20}]}], p: [{am: 1}]}))
				.toEqual(tt.eo({lef: 19}));

			expect(await fn({l: [{man: [{sell: 20}]}], p: [{am: 1}], totalPrice: 5}))
				.toEqual(tt.eo({lef: 4}));
		});

		it('uses manually set price', async () => {
			expect(await fn({l: [{man: [{sell: 20}]}]}))
				.toEqual(tt.eo({gra: 20}));

			expect(await fn({l: [{man: [{sell: 20}]}], totalPrice: 5}))
				.toEqual(tt.eo({gra: 5}));
		});

		it.todo('stores the price diff with calculated');

	});

	describe('Product variation', () => {

		it('creates new variation', async () => {
			// start with 1 product
			const is = await utils.contr.save([{l: [{prod: [{sell: 2}]}]}]);
			expect(await utils.prodContr.controller.getRawCollection(tt.testSlug).find().toArray()).toHaveLength(1);
			
			// patch the product with a new variation and expect there to be a new product
			await utils.contr.patch(is[0], [{op: 'set', path: 'list.0.products.0.newVariation', value: {sellPrice: 10, buyPrice: 4, variants: []}}]);
			const prods: Product[] = await utils.prodContr.controller.getRawCollection(tt.testSlug).find().toArray();
			expect(prods).toHaveLength(2);

			// expect the updated id
			expect(await utils.contr.find()).toEqual(tt.ea([tt.eo({
				list: tt.ea([tt.eo({
					products: tt.ea([tt.eo({
						item: tt.eo({
							id: prods.find(p => p.variationData.sellPrice === 10)._id.toString()
						})
					})])
				})])
			})]));

		});

	});

	describe('Product movements', () => {

		it('creates p movs', async () => {
			const i = await utils.contr.save([{l: [{prod: [{sell: 2, am: 2}]}]}]);
			let pMovs = await utils.pMovContr.find();
			expect(pMovs).toHaveLength(1);
			expect(pMovs[0].amount).toEqual(-2);

			// change the amount and expect to still be only 1 product movement, but with 10 value
			await utils.contr.patch(i[0], [{op: 'set', path: 'list.0.products.0.amount', value: 10}]);
			pMovs = await utils.pMovContr.find();
			expect(pMovs).toHaveLength(1);
			expect(pMovs[0].amount).toEqual(-10);
		});

	});

	describe('Money movements', () => {
		
		// this is to ensure that the reference ids of money movements
		// are independent between the payments and list info
		// as both use the same '_generatedFrom.id' filter
		//
		// so we should be able to control one regardless of the other
		it('deletes payments separetly from service/manual buyPrice etc', async () => {
			await utils.contr.save([{p: [{am: 1}], l: [{man: [{buy: 5}]}]}]);
			expect((await utils.movContr.find()).map(i => i.priceAmount)).toEqual(tt.ea([
				1, 5
			]));

			// create another one to ensure we don't cross-delete the items
			let is = await utils.contr.save([{p: [{am: 2}], l: [{man: [{buy: 7}]}]}]);
			expect((await utils.movContr.find()).map(i => i.priceAmount)).toEqual(tt.ea([
				1, 5, 2, 7
			]));

			// delete the downpayments
			await utils.contr.put(is[0], {...is[0], payments: []});
			expect((await utils.movContr.find()).map(i => i.priceAmount)).toEqual(tt.ea([
				1, 5, /* 2, */ 7
			]));

			// restore
			await utils.contr.put(is[0], is[0]);
			expect((await utils.movContr.find()).map(i => i.priceAmount)).toEqual(tt.ea([
				1, 5, 2, 7
			]));

			// delete the man row
			await utils.contr.put(is[0], {...is[0], list: []});
			expect((await utils.movContr.find()).map(i => i.priceAmount)).toEqual(tt.ea([
				1, 5, 2, /* 7 */
			]));


		});

		it('adds the remaining to pay to the money mov when the model is success complete', async () => {
			// pending so no movs
			let x = (await utils.contr.save([{totalPrice: 10, status: 1}]))[0];
			expect(await utils.movContr.find()).toHaveLength(0);

			// fail so no movs
			await utils.contr.put(x, {...x, status: 4});
			expect(await utils.movContr.find()).toHaveLength(0);

			// pre-pay, so no movs
			await utils.contr.put(x, {...x, status: 3});
			expect(await utils.movContr.find()).toHaveLength(0);

			// completed all so movement
			await utils.contr.put(x, {...x, status: 2});
			expect(await utils.movContr.find()).toEqual(tt.ea([tt.eo({priceAmount: 10})]));

			// with payments
			await utils.contr.put(x, {...x, status: 2, payments: [{amount: 4, date: 0, medium: MovementMedium.unspecified}]});
			expect(await utils.movContr.find()).toEqual(tt.ea([tt.eo({priceAmount: 4}), tt.eo({priceAmount: 6})]));
		});

	});

	describe('endDate', () => {

		it.todo('adds endDate if missing when completed');

		it.todo('if completed and endDate is in the future, it sets it to the curr unix');
		
		describe('on update', () => {

			it.todo('removes the endDate if the old is completed but not the new one')
			
			it.todo('restores the old endDate if both are completed but the new one does not have an endDate set')

		});

	});

});

import { ProductMovement } from "@paths/multi-purpose/products/product-movements/ProductMovement";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";
import { PricedRow } from "@utils/priced-rows/priced-rows.dtd";
import { partToFull, PartialPricedRows } from "@utils/priced-rows/__tests__/priced-rows.test.utils";
import { Request } from 'express';
import { Movement, MovementDirection, MovementMedium } from "@paths/multi-purpose/movements/Movement";
import { MovementController } from "@paths/multi-purpose/movements/Movement.controller";
import { createSplitReport } from "../datareport";
import { InternalOrder } from "@paths/multi-purpose/internal-orders/InternalOrder.dtd";
import { InternalOrderController } from "@paths/multi-purpose/internal-orders/InternalOrder.controller";
import { CustomerOrderController } from "@paths/multi-purpose/customer-orders/CustomerOrder.controller";
import { CustomerOrder, CustomerOrderStatus } from "@paths/multi-purpose/customer-orders/CustomerOrder.dtd";

const utils = (() => {

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
			partialToFull: (is) => is.map(i => ({
				medium: MovementMedium.card,
				documentLocation: '1',
				documentLocationsFilter: ['1'],
				...i,
			} as Movement))
		}),
		intOrdContr: tt.getBaseControllerUtils<InternalOrder, PartialPricedRows, InternalOrderController>({
			controller: new InternalOrderController(),
			reqObj: () => reqObjWA._ || tt.generateRequestObject(),
			partialToFull: partToFull
		}),
		cusOrdContr: tt.getBaseControllerUtils<CustomerOrder, PartialPricedRows, CustomerOrderController>({
			controller: new CustomerOrderController(),
			reqObj: () => reqObjWA._ || tt.generateRequestObject(),
			partialToFull: async (items) => {
				items = await partToFull(items);
				for (const i of items)
					i.status = CustomerOrderStatus.processing;
				return items as CustomerOrder[];
			}
		}),
	}
})();

beforeEach(async () => {
	utils.setReqObj();
	await tt.dropDatabase();
});

describe('movement controller', () => {

	describe('split report', () => {

		it('subs the ~error from proper field', async () => {
			for (const idx of [1, 0]) {
				for (const [f, ff] of [['man', 'manual'], ['prod', 'products']]) {
					await tt.dropDatabase();
					await (idx === 0 ? utils.intOrdContr : utils.cusOrdContr).save([{
						l: [{date: 5, [f]: [{sell: 10, buy: 5}]}],
						totalPrice: 8,
						p: [{date: 5, am: 4}, {date: 10, am: 3}], 
					}]);
	
					const rep = await createSplitReport(tt.generateRequestObject({query: {from: 10, to: 10}}));
					expect(rep).toEqual(tt.ee({
						[ff]: idx === 0 ? [3, 0] : [0, 3],
					}));
				}
			}
		});

		it('adds base fields for sales', async () => {
			await utils.cusOrdContr.save([{
				l: [
					{prod: [{sell: 50, buy: 4}]},
					{man: [{sell: 4, buy: 6}]},
				],
				totalPrice: 40,
				p: [{date: 5, am: 10}, {date: 10, am: 20}],
			}]);

			const rep = await createSplitReport(tt.generateRequestObject({query: {from: 10, to: 10}}));
			expect(rep).toEqual({
				products: [0, 16],
				manual: [0, 4],
				additional: [0, 0],
			});
		});

		it('adds base fields for internal order', async () => {
			await utils.intOrdContr.save([{
				l: [
					{prod: [{buy: 50, sell: 4}]},
					{man: [{buy: 4, sell: 6}]},
				],
				totalPrice: 40,
				p: [{date: 5, am: 10}, {date: 10, am: 20}],
			}]);

			const rep = await createSplitReport(tt.generateRequestObject({query: {from: 10, to: 10}}));
			expect(rep).toEqual({
				products: [16, 0],
				manual: [4, 0],
				additional: [0, 0],
			});
		});

		it('adds other manual movements', async () => {
			await utils.cusOrdContr.save([{
				l: [{prod: [{sell: 10, buy: 4}]}],
				totalPrice: 7,
				p: [{date: 5, am: 4}, {date: 10, am: 2}], 
			}]);

			await utils.movContr.save([
				{
					date: 10,
					priceAmount: 100,
					direction: MovementDirection.input,
				},
				{
					date: 10,
					priceAmount: 400,
					direction: MovementDirection.input,
				},
				{
					date: 10,
					priceAmount: 200,
					direction: MovementDirection.input,
				},
			]);

			const rep = await createSplitReport(tt.generateRequestObject({query: {from: 10, to: 10}}));
			expect(rep).toEqual({
				// 200 + 2 of cus payment
				products: [0, 202],
				manual: [0, 400],
				additional: [0, 100],
			});
		});

	});

});

import { MovementDirection } from "@paths/multi-purpose/movements/Movement";
import { MovementController } from "@paths/multi-purpose/movements/Movement.controller";
import { ProductMovementType } from "@paths/multi-purpose/products/product-movements/ProductMovement";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";
import { ModelClass } from "@utils/enums/model-class.enum";
import { FetchableField, MongoUtils } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { InternalOrderController as InternalOrderController } from "../InternalOrder.controller";
import { InternalOrder as InternalOrder, InternalOrderStatus } from "../InternalOrder.dtd";

type PProd = {id: string | ObjectId, amount?: number};
type PartInternalOrder = Partial<InternalOrder> & {
	prods?: (ObjectId | string | PProd)[]
}

const utils = (() => {

	return {
		prodController: tt.getProdController(),
		pMovController: tt.getBaseControllerUtils({controller: new ProductMovementController()}),
		movController: tt.getBaseControllerUtils({controller: new MovementController()}),
		orderController: tt.getBaseControllerUtils<InternalOrder, PartInternalOrder, InternalOrderController>({
			controller: new InternalOrderController(), 
			partialToFull: (is) => {
				for (const i of is) {

					i.list = [{
						products: (i.prods || []).map(p => typeof p === 'string' || MongoUtils.isObjectId(p)
							? ({item: new FetchableField(p, ModelClass.Product), amount: 1})
							: ({item: new FetchableField((p as PProd).id, ModelClass.Product), amount: (p as PProd).amount || 1})
						)
					}]

					i.documentLocationsFilter = ['*'];
					i.documentLocation = '1';
					i.payments = i.payments || [];
					i.totalPrice = i.totalPrice || 1;
					delete i.prods;
				}
				return is as InternalOrder[];
			}
		})
	};
})()

beforeEach(async () => {
	await tt.dropDatabase();
});

describe('Internal Order', () => {
	
	it('adds pMovs in "arriving" status', async () => {
		const pg = (await utils.prodController.save([{ms: [{}, {}, {}]}]));
		await utils.orderController.save([{status: InternalOrderStatus.processing, prods: pg[0].models.map(m => m._id)}])

		expect(await utils.pMovController.find()).toEqual(tt.ea([
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: 1}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: 1}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: 1}),
		]));
	});

	it('sets pMovs in "load" status on complete', async () => {
		const pg = (await utils.prodController.save([{ms: [{}, {}, {}]}]));
		const c = (await utils.orderController.save([{status: InternalOrderStatus.processing, prods: pg[0].models.map(m => m._id)}]))
		expect(await utils.pMovController.find()).toEqual(tt.ea([
			tt.eo({movementType: ProductMovementType.reserveOrIncoming}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming}),
		]));

		await utils.orderController.patch(c[0], [{op: 'set', path: 'status', value: InternalOrderStatus.completed}])
		expect(await utils.pMovController.find()).toEqual(tt.ea([
			tt.eo({movementType: ProductMovementType.loadProducts}),
			tt.eo({movementType: ProductMovementType.loadProducts}),
			tt.eo({movementType: ProductMovementType.loadProducts}),
		]));

	});

	describe('money', () => {

		it.todo('adds money only if saleable state is valid');

		it('adds the down payment with correct output status', async () => {
			const c = (await utils.orderController.save([{
				status: InternalOrderStatus.processing, 
				payments: [ {medium: 1, amount: 10, date: 1}, {medium: 1, amount: 30, date: 1}, ],
			}]));
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.output, priceAmount: 10}),
				tt.eo({direction: MovementDirection.output, priceAmount: 30}),
			]));
		});
	
		it('doesnt adds the final money mov on complete status when the remianing is < 0', async () => {
			const c = (await utils.orderController.save([{
				status: InternalOrderStatus.processing, 
				payments: [ {medium: 1, amount: 10, date: 1}, {medium: 1, amount: 30, date: 1}, ],
				totalPrice: 0,
			}]))[0];
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.output, priceAmount: 10}),
				tt.eo({direction: MovementDirection.output, priceAmount: 30}),
			]));
			await utils.orderController.patch(c, [{op: 'set', path: 'status', value: InternalOrderStatus.completed}]);
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.output, priceAmount: 10}),
				tt.eo({direction: MovementDirection.output, priceAmount: 30}),
			]));
		});

		it('adds the final money mov on complete status', async () => {
			const c = (await utils.orderController.save([{
				status: InternalOrderStatus.processing, 
				payments: [ {medium: 1, amount: 10, date: 1}, {medium: 1, amount: 30, date: 1}, ],
				totalPrice: 100,
			}]))[0];
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.output, priceAmount: 10}),
				tt.eo({direction: MovementDirection.output, priceAmount: 30}),
			]));
			await utils.orderController.patch(c, [{op: 'set', path: 'status', value: InternalOrderStatus.completed}]);
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.output, priceAmount: 10}),
				tt.eo({direction: MovementDirection.output, priceAmount: 30}),
				tt.eo({direction: MovementDirection.output, priceAmount: 60}),
			]));
		
		});
		
	});


});
import { Movement, MovementDirection, MovementMedium } from "@paths/multi-purpose/movements/Movement";
import { MovementController } from "@paths/multi-purpose/movements/Movement.controller";
import { Product } from "@paths/multi-purpose/products/Product";
import { ProductMovementType } from "@paths/multi-purpose/products/product-movements/ProductMovement";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";
import { ModelClass } from "@utils/enums/model-class.enum";
import to from "await-to-js";
import { FetchableField, MongoUtils } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { TransferOrderController as TransferOrderController } from "../TransferOrder.controller";
import { TransferOrder as TransferOrder, TransferOrderStatus } from "../TransferOrder.dtd";

type PProd = {id: string | ObjectId, amount?: number};
type PartTransferOrder = Partial<TransferOrder> & {
	prods?: (ObjectId | string | PProd)[],
	p?: Array<{ medium?: MovementMedium, date?: number, am?: number, }>;
}

const utils = (() => {


	return {
		prodController: tt.getProdController(),
		pMovController: tt.getBaseControllerUtils({controller: new ProductMovementController()}),
		movController: tt.getBaseControllerUtils<Movement, Partial<Movement>, MovementController>({controller: new MovementController()}),
		orderController: tt.getBaseControllerUtils<TransferOrder, PartTransferOrder, TransferOrderController>({
			controller: new TransferOrderController(), 
			partialToFull: (is) => {
				for (const i of is) {
					
					
					i.list = [{
						products: (i.prods || []).map(p => typeof p === 'string' || MongoUtils.isObjectId(p)
							? ({item: new FetchableField(p, ModelClass.Product), amount: 1})
							: ({item: new FetchableField((p as PProd).id, ModelClass.Product), amount: (p as PProd).amount || 1})
						)
					}];
					i.status = i.status || TransferOrderStatus.onHold;
					i.documentLocationsFilter = ['*'];
					i.documentLocation = '1';
					i.payments = (i.p || []).map(p => ({amount: p.am, date: p.date || 0, medium: p.medium || 1}));
					i.physicalLocation = i.physicalLocation || '1';
					i.transferOriginLocationId = i.transferOriginLocationId || '2';
					i.totalPrice = i.totalPrice || 1;
					
					delete i.prods;
					delete i.p;
				}
				return is as TransferOrder[];
			}
		})
	};
})()

beforeEach(async () => {
	await tt.dropDatabase();
});
describe('transfer order controller', () => {
	
	it.todo('sets totalPrice as the calculated buyPrice not the sellPrice');

	// this is so every employee can confirm the order "Received" to destination physicalLocation
	it.todo('does not check if the origin location is allowed');

	it('blocks same origin and destination location', async () => {
		let e;
		[e] = await to(utils.orderController.save([{transferOriginLocationId: '1', physicalLocation: '2'}]));
		expect(e).toBe(null);
		
		[e] = await to(utils.orderController.save([{transferOriginLocationId: '2', physicalLocation: '1'}]));
		expect(e).toBe(null);
		
		[e] = await to(utils.orderController.save([{transferOriginLocationId: '2', physicalLocation: '2'}]));
		expect(e).not.toBe(null);
		
		[e] = await to(utils.orderController.save([{transferOriginLocationId: '1', physicalLocation: '1'}]));
		expect(e).not.toBe(null);
	});

	it('adds pMovs in "arriving" status', async () => {
		const pg = (await utils.prodController.save([{ms: [{}, {}, {}]}]));
		
		await utils.orderController.save([{documentLocation: '1', status: TransferOrderStatus.processing, prods: [...pg[0].models.map(m => ({id: m._id, amount: 10}))]}])
		await utils.orderController.save([{documentLocation: '2', status: TransferOrderStatus.processing, prods: [...pg[0].models.map(m => ({id: m._id, amount: -10}))]}])

		expect(await utils.pMovController.find()).toEqual(tt.ea([
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: 10, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: 10, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: 10, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: -10, documentLocation: '2'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: -10, documentLocation: '2'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, amount: -10, documentLocation: '2'}),
		]));
	});

	it('sets pMovs in "load" status on complete', async () => {
		const pg = (await utils.prodController.save([{ms: [{}, {}, {}]}]));
		const c = (await utils.orderController.save([{status: TransferOrderStatus.processing, prods: pg[0].models.map(m => m._id)}]))
		expect(await utils.pMovController.find()).toEqual(tt.ea([
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, documentLocation: '1'}),

			tt.eo({movementType: ProductMovementType.reserveOrIncoming, documentLocation: '2'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, documentLocation: '2'}),
			tt.eo({movementType: ProductMovementType.reserveOrIncoming, documentLocation: '2'}),
		]));

		await utils.orderController.patch(c[0], [{op: 'set', path: 'status', value: TransferOrderStatus.completed}])
		expect(await utils.pMovController.find()).toEqual(tt.ea([
			tt.eo({movementType: ProductMovementType.locationMovement, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.locationMovement, documentLocation: '1'}),
			tt.eo({movementType: ProductMovementType.locationMovement, documentLocation: '1'}),

			tt.eo({movementType: ProductMovementType.locationMovement, documentLocation: '2'}),
			tt.eo({movementType: ProductMovementType.locationMovement, documentLocation: '2'}),
			tt.eo({movementType: ProductMovementType.locationMovement, documentLocation: '2'}),
		]));

	});

	describe('money', () => {

		// it('updates the movements when changing phsicalLocation or fromLocation');

		it('adds the down payment with correct output status', async () => {
			const c = (await utils.orderController.save([{
				status: TransferOrderStatus.processing,
				economicTransfer: true,
				p: [ {am: 10, date: 1}, {am: 30, date: 1}, ],
			}]));

			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 30}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 30}),
			]));
		});
	
		it('doesnt adds the final money mov on complete status when the remianing is < 0', async () => {
			const c = (await utils.orderController.save([{
				status: TransferOrderStatus.processing, 
				p: [ {am: 10, date: 1}, {am: 30, date: 1}, ],
				economicTransfer: true,
				totalPrice: 0,
			}]))[0];
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 30}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 30}),
			]));
			await utils.orderController.patch(c, [{op: 'set', path: 'status', value: TransferOrderStatus.completed}]);
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 30}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 30}),
			]));
		});

		it('adds the final money mov on complete status', async () => {
			const c = (await utils.orderController.save([{
				status: TransferOrderStatus.processing, 
				p: [ {am: 10, date: 1}, {am: 30, date: 1}, ],
				economicTransfer: true,
				totalPrice: 100,
			}]))[0];
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 30}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 30}),
			]));
			await utils.orderController.patch(c, [{op: 'set', path: 'status', value: TransferOrderStatus.completed}]);
			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 30}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 60}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 10}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 30}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 60}),
			]));
		
		});
		
		it('adds the negative amount when economic transfer is true', async () => {
			const c = (await utils.orderController.save([{
				transferOriginLocationId: '1',
				physicalLocation: '2',
				status: TransferOrderStatus.processing,
				economicTransfer: true,
				p: [ {am: 10, date: 1}, {am: 30, date: 1}, ],
			}]));

			expect(await utils.movController.find()).toEqual(tt.ea([
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 10, physicalLocation: '1'}),
				tt.eo({direction: MovementDirection.internalInput, priceAmount: 30, physicalLocation: '1'}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 10, physicalLocation: '2'}),
				tt.eo({direction: MovementDirection.internalOutput, priceAmount: 30, physicalLocation: '2'}),
			]));
		});

		it.todo('adds money only if saleable is valid');

		it.todo('removes downpayment if we disable the economicTransfer flag');

	});

});

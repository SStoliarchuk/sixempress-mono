import { Request } from 'express';
import { Movement, MovementDirection } from "@paths/multi-purpose/movements/Movement";
import { MovementController } from "@paths/multi-purpose/movements/Movement.controller";
import { ProductMovement } from "@paths/multi-purpose/products/product-movements/ProductMovement";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";
import { PricedRowsSaleController } from "../priced-rows-sale.controller";
import { partToFull, PartialPricedRows } from '../../priced-rows/__tests__/priced-rows.test.utils';
import { PricedRowsSaleModel as _PricedRowsSaleModel } from "../priced-rows-sale.dtd";
import { TransferOrderController } from '@paths/multi-purpose/transfer-orders/TransferOrder.controller';
import { TransferOrder, TransferOrderStatus } from '@paths/multi-purpose/transfer-orders/TransferOrder.dtd';
import { ObjectId } from 'mongodb';
import to from 'await-to-js';
import { IBaseModel } from '@sixempress/main-be-lib';
import { SaleAnalysisController } from '@paths/multi-purpose/sale-analyses/SaleAnalysis.controller';
import { ModelClass } from '@utils/enums/model-class.enum';

declare type PricedRowsSaleModel = _PricedRowsSaleModel<any>;

const utils = (() => {

	class TestClass extends PricedRowsSaleController<PricedRowsSaleModel> {
		Attributes = {view: 1, modify: 1, add: 1, delete: 1};
		dtd = {};
		bePath = '__test_priced_rows';
		collName  = '__test_priced_rows';
		modelClass = '__test_priced_rows' as any;

		modelStatus = {all: [1, 2, 3, 4, 5], draft: [5], success: [2], successPrePay: [3], fail: [4]};
	}

	const instance = new TestClass();
	const reqObjWA: {_: Request} = { _: undefined };

	return {
		instance: instance,
		setReqObj: (req?: Request) => reqObjWA._ = req,
		contr: tt.getBaseControllerUtils<PricedRowsSaleModel, PartialPricedRows, TestClass>({
			controller: instance,
			reqObj: () => reqObjWA._ || tt.generateRequestObject(),
			partialToFull: partToFull
		}),
		clear: async (models?: IBaseModel[]) => {
			if (!models) 
				return;
			return utils.contr.controller.deleteForUser(
				tt.generateRequestObject(), 
				{_id: {$in: models.map(d => new ObjectId(d._id))}}, 
				{completeDelete: true, deleteMulti: true, skipFilterControl: true}
			);
		},
		pMovContr: tt.getBaseControllerUtils<ProductMovement, Partial<ProductMovement>, ProductMovementController>({
			controller: new ProductMovementController(),
		}),
		transContr: tt.getBaseControllerUtils<TransferOrder, Partial<TransferOrder>, TransferOrderController>({
			controller: new TransferOrderController(),
		}),
		prodContr: tt.getProdController(),
		movContr: tt.getBaseControllerUtils<Movement, Partial<Movement>, MovementController>({
			controller: new MovementController(),
		}),
	};
})();

beforeEach(async () => {
	utils.setReqObj();
	await tt.dropDatabase();
	// default to false for tests
	utils.instance['checkStockAvailability'] = false;
});

describe('priced rows sale', () => {

	describe('product stock', () => {

		it.todo('checks amount availability on update');

		it('checks amount availability', async () => {
			utils.instance['checkStockAvailability'] = true;
			const gs = await utils.prodContr.save([{ms: [{setAmount: {'1': 10, '2': 5}}]}]);
			
			let e, d;
			[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 3}]}], physicalLocation: '1'}]));
			expect(e).toBe(null);
			await utils.clear(d);

			[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 3}]}], physicalLocation: '1'}]));
			expect(e).toBe(null);
			await utils.clear(d);

			[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 11}]}], physicalLocation: '1'}]));
			expect(e).not.toBe(null);
			await utils.clear(d);

			[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 2}]}], physicalLocation: '1'}]));
			expect(e).toBe(null);
			await utils.clear(d);
		});

		describe('transfer', () => {
			
			it('sets transfer status to success or fail based on the parent model', async () => {
					const x = await utils.contr.save([{status: 1, l: [{prod: [{am: 10, tr: {['2']: 5}}, {am: 3}]}]}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{status: TransferOrderStatus.pending},
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'status', value: 2}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{status: TransferOrderStatus.completed},
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'status', value: 4}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{status: TransferOrderStatus.cancelled},
					]));

			});

			it('checks transfer from same origin as the physicalLocation of the model (A -> A)', async () => {
				let e = null;
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['1']: 5}}]}], physicalLocation: '2'}]));
				expect(e).toBe(null);
				
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['1']: 5}}]}], physicalLocation: '1'}]));
				expect(e).not.toBe(null);
				
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['2']: 5}}]}], physicalLocation: '2'}]));
				expect(e).not.toBe(null);
				
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['2']: 5}}]}], physicalLocation: '3'}]));
				expect(e).toBe(null);
			});

			it('removes the transfer if not needed anymore', async () => {
				// save with transfer
				const x = await utils.contr.save([{l: [{prod: [{am: 10, tr: {['2']: 5}}, {am: 3}]}]}]);
				// expect 1 transfer and the ref in db
				expect(await utils.transContr.find()).toHaveLength(1);
				let inDb = await utils.contr.find();
				expect(inDb[0]._transferOrders).not.toBe(undefined);

				// update with no transfer
				delete x[0].list[0].products[0].transfer;
				await utils.contr.put(x[0], x[0]);
				
				// expect for ref and db to be clear
				expect(await utils.transContr.find()).toHaveLength(0);
				inDb = await utils.contr.find();
				expect(inDb[0]._transferOrders).toBe(undefined);
			});

			it('checks transfer availability', async () => {
				utils.instance['checkStockAvailability'] = true;
				const gs = await utils.prodContr.save([{ms: [{setAmount: {'1': 10, '2': 5}}]}]);
				
				let e, d;
				[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 3}]}], physicalLocation: '1'}]));
				expect(e).toBe(null);
				await utils.clear(d);

				[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 3}]}], physicalLocation: '1'}]));
				expect(e).toBe(null);
				await utils.clear(d);

				[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 11}]}], physicalLocation: '1'}]));
				expect(e).not.toBe(null);
				await utils.clear(d);

				[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 11, tr: {'2': 3}}]}], physicalLocation: '1'}]));
				expect(e).toBe(null);
				await utils.clear(d);

				[e, d] = await to(utils.contr.save([{l: [{prod: [{id: gs[0].models[0]._id.toString(), am: 11, tr: {'2': 5}}]}], physicalLocation: '1'}]));
				expect(e).not.toBe(null);
				await utils.clear(d);
			});
			
			it('checks user location permissions for transfer', async () => {
				let e;

				utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userLocs: ['1', '2', '3']})}));
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['1']: 5, '3': 10}}]}], physicalLocation: '2'}]));
				expect(e).toBe(null);

				utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userLocs: ['1', '2']})}));
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['1']: 5, '3': 10}}]}], physicalLocation: '2'}]));
				expect(e).not.toBe(null);

				utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userLocs: ['1']})}));
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['2']: 5, '3': 10}}]}], physicalLocation: '1'}]));
				expect(e).not.toBe(null);

				utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userLocs: ['*']})}));
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3, tr: {['2']: 5, '3': 10}}]}], physicalLocation: '1'}]));
				expect(e).toBe(null);

				utils.setReqObj(tt.generateRequestObject({authzString: tt.generateAuthzString({userLocs: ['1']})}));
				[e] = await to(utils.contr.save([{l: [{prod: [{am: 10}, {am: 3}]}], physicalLocation: '1'}]));
				expect(e).toBe(null);
			});

			describe('creates transfer order model', () => {

				it('pmov', async () => {
					const x = await utils.contr.save([{l: [{prod: [{am: 10, tr: {['2']: 5}}, {am: 3}]}]}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{list: [{products: [{amount: 5}]}]},
					]));
					expect(await utils.pMovContr.find()).toEqual(tt.ee([
						// sale order
						{amount: -10}, {amount: -3}, 
						// transfer
						{amount: -5}, {amount: 5}
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'totalPrice', value: 10}]);
					await utils.contr.patch(x[0], [{op: 'set', path: 'status', value: 2}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{list: [{products: [{amount: 5}]}]},
					]));
					expect(await utils.pMovContr.find()).toEqual(tt.ee([
						// sale order
						{amount: -10}, {amount: -3}, 
						// transfer
						{amount: -5}, {amount: 5}
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'list.0.products.1.transfer', value: {'2': 1}}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{list: [{products: [{amount: 5}, {amount: 1}]}]},
					]));
					expect(await utils.pMovContr.find()).toEqual(tt.ee([
						// sale order
						{amount: -10}, {amount: -3}, 
						// transfer
						{amount: -5}, {amount: 5}, {amount: -1}, {amount: 1}
					]));

					// remove all transfer and expect no transfer model to be present
					await utils.contr.patch(x[0], [{op: 'unset', path: 'list.0.products.1.transfer', value: ''}]);
					await utils.contr.patch(x[0], [{op: 'unset', path: 'list.0.products.0.transfer', value: ''}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([]));
					expect(await utils.pMovContr.find()).toEqual(tt.ee([
						// sale order
						{amount: -10}, {amount: -3}, 
					]));

				});

				it('money mov', async () => {
					const x = await utils.contr.save([{l: [{prod: [{sell: 1, buy: 1, am: 10, tr: {['2']: 5}}, {sell: 1, buy: 1, am: 3}]}]}]);
					expect(await utils.movContr.find()).toEqual([]);

					await utils.contr.patch(x[0], [{op: 'set', path: 'totalPrice', value: 10}]);
					await utils.contr.patch(x[0], [{op: 'set', path: 'status', value: 2}]);
					expect(await utils.movContr.find()).toEqual(tt.ee([
						{priceAmount: 5, direction: MovementDirection.internalInput},
						{priceAmount: 5, direction: MovementDirection.internalOutput},

						{priceAmount: 10, direction: MovementDirection.input},
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'list.0.products.1.transfer', value: {'2': 1}}]);
					expect(await utils.movContr.find()).toEqual(tt.ee([
						{priceAmount: 5, direction: MovementDirection.internalInput},
						{priceAmount: 5, direction: MovementDirection.internalOutput},
						{priceAmount: 1, direction: MovementDirection.internalInput},
						{priceAmount: 1, direction: MovementDirection.internalOutput},

						{priceAmount: 10, direction: MovementDirection.input},
					]));
				});
				
				it('does not override order updates if the model was modified by user', async () => {
					const x = await utils.contr.save([{l: [{prod: [{am: 10, tr: {['2']: 5}}, {am: 3}]}]}]);
					await utils.transContr.patch((await utils.transContr.find())[0], [{op: 'set', path: 'endDate', value: 55}]);
					await utils.transContr.patch((await utils.transContr.find())[0], [{op: 'set', path: 'list.0.manual', value: [{description: 'hello'}]}]);

					expect(await utils.transContr.find()).toEqual(tt.ee([
						{endDate: 55, list: [{manual: [{description: 'hello'}]}]},
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'endDate', value: 10}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{endDate: 55, list: [{manual: [{description: 'hello'}]}]},
					]));

					await utils.contr.patch(x[0], [{op: 'set', path: 'list.0.products.1.transfer', value: {'2': 1}}]);
					expect(await utils.transContr.find()).toEqual(tt.ee([
						{endDate: 55, list: [{manual: [{description: 'hello'}]}]},
					]));
				});

			});

		});

	});

	it('calls sale add analysis', async () => {
		const mock = jest.spyOn(SaleAnalysisController.prototype, 'addAnalysis');
		
		await utils.contr.save([{totalPrice: 100}, {totalPrice: 102}]);
		expect(mock).toHaveBeenCalledTimes(1);
		expect(mock).toHaveBeenCalledWith(expect.anything(), utils.instance.modelClass, utils.instance.modelStatus, tt.ee([{totalPrice: 100}, {totalPrice: 102}]));

		await utils.contr.save([{totalPrice: 150}, {totalPrice: 1}]);
		expect(mock).toHaveBeenCalledTimes(2);
		expect(mock).toHaveBeenCalledWith(expect.anything(), utils.instance.modelClass, utils.instance.modelStatus, tt.ee([{totalPrice: 150}, {totalPrice: 1}]));

		mock.mockRestore();
	});

});


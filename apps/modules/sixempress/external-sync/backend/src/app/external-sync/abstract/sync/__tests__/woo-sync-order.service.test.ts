import { WooOrder } from "@woocommerce/woocommerce-rest-api";
import to from "await-to-js";
import { RequestHelperService } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { REMOTE_STATUS, WooSyncOrdersService } from "../sync-orders.service";
import { WooSyncProductMovementsService } from "../sync-product-movements.service";
import { Product, ExternalConnection, ProductType, ProductMovementController, CustomerOrder, CustomerOrderController } from "../../../external-conn-paths/sync-config.dtd";

type pDataToObjType = Product['_amountData'] | (Array<{[locId: string]: any} & {__obj?: number} & {__id?: any}>);

const _e = {
	'notSaleableRemainance': 1,
	'saleableVariation': 2,
	'different': 3,
}

const utils = (() => {

	const _internal = {
		reqObj: () => tt.generateRequestObject({authzString: tt.generateAuthzString({allLocs: false})}),
		extConfig: {
			_id: '1', 
			locationId: '1', 
			originUrl: '',
			auth: {},
		} as ExternalConnection,
	}

	
	return {
		extConfig: _internal.extConfig,
		reqObj: _internal.reqObj,
		getModelsArray: (pData: pDataToObjType, ep: Pick<ExternalConnection, '_id'> = tt.extConn): Product[] => {
			pData = Array.isArray(pData) ? pData : [pData];

			return pData.map((i, idx) => {
				// remove special __obj field
				const am = {...i};
				delete am.__obj;
				delete am.__id;
				
				const tor: any = {
					groupData: {name: 'a', type: ProductType.product},
					documentLocationsFilter: ['*'],
					infoData: {},
					setAmount: am,

					_amountData: am,
					_metaData: {_externalIds: [{
						_externalConnectionId: ep._id, 
						// if the __obj is special then we put a random id as to let the "main" object be taken always
						_id: i.__obj ? parseInt(Math.random().toString().substr(4)) : 1}
					]},
					// also create different variation data to ensure the model is different from the non deleted version
					variationData: 
						!i.__obj ?                             {sellPrice: 1, buyPrice: 1, variants: []} :
						// saleable means variants and sellPrice is equal
						i.__obj === _e.saleableVariation ?     {sellPrice: 1, buyPrice: 9, variants: []} :
						// not saleable is either invalid variants or sellPrice
						i.__obj === _e.notSaleableRemainance ? {sellPrice: 9, buyPrice: 1, variants: []} :
						// different has some variants different
						i.__obj === _e.different ?             {sellPrice: 1, buyPrice: 1, variants: [{name: '1', value: '2'}]} :
						{}
				};

				if (i.__id)
					tor._id = i.__id;
				
				if (i.__obj)
					tor._deleted = RequestHelperService.getCreatedDeletedObject(utils.reqObj());

				return tor;

			}) as Product[];
		},
		pMovController: tt.getBaseControllerUtils({controller: new ProductMovementController()}),
		prodController: tt.getProdController({req: _internal.reqObj()}),
		orderController: tt.getBaseControllerUtils<CustomerOrder, CustomerOrder, CustomerOrderController>({
			controller: new CustomerOrderController(),
		}),
	};
})();

beforeEach(async () => {
	await tt.dropDatabase();
	WooSyncOrdersService['SUBTRACTED_CACHE'] = {};
});

describe('woo sync order', () => {

	it.todo('maps correctly the status from remote to local');
	
	it.todo('maps correctly the status from local to remote');
 
	it.todo('adds the WooOrder.date_created');
	
	it.todo('when remote status becomes non saleable then the sale is deleted when updating the order');

	it.todo('if the product was deleted (line_item.product_id is 0), then the item is set as manual move to keep the money info');

	it.todo('when creating the order, but before saving, changing the amount, the prenoted data is wronged');

	it.todo('calls ProductGroupController with {keepAllVariations: true}');

	it.todo('the remote order can reference a "_deleted" variantID, meaning a not using anymore variant');

	it.todo('the remote order can reference a non existing variantID but existing groupID and it checks for equal variations, otherwise saves "manual" row');
	
	it.todo('the remote order can reference a product that was never synced, and save it as a "manual" row');

	// if we do a sync with an empty local dbs, we sync first the product (and their stock as the product does not exist)
	// then we sync the orders
	// 
	// this means that if product "A" has 5 stock remote, when we sync we create a local product "A" with 5 stock
	// then we sync remote order that asks for 2 "A", and when we create that local order, the local product "A" will be 5 - 2 = 3
	// while the remote will still be 5
	// 
	// this means that after the order sync we have to check for these things ??
	// or maybe just say to the user to sync again with "force stock from remote" ?
	// 
	// or even better after the sync we check for stock discrepancies and if present we suggest the user to sync again ?
	it.todo('after the order sync we re-sync the new products as to conform the stock')

	describe('uses WooSyncProductMovementsService.createAmountDataForSubtractionByVariation for product amount', () => {

		const fn = async (orders: Partial<WooOrder>[], locIds: string[], useAll?: true) => {

			const ref: {[id: string]: WooOrder} = {};
			for (let i = 0; i < orders.length; i++) {
				const o = orders[i];
				if (!o.id)    o.id = i + 1;
				if (!o.total) o.total = '1.00';
				if (!o.status) o.status = REMOTE_STATUS.completed;

				ref[o.id] = o;
			}

			const ids = Object.keys(ref).map(i => parseInt(i));

			const conn = {...tt.extConn};
			conn.locationId = locIds[0];
			conn.additionalStockLocation = {}
			if (locIds)
				conn.additionalStockLocation.orderedIds = locIds.slice(1);
			if (useAll)
				conn.additionalStockLocation.useAll = useAll;

			await WooSyncOrdersService.processOrders(conn, utils.reqObj(), ids, ref);

			const remoteIds = orders.map(o => o.id);
			
			const saved = (await utils.orderController.find({'_metaData._externalIds._id': {$in: remoteIds}}));
		
				// rempap this betch
			const prods: Array<Array<{item: {id: string}, amounts: {[locId: string]: number}}>> = [];
			for (const s of saved) {
				const ps: Array<{item: {id: string}, amounts: {[locId: string]: number}}> = [];
				for (const l of s.list) {
					for (const p of l.products) {
						const ams = {};

						let transfered = 0;
						if (p.transfer) {
							for (const id in p.transfer) {
								ams[id] = p.transfer[id]
								transfered += p.transfer[id];
							}
						}
						if (p.amount - transfered)
							ams[s.physicalLocation] = p.amount - transfered;

						ps.push({item: {id: p.item.id}, amounts: ams});
					}
				}
				prods.push(ps);
			}
			
			if (prods.length === 1)
				return prods[0];
			return prods;
		}

		it('calls WooSyncProductMovementsService.createAmountDataForSubtractionByVariation', async () => {
			const mock = jest.spyOn(WooSyncProductMovementsService, 'createAmountDataForSubtractionByVariation');
			await utils.prodController.save([{ms: utils.getModelsArray([{a: 3}])}]);
			await fn([{line_items: [{product_id: 1, quantity: 1} as any]}], ['a']);
			expect(mock).toHaveBeenCalledTimes(1);
			mock.mockRestore();
		});

		it('simply subs from ep position', async () => {

			let id = new ObjectId().toString();
			await utils.prodController.save([{ms: utils.getModelsArray([
				{__id: id, a: 3, b: 3},
				{a: 3, b: 3, __obj: _e.different},
				// {a: 3, b: 4, __obj: _e.saleableVariation},
				{a: 3, b: 3, __obj: _e.notSaleableRemainance},
			])}]);

			expect(await fn([{
				line_items: [{product_id: 1, quantity: 7} as any],
			}], ['a']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id}), amounts: {a: 7}}),
			]));

		});

		it('remembers the stock used by the last order in current processing array', async () => {
			await utils.prodController.save([{ms: utils.getModelsArray([
				{a: 3, b: 3},
			])}]);

			expect(await fn([{
				line_items: [{product_id: 1, quantity: 2} as any],
			}, {
				line_items: [{product_id: 1, quantity: 2} as any],
			}, {
				line_items: [{product_id: 1, quantity: 10} as any],
			}], ['a', 'b']))
			.toEqual(tt.ea([
				tt.ea([ tt.eo({amounts: {a: 2}}) ]),
				tt.ea([ tt.eo({amounts: {a: 1, b: 1}}) ]),
				tt.ea([ tt.eo({amounts: {b: 2, a: 8}}) ]),
			]));

			expect(await fn([{
				id: 9999,
				line_items: [{product_id: 1, quantity: 11} as any],
			}], ['a', 'b']))
			.toEqual(tt.ea([
				tt.eo({amounts: {a: 11}}),
			]))

		});

		it('can change prod amount', async () => {

			const getItem = async () => (await utils.prodController.find())[0].models[0]._amountData;

			await utils.prodController.save([{ms: utils.getModelsArray([
				{a: 3, b: 3},
			])}]);
			expect(await getItem()).toEqual({a: 3, b: 3});

			expect(await fn([{
				id: 1,
				line_items: [{product_id: 1, quantity: 7} as any],
			}], ['a']))
			.toEqual(tt.ea([
				tt.eo({amounts: {a: 7}}),
			]));
			expect(await getItem()).toEqual({a: -4, b: 3});

			expect(await fn([{
				id: 1,
				line_items: [{product_id: 1, quantity: 10} as any],
			}], ['a']))
			.toEqual(tt.ea([
				tt.eo({amounts: {a: 10}}),
			]));
			expect(await getItem()).toEqual({a: -7, b: 3});

			expect(await fn([{
				id: 1,
				line_items: [{product_id: 1, quantity: 3} as any],
			}], ['a']))
			.toEqual(tt.ea([
				tt.eo({amounts: {a: 3}}),
			]));
			expect(await getItem()).toEqual({b: 3});

		});

		it('does not changes remainances on save', async () => {
			const ids = Array(4).fill(0).map(_ => new ObjectId().toString());
			await utils.prodController.save([{ms: utils.getModelsArray([
				{__id: ids[0], a: 3, b: 3},
				{__id: ids[1], a: 3, b: 4, __obj: _e.saleableVariation},
				{__id: ids[2], a: 3, b: 4, __obj: _e.notSaleableRemainance},
				{__id: ids[3], a: 3, b: 4, __obj: _e.different},
			])}]);

			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.processing,
				line_items: [{product_id: 1, quantity: 6} as any],
			}], ['a']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[0]}), amounts: {a: 3}}),
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {a: 3}}),
			]));
			

			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.completed,
				line_items: [{product_id: 1, quantity: 6} as any],
			}], ['a']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[0]}), amounts: {a: 3}}),
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {a: 3}}),
			]));
			

		});

		it('negative stock with multiple locs, weird bug', async() => {

			const ids = Array(2).fill(0).map(() => new ObjectId().toString());
			await utils.prodController.save([{ms: utils.getModelsArray([
				{__id: ids[0], "A": -2},
				{__id: ids[1], "A": 1, "B": 6, __obj: _e.saleableVariation},
			])}]);
			
			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.processing,
				line_items: [{product_id: 1, quantity: 3} as any]
			}], ['A', 'B']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {'A': 1, 'B': 2}}),
			]));

			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.processing,
				line_items: [{product_id: 1, quantity: 3} as any]
			}], ['A', 'B']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {'A': 1, 'B': 2}}),
			]));

			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.processing,
				line_items: [{product_id: 1, quantity: 4} as any]
			}], ['A', 'B']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {'A': 1, 'B': 3}}),
			]));
			

		});

		it('even weirder', async () => {
			const ids = Array(2).fill(0).map(() => new ObjectId().toString());
			await utils.prodController.save([{ms: utils.getModelsArray([
				{__id: ids[0], "1_2": -2, '1_1': 3},
				{__id: ids[1], "1_2": 1, "1_1": 6, __obj: _e.saleableVariation},
			])}]);
			
			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.processing,
				line_items: [{product_id: 1, quantity: 5} as any]
			}], ['1_2', '1_1']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[0]}), amounts: {'1_1': 3}}),
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {'1_2': 1, '1_1': 1}}),
			]));

			expect(await fn([{
				id: 1,
				status: REMOTE_STATUS.processing,
				line_items: [{product_id: 1, quantity: 6} as any]
			}], ['1_2', '1_1']))
			.toEqual(tt.ea([
				tt.eo({item: tt.eo({id: ids[0]}), amounts: {'1_1': 3}}),
				tt.eo({item: tt.eo({id: ids[1]}), amounts: {'1_2': 1, '1_1': 2}}),
			]));
			
		});

		
		describe('model update after stock change', () => {
			
			it('cached subraction does not interfer with the correct stock', async () => {
				const ids = Array(2).fill(0).map(() => new ObjectId().toString());
				await utils.prodController.save([{ms: utils.getModelsArray([
					{__id: ids[0], "A": 1, 'B': 3},
				])}]);
	
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 1} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 1}}),
				]));
	
				let pgs = await utils.prodController.find({});
				expect(pgs[0].models[0]._amountData['A']).toBe(undefined);
				expect(pgs[0].models[0]._amountData['B']).toBe(3);
				// load 1 item into db
				await utils.prodController.setAmount(pgs[0].models[0]._id, {'A': 1});
				// expect adjusted stock
				pgs = await utils.prodController.find({});
				expect(pgs[0].models[0]._amountData['A']).toBe(1);
				expect(pgs[0].models[0]._amountData['B']).toBe(3);

				expect(await fn([{
					// re-patch the old item
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 1} as any]
				}, {
					// and also create a new one
					id: 2,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 1} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					// as we have 1 already created order, it will take that cached 1 amount
					tt.ea([tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 1}})]),
					// and the other order will take the 1 that we loaded earlier
					tt.ea([tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 1}})]),
				]));
				
			});

			// if we have 2 stock in A and 3 in B
			// if we order 5 items
			//
			// the results will be, 2 A, 3 B
			//
			// if in the future, A is refilled with 10 items
			// and we re-updated (or re-sync) the woocommerce order
			//
			// then the new order will be 5 A as A has the stock isntead of the old 2 A 3 B..
			it('keeps the same transfer amounts when updating an existing order', async () => {
				const ids = Array(2).fill(0).map(() => new ObjectId().toString());
				const pgs = await utils.prodController.save([{ms: utils.getModelsArray([
					{__id: ids[0], "A": 2, 'B': 3},
				])}]);
				
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 5} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 2, 'B': 3}}),
				]));
	
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 5} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 2, 'B': 3}}),
				]));
	
				await utils.prodController.setAmount(pgs[0].models[0]._id, {'A': 10});
	
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 5} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 2, 'B': 3}}),
				]));

				// decrease 1
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 4} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 2, 'B': 2}}),
				]));
	
			});

			it('only adds the diff when increasing the stock amount required', async () => {
				const ids = Array(2).fill(0).map(() => new ObjectId().toString());
				const pgs = await utils.prodController.save([{ms: utils.getModelsArray([
					{__id: ids[0], 'A': 2, 'B': 3},
				])}]);
				
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 5} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 2, 'B': 3}}),
				]));
	
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 5} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 2, 'B': 3}}),
				]));
	
				await utils.prodController.setAmount(pgs[0].models[0]._id, {'A': 10});
	
				expect(await fn([{
					id: 1,
					status: REMOTE_STATUS.processing,
					line_items: [{product_id: 1, quantity: 6} as any]
				}], ['A', 'B']))
				.toEqual(tt.ea([
					tt.eo({item: tt.eo({id: ids[0]}), amounts: {'A': 3, 'B': 3}}),
				]));
				
			});

		});


	});

	it('delets empty billing/shipping fields', () => {
		const fn = (ref: WooOrder) => {
			return WooSyncOrdersService['translateItem'](utils.extConfig, {customerHm: {}, prodGroupHm: {}, productsHm: {}}, ref);
		} 
		let a = fn({total: '1', line_items: [], shipping: {} as any, billing: {} as any}).model;
		expect(a.shipping).toEqual(undefined);
		expect(a.billing).toEqual(undefined);
	})

	// this test should be in the AbstractSaleableOrder, but we put it here for redundace
	it('doesnt create reserved stock when failing to save', async () => {
		
		// mock the translate function to create an error in the model
		const old = WooSyncOrdersService['translateItem'];
		const mock = jest.spyOn(WooSyncOrdersService, 'translateItem' as any);
		mock.mockImplementation((...args: any[]) => {
			const obj = old(args[0], args[1], args[2], args[3]);
			obj.model.billing = {phone: null};
			return obj;
		});

		// create a product to reference
		(await utils.prodController.save([{ms: [{extId: [{id: 1, ext: utils.extConfig._id}]}]}]))[0];
		// expect there to be no movements
		expect(await utils.pMovController.find()).toHaveLength(0)
		
		// save order that will error
		await to(WooSyncOrdersService.processOrders(
			utils.extConfig, 
			utils.reqObj(), 
			[1], 
			{[1]: {status: 'processing', total: '1', line_items: [{product_id: 1, quantity: 1} as any]}}
		));
		// expect for the prod mov to still be zero
		expect(await utils.pMovController.find()).toHaveLength(0)

		// restore and save again order
		mock.mockRestore();
		await to(WooSyncOrdersService.processOrders(
			utils.extConfig, 
			utils.reqObj(), 
			[1], 
			{ [1]: { status: 'processing', total: '1', line_items: [{product_id: 1, quantity: 1} as any]}}
		));
		// expect for the prod mov to be correctly set now
		expect(await utils.pMovController.find()).toHaveLength(1)
	});

});

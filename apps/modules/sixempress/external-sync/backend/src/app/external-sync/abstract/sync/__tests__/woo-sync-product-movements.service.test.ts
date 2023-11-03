import { CustomerOrderController } from "@paths/multi-purpose/customer-orders/CustomerOrder.controller";
import { Product, ProductType } from "@paths/multi-purpose/products/Product";
import { ProductMovement, ProductMovementType } from "@paths/multi-purpose/products/product-movements/ProductMovement";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";
import { ProductGroup } from "@paths/multi-purpose/products/ProductGroup";
import { ExternalSyncUtils } from "@services/external-sync/external-sync.utils";
import { getMetaDataPrefix } from "@services/external-sync/syncable-model";
import { ExternalConnection, ExternalConnectionType } from "@services/multip-config/multip-config.dtd";
import { ModelClass } from "@utils/enums/model-class.enum";
import { CrudUpdatesService, CrudCollection, FetchableField, MongoUtils, ObjectUtils, RequestHelperService, CrudType } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { SyncLocalToRemoteService } from "../../local-to-remote.service";
import { SyncRemoteToLocalService } from "../../remote-to-local.service";
import { AddedIdInfo } from "../../woo.dtd";
import { WooTypes, WPRemotePaths } from "../../woo.enum";
import { ProductGroupTypeController, ProductTypeController } from "../ProductType.controller";
import { REMOTE_STATUS, WooSyncOrdersService } from "../sync-orders.service";
import { WooSyncProductMovementsService } from "../sync-product-movements.service";
import { SyncableModel } from '../../../syncable-model';

type pDataToObjType = Product['_amountData'] | (Array<Product['_amountData'] & {__obj?: number, __del?: number}>);

const utils = (() => {
	
	const _internal = {
		getReqObj: ((i) => {
			return tt.generateRequestObject({authzString: {allLocs: false}, ...(i || {})});
		}) as (typeof tt)['generateRequestObject'],
		extConfig: {_id: 'extconn_id', originUrl: tt.testSlug, locationId: '1', type: ExternalConnectionType.wordpress} as ExternalConnection,
	}

	ExternalSyncUtils.getExternalConnections = async () => [_internal.extConfig];

	return {
		syncAllPMovs: async (movs?: ProductMovement[], opts: {extConfigs?: ExternalConnection[], addInfo?: AddedIdInfo, crudType?: CrudType, preserveCache?: true} = {}) => {

			const mToUse = movs || (await utils.movController.find({}, {skipFilterControl: true}));
			const info: AddedIdInfo = opts.addInfo || {};
			if (!opts.addInfo)
			for (const m of mToUse)
				info[m._id.toString()] = { addedMs: 0, emitType: opts.crudType || 'create' };

			const r = await WooSyncProductMovementsService.buildProductMovement(
				opts.extConfigs || [utils.extConfig], 
				utils.getReqObj(), 
				tt.testSlug,
				info,
				mToUse
			);
			if (!opts.preserveCache)
				utils.resetCache();
			return r;
		},
		startCrud: () => {
			CrudCollection.isEnabled = true;
			utils.ltrService.start();
		},
		stopCrud: () => {
			CrudCollection.isEnabled = false;
			CrudUpdatesService['actReg'].actions = [];
		},
		ltrService: new SyncLocalToRemoteService(),
		rtlService: new SyncRemoteToLocalService(),
		getReqObj: _internal.getReqObj,
		extConfig: _internal.extConfig,
		getCache: () => WooSyncProductMovementsService['TEMP_MOVEMENT_CACHE'],
		resetCache: () => WooSyncProductMovementsService['TEMP_MOVEMENT_CACHE'] = {},
		controller: tt.getProdController({req: _internal.getReqObj(), extConn: _internal.extConfig}),
		prodController: tt.getProdController(),
		movController: {
			...tt.getBaseControllerUtils<ProductMovement, Partial<ProductMovement> & {pid?: string | ObjectId}, ProductMovementController>({ 
				controller: new ProductMovementController(), 
				partialToFull: async (is) => {
					const r: ProductMovement[] = [];
					for (const i of is) {
						if (typeof i.amount !== 'number')
							i.amount = 1;

						if (i.pid && !i.targetProductInfo) {
							const p = (await utils.controller.controller.getRawCollection(tt.testSlug).findOne({_id: new ObjectId(i.pid)}));
							delete i.pid;
							i.targetProductInfo = {
								product: new FetchableField(p._id, ModelClass.Product),
								productsGroupId: p._trackableGroupId,
							}
						}
						if (!i.movementType)
							i.movementType = ProductMovementType.manualChange;
						
						if (!i.documentLocation)
							i.documentLocation = '1'
						
						r.push(i as ProductMovement);
					}
					return r;
				},
				reqObj: _internal.getReqObj,
			}),
		},
	}
})();


beforeEach(async () => {
	utils.resetCache();
	utils.stopCrud();
	utils.rtlService['syncRequestItems'] = {}
	utils.ltrService['syncRequestItems'] = {}
	await tt.dropDatabase();
});

describe('woo-sync-product-movements.service', () => {

	it('does not send to remote the movement changes to a synced order', async () => {
		// this order comes from DEF
		const models: Partial<SyncableModel>[] = [
			{ _metaData: { _externalIds: [{ _id: 101, _externalConnectionId: 'def' }] }, },
		];
		await new CustomerOrderController().getCollToUse(utils.getReqObj()).insertMany(models);

		// but the product is synced to "DEF" and "ABC"
		const pid = (await utils.prodController.save([{ms: [{extId: [
			{ id: 1, ext: 'def' },
			{ id: 2, ext: 'abc' },
		]}]}]))[0].models[0]._id;

		// so when a stock order is created from the order
		const movs = await utils.movController.save(models.map(m => (
			{ _generatedFrom: { modelClass: ModelClass.CustomerOrder, id: m._id.toString() }, pid }
		)));

		// and we sync all the endpoints
		const b = await utils.syncAllPMovs(movs, {extConfigs: [
			{ ...utils.extConfig, _id: 'def' },
			{ ...utils.extConfig, _id: 'abc' },
		]});

		// we expect to publish the diff only to ABC
		// as the order is synced with DEF which will handle the change himself
		expect(b).toEqual(tt.ee([
			{ ec: { _id: 'def' }, remote: [] },
			{ ec: { _id: 'abc' }, remote: [{amount: 1, id: 2}] },
		]))
	});

	it.todo('does not send the mov if there are two movs cancelling each other out. ie +5 -5');

	describe('hash valid', () => {

		it('does not send a movement if we update an old not synced one', async () => {
			const allSent = [];
	
			await utils.prodController.save([{ms: [{extId: [1], setAmount: {['1']: 1}}]}, {ms: [{extId: [5], setAmount: {['1']: 10}}]}]);
			
			// not synced, so errors
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'update'}))[0].remote);
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'delete'}))[0].remote);
			expect(allSent).toHaveLength(0);

			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'create'}))[0].remote);
			expect(allSent).toHaveLength(2);
			// ensure that the function returns alwaysa the same legnth
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'create'}))[0].remote);
			expect(allSent).toHaveLength(4);
	
			// set 1 to deleted
			await utils.movController.controller.getRawCollection(tt.testSlug).updateOne({}, {$set: {_deleted: RequestHelperService.getCreatedDeletedObject(utils.getReqObj())}});
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'create'}))[0].remote);
			// as one is deleted, we only add +1
			expect(allSent).toHaveLength(5);
		});

		it('sends if we update a model that was already synced', async () => {
			const allSent = [];
	
			await utils.prodController.save([{ms: [{extId: [1], setAmount: {['1']: 1}}]}, {ms: [{extId: [5], setAmount: {['1']: 10}}]}]);
			
			// not synced, so errors
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'update'}))[0].remote);
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'delete'}))[0].remote);
			expect(allSent).toHaveLength(0);

			// set to an outdated hash to simulate that the mov was synced
			await utils.movController.controller.getRawCollection(tt.testSlug).updateMany(
				{}, 
				{$set: {_metaData: {_externalIds: [{_externalConnectionId: utils.extConfig._id, _id: 'a'}]}}}
			);

			// expect for both to work
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'update'}))[0].remote);
			expect(allSent).toHaveLength(2);
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'delete'}))[0].remote);
			expect(allSent).toHaveLength(4);

			// set 1 to deleted
			await utils.movController.controller.getRawCollection(tt.testSlug).updateOne({}, {$set: {_deleted: RequestHelperService.getCreatedDeletedObject(utils.getReqObj())}});
			allSent.push(...(await utils.syncAllPMovs(undefined, {crudType: 'update'}))[0].remote);
			// as one is deleted, but it has a has, we should receive both
			expect(allSent).toHaveLength(6);
		});

	});

	it('updates remote stock when we\'re updating a remainance', async () => {

		const buildFn = (ms: ProductMovement[]) => {
			return utils.syncAllPMovs(ms);
		}

		// create the scenario
		await utils.prodController.save([{ms: [
			// the remainigs
			{_deleted: 1, variationData: {sellPrice: 1, buyPrice: 1}}, 
			// the synced item
			{extId: [1], variationData: {sellPrice: 1, buyPrice: 2}},
		]}]);
		const pgs = await utils.prodController.find({}, {returnFullGroupOnMatch: true, keepAllVariations: true});
		const remaining = pgs[0].models.find(m => m._deleted);

		// trigger build
		const mvs = await utils.movController.save([{pid: remaining._id, amount: 10}]);
		const b = await buildFn(mvs);

		// expect to push to remote correct id and amount
		expect(b[0].remote).toEqual([{id: 1, amount: 10}]);
	});

	describe('findStockDiscrepancies && syncStock', () => {
		// syncStock was not skipping _deleted models
		// findStockDiscrepancies() was using getStockByVariation() which was NOT using findRelevantSaleableModelByRemoteId() lmao
		it.todo('uses the non _deleted model as base ref for a given remoteId');

		it.todo('ignores the externalSync.disabled.id');

		// instead of 
		// if (m._deleted)
		// 	continue;
		// const id = WooSyncProductsService.getRemoteId(m, ep) as number;
		//
		// use
		// const id = WooSyncProductMovementsService.findActiveSaleableByModelRemoteId(pg, ep, m);
		it.todo('uses the non deleted variant to get the correct product id');

	});

	it('transfers correctly the stock when creating a variation that willMoveAmountOnSave()', async () => {

		let allSent = [];

		let pgs = await utils.prodController.save([{ms: [{extId: [1], v: {sellPrice: 10}, setAmount: {['1']: 1}}]}]);
		allSent.push(...(await utils.syncAllPMovs())[0].remote);
		expect(allSent).toEqual(tt.ea([{id: 1, amount: 1}]));
		allSent = [];
		
		// as we create a new variable, the external id is changed also
		pgs[0].models[0].variationData.sellPrice = 20;
		pgs[0].models[0]._metaData._externalIds[0]._id = 9;
		await utils.prodController.put(pgs[0]);
		expect((await utils.prodController.find({}, {keepAllVariations: true}))).toEqual(tt.ee([
			{models: [
				{_metaData: {_externalIds: [{_id: 1}]}, variationData: {sellPrice: 10}, _amountData: {}},
				{_metaData: {_externalIds: [{_id: 9}]}, variationData: {sellPrice: 20}, _amountData: {'1': 1}},
			]}
		]));
		allSent.push(...(await utils.syncAllPMovs())[0].remote);

		// movs cancel each other out
		expect(allSent).toEqual(tt.ea([/* , {id: 9, amount: -1}, {id: 9, amount: 1} */]));
		allSent = [];
	});

	it.todo('sets the amount of local product stock "setManualProductAmount()"');

	// this is to ensure that if the same prod mov is modified after it's created
	// we cache it in the processing array, and we use the caching/processing logic we wrote
	// that resyncs the item after the first sync, thus ensuring that the changes are correctly sent to remote
	//
	// example we create a prodmov and immediately do a patch set to deleted.
	// normally as we send the prod mov immediately, the patched mov would be discarded as the first one is still processing
	// using our cache/processing logic, we would wait for the first process to complete before sending once again the changed second stock
	it.todo('calls syncCrudUpdates on processCrudActions');

	it.todo('ensures that the items with omittedUrls are NOT sent but are still updated with bulkWrite');

	it('sends the amount online on crud update', async () => {

		const p = (await utils.controller.save([{
			ms: [{extId: [1]}]
		}]))[0].models[0];
		const pid = p._id.toString();

		const args = [];
		const mock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
		mock.mockImplementation(async (...a) => {
			if (a[2].includes('product_amount')) {
				await tt.wait(400);
				args.push(a[3].items) as any
			}
			// return product ids
			// as they are created as prdoMov depends on it
			else {
				return {items: { 1: {meta_data: [{
					key: getMetaDataPrefix(tt.testSlug) + 'product_group_id',
					value: p._trackableGroupId,
				}, {
					key: getMetaDataPrefix(tt.testSlug) + 'product_id',
					value: pid,
				}]}}};
			}
		});

		utils.startCrud();
		utils.movController.save([{pid, amount: 1}]);
		utils.movController.save([{pid, amount: -1}]);
		
		utils.movController.save([{pid}]);
		utils.movController.save([{pid, _deleted: RequestHelperService.getCreatedDeletedObject(utils.getReqObj())}]);
		
		let m = await utils.movController.save([{pid}]);
		utils.movController.delete({_id: m[0]._id});

		// after we send all togheter let's wait for all to be complete
		await tt.wait(1000);

		expect(args).toEqual(tt.ea([
			// [tt.eo({amount: 1})], // first save
			// [tt.eo({amount: -1})], // second save
			
			// [tt.eo({amount: 1})], // third save
			// // as the fourth save was already _deleted with no prior externalid
			// // we do not sync it
			// // [tt.eo({amount: 1})],

			// // fifth
			// [tt.eo({amount: 1})],
			// // deleted fifth means we revoke back the amount
			// [tt.eo({amount: -1})],

			
			// all the above are summed into one single movement
			[tt.eo({amount: 1})]
		]));

		mock.mockRestore();
	});

	it('concurrency error ?', async () => {


		// log hash before and after the await
		// maybe the items are modified by ref when bulkWrite() is executed ?

		// throw 'todo'
		const mock2 = jest.spyOn(ExternalSyncUtils, 'getExternalConnections');
		mock2.mockImplementation(async () => [
			{ ...utils.extConfig, _id: 'ccc' },
			{ ...utils.extConfig, },
		]);

		let orderStatus;
		const args = [];
		const mock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
		mock.mockImplementation(async (...a) => {
			if (a[2].includes('product_amount')) {
				await tt.wait(400);
				args.push(a[3].items) as any
			}
			else if (a[2].includes(WPRemotePaths.aggregate_sync_ids)) {
				return {[WooTypes.order]: {
					1: { id: 1, status: orderStatus, line_items: [{product_id: 1, quantity: 2} as any], total: '1.00', },
				}}
			}
		});

		await utils.controller.save([{ms: [{extId: [
			{id: 1, ext: utils.extConfig._id},
			{id: 1, ext: 'ccc'},
		]}]}]);

		const ord = async (state?: REMOTE_STATUS) => {
			orderStatus = state;

			await utils.rtlService['syncCrudUpdates']({
				[tt.testSlug] : {
					meta: {apiKey: '', ext: utils.extConfig, slug: tt.testSlug},
					data: {[WooTypes.order]: {1: {addedMs: 0}}},
				}
			});
		};
		
		const old = utils.ltrService['processLocalCrudAction'].bind(utils.ltrService);
		const processLtrMock = jest.spyOn(utils.ltrService, 'processLocalCrudAction' as any);
		processLtrMock.mockImplementation((...args: any) => {
			args[0].headers['x-origin-url'] = null;
			return (old as any)(...args);
		});

		utils.startCrud();

		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.processing);
		await ord(REMOTE_STATUS.failed);
		await ord(REMOTE_STATUS.processing);
		await tt.wait(2000);

		let tot = 0;
		for (const a of args)
			for (const i of a)
				tot += i.amount;

		const allItems: ProductMovement[] = (await (new ProductMovementController().getRawCollection(tt.testSlug).find().toArray())).map(i => ({...i, _id: i._id.toString()}));
		const dbSum = allItems.reduce((car, cur) => car += cur._deleted ? 0 : cur.amount, 0);
		
		// the db should equal to the total sent
		expect(dbSum).toEqual(tot);
		expect(dbSum).toBe(-2);
		
		// if we manually process the movs again, all are synced, thus no item is given
		args.splice(0);
		await utils.ltrService['processLocalCrudAction'](utils.getReqObj(), '' as any, ModelClass.ProductMovement, allItems.map(i => i._id.toString()));
		expect(args).toHaveLength(0);

		processLtrMock.mockRestore();
		mock2.mockRestore();
	});
	
	// as the _deleted means "undo" if we did not send the original non deleted amount
	// then we don't send the deleted amount, as that wound not "undo" the original amount sent
	it('does not sync _deleted prodMovs if tthey were not synced originally', async () => {

		const pg = await utils.controller.save([{ms: [{extId: [1]}]}]);
		const gid = pg[0]._trackableGroupId;
		const pid = pg[0].models[0]._id.toString();

		const testMovs = async () => {
			const d = await utils.syncAllPMovs();
			utils.resetCache();
			return d;
		};

		await utils.movController.save([{
			amount: -10,
			targetProductInfo: {productsGroupId: gid, product: new FetchableField(pid, ModelClass.Product)},
			movementType: 5,
			documentLocation: '1',
			documentLocationsFilter: [ '1' ],
			date: 1627437810,
			_deleted: RequestHelperService.getCreatedDeletedObject(utils.getReqObj()),
		},
		{
			amount: -2,
			targetProductInfo: {productsGroupId: gid, product: new FetchableField(pid, ModelClass.Product)},
			movementType: 5,
			documentLocation: '1',
			documentLocationsFilter: [ '1' ],
			date: 1627437810,
		}]);

		// only the non deleted is present
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(-2);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(-2);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(-2);

		// add a deleted mov with a synced _metaData so it means that this will be processed
		await utils.movController.save([{
			amount: -2,
			targetProductInfo: {productsGroupId: gid, product: new FetchableField(pid, ModelClass.Product)},
			movementType: 5,
			documentLocation: '1',
			documentLocationsFilter: [ '1' ],
			date: 1627437810,
			_deleted: RequestHelperService.getCreatedDeletedObject(utils.getReqObj()),
			_metaData: {_externalIds: [{_externalConnectionId: utils.extConfig._id, _id: 1}]},
		}]);

		// now that we added a _deleted -2 mov, we expect 0
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(0);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(0);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(0);

	});

	it('when updating the order no mov changes are made', async () => {

		const mock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
		mock.mockImplementation(async ( ) => 0 as any);
		const mock2 = jest.spyOn(ExternalSyncUtils, 'getExternalConnections');
		mock2.mockImplementation(async () => [
			{ ...utils.extConfig, _id: 'ccc' },
			{ ...utils.extConfig, },
		]);

		await utils.controller.save([{ms: [{extId: [{id: 1, ext: utils.extConfig._id}, {id: 10, ext: 'ccc'}]}]}]);
		const ord = async (state?: REMOTE_STATUS) => {
			await WooSyncOrdersService.processOrders(utils.extConfig, utils.getReqObj(), [1], {1: {
				id: 1,
				status: state,
				line_items: [{product_id: 1, quantity: 2} as any],
				total: '1.00',
			}});
		};
		
		const movs = async () => {
			const ks: any = {};
			for (const m of await utils.movController.find({}, {skipFilterControl: true}))
				ks[m._id.toString()] = {addedMs: 1};

			await utils.ltrService['syncCrudUpdates']({[tt.testSlug]: {
				meta: {},
				data: {[ModelClass.ProductMovement]: ks}
			}});
		}

		const testMovs = async () => {
			const r = await utils.syncAllPMovs(undefined, {extConfigs: [
				{ ...utils.extConfig, _id: 'ccc'},
				{ ...utils.extConfig, },
			]})
			return r;
		};

		await ord(REMOTE_STATUS.completed);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(-2);
		await movs();
		
		await ord(REMOTE_STATUS.processing);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(0);
		await movs();

		await ord(REMOTE_STATUS.processing);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(0);
		await movs();

		// restore so +2
		await ord(REMOTE_STATUS.failed);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(2);
		await movs();

		// back to processing so -2
		await ord(REMOTE_STATUS.processing);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(-2);
		await movs();

		await ord(REMOTE_STATUS.completed);
		expect((await testMovs())[0].remote.reduce((car, cur) => car += cur.amount, 0)).toEqual(0);
		await movs();

		mock.mockRestore();
		mock2.mockRestore();
	});

	describe('findActiveSaleableByModel()', () => {

		const fn = (pgModels: Product[] | ProductGroup, model: Product) => {
			return WooSyncProductMovementsService['findActiveSaleableByModel']((Array.isArray(pgModels) ? {models: pgModels} : pgModels) as any as ProductGroup, utils.extConfig, model);
		};

		it('returns the active model of an models list', async () => {

			await utils.prodController.save([
				{ms: [
					{extId: [1], v: {sellPrice: 1, buyPrice: 100}},
					{extId: [1], _deleted: 1, v: {sellPrice: 1, buyPrice: 3}},
					{extId: [1], _deleted: 1, v: {sellPrice: 1, buyPrice: 1}},
					{_deleted: 1, v: {sellPrice: 1, buyPrice: 4}},
					{extId: [1], _deleted: 1, v: {sellPrice: 1, buyPrice: 2}},
				]},
			]);
			const pgs = await utils.prodController.find({}, {keepAllVariations: true, returnFullGroupOnMatch: true});

			// pass deleted one without ext id
			let a = fn(pgs[0], pgs[0].models.find(m => m._deleted && !m._metaData));
			// expect active model with ext id
			expect(a._deleted).toBe(undefined);
			expect(a._metaData).not.toBe(undefined);
			expect(a.variationData.buyPrice).toBe(100);

			// pass deleted one with ext id
			a = fn(pgs[0], pgs[0].models.find(m => m._deleted && m._metaData));
			expect(a._deleted).toBe(undefined);
			expect(a._metaData).not.toBe(undefined);
			expect(a.variationData.buyPrice).toBe(100);


			// add deleted to active object
			pgs[0].models.find(m => !m._deleted)._deleted = RequestHelperService.getCreatedDeletedObject(utils.getReqObj());
			// expect no item return as no active item are present
			a = fn(pgs[0], pgs[0].models.find(m => m._deleted && m._metaData));
			expect(a).toBe(undefined);


		});

	});

	describe('builds the prod mov to send respecting additionalStock', () => {
		
		const fn = async (movs: (string[]) | (ObjectId[]) | (ProductMovement[]), locIds: string[], useAll?: boolean) => {
			const ep: ExternalConnection = {...utils.extConfig, locationId: locIds[0], additionalStockLocation: {useAll: useAll as true, orderedIds: locIds.slice(1)}}
			
			let prodMov: ProductMovement[] = typeof movs[0] === 'string' || MongoUtils.isObjectId(movs[0])
				? await new ProductMovementController().getRawCollection(tt.testSlug).find({_deleted: {$exists: false}, _id: {$in: (movs as any).map(m => new ObjectId(m.toString()))}}).toArray()
				: movs;

			const r = await utils.syncAllPMovs(prodMov, {extConfigs: [ep]});
			return r[0].remote;
		};	

		it('respects extConn.locationId', async () => {
			await utils.controller.save([{ms: [{setAmount: {a: 1, b: 2}, extId: [1]}]}]);

			expect(await fn(await utils.movController.find(), ['a']))
				.toEqual(tt.ea([tt.eo({amount: 1})]));

			expect(await fn(await utils.movController.find(), ['b']))
				.toEqual(tt.ea([tt.eo({amount: 2})]));
		});

		it('respects addStock.useAll', async () => {
			await utils.controller.save([{ms: [{setAmount: {a: 1, b: 2, c: 3}, extId: [1]}]}]);

			expect(await fn(await utils.movController.find(), ['a'], true))
				.toEqual(tt.ea([tt.eo({amount: 6})]));
		});

		it('respects addStock.orderedIds', async () => {
			await utils.controller.save([{ms: [{setAmount: {a: 1, b: 2, c: 3}, extId: [1]}]}]);

			expect(await fn(await utils.movController.find(), ['a', 'b']))
				.toEqual(tt.ea([tt.eo({amount: 3})]));

			expect(await fn(await utils.movController.find(), ['a', 'b', 'c']))
				.toEqual(tt.ea([tt.eo({amount: 6})]));
		});

	});

	// as remote does not give us an id, we create one based on a hash
	// that is composed of the main info that remote accepts
	describe('hashed as remote id', () => {

		// even when we dont send we need to update the prod mov as to ensure that if modified a not "hashed" field
		// we dont send it again
		it.todo('sets info even if not sending the data to remote (omittedUrls)');

	});

	describe('remote to local product amounts', () => {

		const _e = {
			'notSaleableRemainance': 1,
			'saleableVariation': 2,
			'different': 3,
		}

		const getModelsArray = (ep: Pick<ExternalConnection, '_id'>, pData: pDataToObjType): Product[] => {
			pData = Array.isArray(pData) ? pData : [pData];

			return pData.map((i, idx) => {
				// remove special __obj field
				const am = {...i};
				delete am.__obj;
				delete am.__del;

				const tor: any = {
					groupData: {name: 'a', type: ProductType.product}, 
					documentLocationsFilter: ['*'],
					infoData: {},
					setAmount: am,

					_id: 'id' + idx,
					_amountData: am,
					_metaData: {_externalIds: [{
						_externalConnectionId: ep._id, 
						// if the __obj is special then we put a random id as to let the "main" object be taken always
						_id: (!i.__del && i.__obj) ? parseInt(Math.random().toString().substr(4)) : 1}
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
				
				if ((i.__obj && i.__del !== 0) || i.__del)
					tor._deleted = RequestHelperService.getCreatedDeletedObject(utils.getReqObj());

				return tor;

			}) as Product[];
		}

		describe('get amount', () => {

			const fn = (locId: string[], pData: pDataToObjType, useAll?: true) => {
				const ep: Partial<ExternalConnection> = {_id: 'conn_id', locationId: locId[0], additionalStockLocation: {orderedIds: locId.slice(1), useAll: useAll}};
				
				return WooSyncProductMovementsService.getStockByVariation(
					ep as ExternalConnection, 
					{models: getModelsArray(ep, pData)} as ProductGroup,
					1,
				);
			}

			it('returns only the locId', () => {
				expect(fn(['a'], {a: 1, b: 2})).toEqual(1);
				expect(fn(['b'], {a: 1, b: 2})).toEqual(2);
			});

			it('returns all with useAll', () => {
				expect(fn(['b'], {a: 1, b: 2, c: 3})).toEqual(2);
				expect(fn(['b'], {a: 1, b: 2, c: 3}, true)).toEqual(6);
			});

			it('returns ordered', () => {
				expect(fn(['b'], {a: 1, b: 2, c: 3})).toEqual(2);
				expect(fn(['b', 'a'], {a: 1, b: 2, c: 3})).toEqual(3);
				
				expect(fn(['b', 'a', 'c'], {a: 1, b: 2, c: 3})).toEqual(6);
				expect(fn(['b', 'c', 'a'], {a: 1, b: 2, c: 3})).toEqual(6);
			});

			it('sums other models', () => {
				expect(fn(['b'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.saleableVariation},
				])).toEqual(4);
				expect(fn(['b'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.notSaleableRemainance},
				])).toEqual(2);
				expect(fn(['b'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.different},
				])).toEqual(2);

				expect(fn(['b', 'a'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.saleableVariation},
				])).toEqual(6);
				expect(fn(['b', 'a'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.notSaleableRemainance},
				])).toEqual(3);
				expect(fn(['b', 'a'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.different},
				])).toEqual(3);

				expect(fn(['b', 'a'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.saleableVariation},
				], true)).toEqual(12);
				expect(fn(['b', 'a'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.notSaleableRemainance},
				], true)).toEqual(6);
				expect(fn(['b', 'a'], [
					{a: 1, b: 2, c: 3}, 
					{a: 1, b: 2, c: 3, __obj: _e.different},
				], true)).toEqual(6);
			});

		});

		describe('set amount', () => {

			const fn = async (locId: string[], pData: pDataToObjType, remoteStock: number, allLoc?: true) => {
				const ep: Partial<ExternalConnection> = {_id: 'conn_id', locationId: locId[0], additionalStockLocation: {orderedIds: locId.slice(1), useAll: allLoc}};

				const models = getModelsArray(ep, pData);
				// test the raw function
				const pgdata = WooSyncProductMovementsService['createAmountDataToSetByVariation'](
					ep as ExternalConnection,
					{models} as ProductGroup,
					1,
					remoteStock,
				);
				
				const remoteId_id: {[id: string]: {id: string, am: Product['_amountData']}} = {};
				for (const m of models)
					remoteId_id[m._metaData._externalIds[0]._id] = {id: m._id.toString(), am: m.setAmount};

				//
				// create a product
				//
				const req = utils.getReqObj({authzString: tt.generateAuthzString({allLocs: Object.keys(pData)})});
				
				models.forEach(m => delete m._id);
				
				await tt.dropDatabase();
				await new ProductGroupTypeController().saveToDb(req, [
					{groupData: models[0].groupData, documentLocationsFilter: models[0].documentLocationsFilter, models}
				]);
				
				let ps = await new ProductTypeController().findForUser(req, {}, {skipFilterControl: true});;

				// set the amount to deleted products
				// as when we save a _deleted with setAmount it does not work
				for (let i = 0; i < models.length; i++) {
					const mm = models[i]
					const m = ps.find(p => p._id.toString() === mm._id.toString());

					if (Object.keys(m._amountData).length)
						continue;

					// remove special __obj field
					const am = Array.isArray(pData) ? {...pData[i]} : {...pData};
					delete am.__obj;
					
					await utils.controller.setAmount(m._id, am);
				}

				// test also the set amount function
				await WooSyncProductMovementsService.setManualProductAmount(ep as ExternalConnection, req, {[1]: remoteStock});
				// console.log(await new ProductTypeController().findForUser(req, {}, {skipFilterControl: true}));

				//
				// ensure that the setManualProdAmount function has the exact data of the expected raw function
				// meaning that this function calls the function that we're testing
				//
				ps = await new ProductTypeController().findForUser(req, {}, {skipFilterControl: true});

				// remove zeroes
				const am = ObjectUtils.cloneDeep(pgdata);
				for (const id in am) 
					for (const k in am[id]) 
						if (!am[id][k]) 
							delete am[id][k];

				const mapped = {};
				for (const p of ps) {
					const data = remoteId_id[p._metaData._externalIds[0]._id];
					const remId = data.id;
					
					// only if the item has been changed we add
					if (!am[remId])
						continue;

					mapped[remId] = {};
					// add only the fields that have actually changed
					for (const loc in p._amountData)
						if (p._amountData[loc] !== data.am[loc])
							mapped[remId][loc] = p._amountData[loc];
				}

				expect(mapped).toEqual(am);

				return Array.isArray(pData) ? pgdata : pgdata[Object.keys(pgdata)[0]] || {};
			};
			
			it('calls setManualProductAmount to check', async () => {
				const mock = jest.spyOn(WooSyncProductMovementsService, 'setManualProductAmount');
				await fn(['a'], {a: 1}, 2);
				expect(mock).toHaveBeenCalledTimes(1);
				mock.mockRestore();
			});

			it('adds additional stock to online', async () => {

				expect((await fn(['a', 'b', 'c'], {a: 1, b: 2, c: 3}, 6)))
				.toEqual({});
				
				expect((await fn(['a', 'b', 'c'], {a: 1, b: 2, c: 3}, 7)))
				.toEqual({a: 2});

				expect((await fn(['a', 'b', 'c'], {a: 1, b: 2, c: 3}, 10)))
				.toEqual({a: 5});

				expect((await fn(['a', 'b'], {a: 1, b: 2, c: 3}, 10)))
				.toEqual({a: 8});

				expect((await fn(['a'], {a: 1, b: 2, c: 3}, 10)))
				.toEqual({a: 10});

			});

			it('removes stock from items in order', async () => {
				
				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, 10)))
				.toEqual({});

				expect((await fn(['a'], {a: 5, b: 2, c: 3}, 5)))
				.toEqual({});
				
				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, 5)))
				.toEqual({a: 0});

				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, 4)))
				.toEqual({a: 0, b: 1});

				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, 5)))
				.toEqual({a: 0});

				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, 1)))
				.toEqual({a: 0, b: 0, c: 1});

				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, 0)))
				.toEqual({a: 0, b: 0, c: 0});

				expect((await fn(['a'], [
					{a: 5, b: 2, c: 3, d: 10, e: 40},
					{a: 5, b: 2, c: 3, d: 10, e: 40, __obj: _e.notSaleableRemainance},
					{a: 5, b: 2, c: 3, d: 10, e: 40, __obj: _e.saleableVariation},
					{a: 5, b: 2, c: 3, d: 10, e: 40, __obj: _e.different},
				], 10)))
				.toEqual({
				});

			});

			it('removes from other locations if useAll is true', async () => {
				
				expect((await fn(['a', 'b'], {a: 5, b: 2, c: 3}, 0)))
				.toEqual({a: 0, b: 0});

				expect((await fn(['a', 'b'], {a: 5, b: 2, c: 3}, 0, true)))
				.toEqual({a: 0, b: 0, c: 0});

				expect((await fn(['a', 'b'], {a: 5, b: 2, c: 3, d: 10, e: 40}, 0, true)))
				.toEqual({a: 0, b: 0, c: 0, d: 0, e: 0});


				expect((await fn(['a', 'b'], [
					{a: 5, b: 2, c: 3, d: 10, e: 40},
					{a: 5, b: 2, c: 3, d: 10, e: 40, __obj: _e.notSaleableRemainance},
					{a: 5, b: 2, c: 3, d: 10, e: 40, __obj: _e.saleableVariation},
					{a: 5, b: 2, c: 3, d: 10, e: 40, __obj: _e.different},
				], 0, true)))
				.toEqual({
					id0: {a: 0, b: 0, c: 0, d: 0, e: 0},
					id2: {a: 0, b: 0, c: 0, d: 0, e: 0},
				});

			});

			it('if all the other locations are null, then the last items are subtracted from the main id', async () => {

				expect((await fn(['a', 'b', 'c'], {a: 5, b: 2, c: 3}, -1)))
				.toEqual({a: -1, b: 0, c: 0});

				expect((await fn(['a'], {a: 5, b: 2, c: 3}, -1)))
				.toEqual({a: -1});

				expect((await fn(['a'], {a: 5, b: 2, c: 3}, -1, true)))
				.toEqual({a: -1, b: 0, c: 0});

				expect((await fn(['a', 'b', 'c'], {a: 1, b: 1, c: 1}, -10)))
				.toEqual({a: -10, b: 0, c: 0});


				expect((await fn(['a', 'b', 'c'], [
					{a: 5, b: 2, c: 3},
					{a: 5, b: 2, c: 3, __obj: _e.notSaleableRemainance},
				], -1)))
				.toEqual({
					id0: {a: -1, b: 0, c: 0},
				});

				expect((await fn(['a', 'b', 'c'], [
					{a: 5, b: 2, c: 3},
					{a: 5, b: 2, c: 3, __obj: _e.saleableVariation},
				], -1)))
				.toEqual({
					id0: {a: -1, b: 0, c: 0},
					id1: {a: 0, b: 0, c: 0},
				});

				expect((await fn(['a', 'b', 'c'], [
					{a: 5, b: 2, c: 3},
					{a: 5, b: 2, c: 3, __obj: _e.different},
				], -1)))
				.toEqual({
					id0: {a: -1, b: 0, c: 0},
				});

			});

			it('negative amount', async () => {
				expect((await fn(['a'], {a: -3}, 6)))
					.toEqual({a: 6});
				
				expect((await fn(['a', 'b'], {a: -3, b: 9}, 6)))
					.toEqual({});

									
				expect((await fn(['a', 'b'], [
					{a: -3, b: 9},
					{a: 1, b: 9, __obj: _e.saleableVariation},
				], 16)))
				.toEqual({});

				expect((await fn(['a', 'b'], [
					{a: -3, b: 9},
					{a: 1, b: 9, __obj: _e.saleableVariation},
				], 19)))
				.toEqual({
					id0: {a: 0}
				});

				expect((await fn(['a', 'b'], [
					{a: -3, b: 9},
					{a: 1, b: 9, __obj: _e.saleableVariation},
				], 23)))
				.toEqual({
					id0: {a: 4}
				});
			});

			it('when setting to a product group, then we search for the first non deleted saleable as target', () => {
				// remote product "A" has ID 123, and local product group "A" has a model with remote ID 123
				// if we alter that product variation and the model with remote ID 123 becomes a remaining
				//
				// then when we update remote product "A" that remaining with ID 123 will be restored as we're targeting that item
				// thus to fix this, we search for the model with the remote ID 123, and then if it's deleted we take the first saleable model available
				// otherwise fallback to that one


				// we use directly the function cause yolo
				const fn = (pData: pDataToObjType) => {
					return WooSyncProductMovementsService['findRelevantSaleableModelByRemoteId']({models: getModelsArray(utils.extConfig, pData)} as ProductGroup, utils.extConfig, 1);
				};

				// take the first model
				let a = fn([{__del: 1}, {__obj: _e.notSaleableRemainance, __del: 0}]);
				expect(a._deleted).not.toEqual(undefined);
				expect(a.variationData).toEqual(tt.eo({buyPrice: 1, sellPrice: 1}));

				a = fn([{__del: 1}, {__obj: _e.different, __del: 0}]);
				expect(a._deleted).not.toEqual(undefined);
				expect(a.variationData).toEqual(tt.eo({buyPrice: 1, sellPrice: 1}));

				// take the first model
				a = fn([{__del: 1}, {__obj: _e.saleableVariation}]);
				expect(a._deleted).not.toEqual(undefined);
				expect(a.variationData).toEqual(tt.eo({buyPrice: 1, sellPrice: 1}));

				// take the available saleable variation
				a = fn([{__del: 1}, {__obj: _e.saleableVariation, __del: 0}]);
				expect(a._deleted).toEqual(undefined);
				expect(a.variationData).toEqual(tt.eo({buyPrice: 9, sellPrice: 1}));
			})

		});

		describe('get subtraction amount data', () => {

			const fn = (locIds: string[], avail: pDataToObjType, remoteSub: number, cache?: Product['_amountData'] | {[id: string]: {[loc: string]: number}}, useAllLocs?: true) => {
				const ep = {...tt.extConn};

				ep.locationId = locIds[0];
				ep.additionalStockLocation = {}
				if (locIds)
					ep.additionalStockLocation.orderedIds = locIds.slice(1);
				if (useAllLocs)
					ep.additionalStockLocation.useAll = useAllLocs;
	
				const pgs = WooSyncProductMovementsService.createAmountDataForSubtractionByVariation(
					ep, 
					{models: getModelsArray(ep, avail)} as ProductGroup,
					1,
					remoteSub,
					Array.isArray(avail) ? cache as any : {['id0']: cache} as any,
				);

				
				return Array.isArray(avail) ? pgs : pgs['id0'] || {};
			}

			it('null first location', () => {
				expect(fn(['a'], {a: 0, b: 2}, 1))
					.toEqual({a: 1})

				expect(fn(['a', 'b'], {a: 0, b: 2}, 1))
					.toEqual({b: 1})

				expect(fn(['a', 'b'], [
					{a: 0, b: 2},
					{a: 1, b: 2, __obj: _e.saleableVariation},
				], 1))
				.toEqual({
					id0: {b: 1},
				});

			});

			it('removes in order', () => {
				expect(fn(['a'], {a: 2, b: 2}, 1))
					.toEqual({a: 1})
				
				expect(fn(['a'], {a: 2, b: 2}, 4))
					.toEqual({a: 4})

				expect(fn(['a', 'b'], {a: 2, b: 2}, 4))
				.toEqual({a: 2, b: 2})

				expect(fn(['a', 'b'], {a: 2, b: 2, c: 2}, 6, {}, true))
				.toEqual({a: 2, b: 2, c: 2})

				expect(fn(['a', 'b'], {a: 2, b: 2, c: 2}, 8, {}))
				.toEqual({a: 6, b: 2})

				expect(fn(['a', 'b'], {a: 2, b: 2, c: 2}, 8, {}, true))
				.toEqual({a: 4, b: 2, c: 2})
			});

			it('removes from other location with remaincens', () => {

				expect(fn(['a'], [
					{a: 2, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
					{a: 2, b: 2, __obj: _e.notSaleableRemainance},
					{a: 2, b: 2, __obj: _e.different},
				], 6))
				.toEqual({
					id0: {a: 4},
					id1: {a: 2}
				});

			});

			it('removes from other remaincens', () => {

				expect(fn(['a'], [
					{a: 2, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
				], 1))
				.toEqual({
					id0: {a: 1},
				})

				expect(fn(['a'], [
					{a: 2, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
				], 5))
				.toEqual({
					id0: {a: 3},
					id1: {a: 2}
				})

				expect(fn(['a'], [
					{a: 2, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
					{a: 2, b: 2, __obj: _e.notSaleableRemainance},
					{a: 2, b: 2, __obj: _e.different},
				], 6))
				.toEqual({
					id0: {a: 4},
					id1: {a: 2}
				});

			});

			it('removes only from remainence if no loc in present', () => {
				
				expect(fn(['a'], [
					{a: 0, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
					{a: 2, b: 2, __obj: _e.notSaleableRemainance},
					{a: 2, b: 2, __obj: _e.different},
				], 1))
				.toEqual({
					id1: {a: 1}
				});

				expect(fn(['a'], [
					{a: 0, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
					{a: 2, b: 2, __obj: _e.notSaleableRemainance},
					{a: 2, b: 2, __obj: _e.different},
				], 2))
				.toEqual({
					id1: {a: 2}
				});

				// goes into negative
				expect(fn(['a'], [
					{a: 0, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
					{a: 2, b: 2, __obj: _e.notSaleableRemainance},
					{a: 2, b: 2, __obj: _e.different},
				], 10))
				.toEqual({
					id0: {a: 8},
					id1: {a: 2}
				});

			})

			it('negative amounts', async () => {

				expect(fn(['a'], [
					{a: -5, b: 2},
				], 1))
				.toEqual({
					id0: {a: 1}
				});

				expect(fn(['a'], [
					{a: -3, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
				], 1))
				.toEqual({
					id1: {a: 1}
				});

				expect(fn(['a', 'b'], [
					{a: -3, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
				], 1))
				.toEqual({
					id0: {b: 1}
				});

				expect(fn(['a', 'b'], [
					{a: -3, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
				], 5))
				.toEqual({
					id0: {b: 2},
					id1: {a: 2, b: 1},
				});

				expect(fn(['a', 'b'], [
					{a: -3, b: 2},
					{a: 2, b: 2, __obj: _e.saleableVariation},
				], 10))
				.toEqual({
					id0: {a: 4, b: 2},
					id1: {a: 2, b: 2},
				});

			});

			it('removes even if the only ref is a deleted item', async () => {
				expect(
					fn(['a'], [{a: 1, __del: 1}], 99)
				)
				.toEqual({id0: {'a': 99}});
			});

			it('creates correct sub object on _deleted models', async () => {
				expect(
					fn(['a'], [{a: -6, __del: 1}], 1)
				)
				.toEqual({id0: {'a': 1}});
			});

		});

	});

});

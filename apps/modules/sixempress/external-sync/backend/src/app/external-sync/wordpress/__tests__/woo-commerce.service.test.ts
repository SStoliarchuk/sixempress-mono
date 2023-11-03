import to from "await-to-js";
import { generateRequestObject } from "../../../../../tests/setupTests";
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { AddedIdInfo, ModelIdsHm, WooBuiltAggregatedInfo, WooCrudUpdate, WooProductSimple } from "../woo.dtd";
import { WooTypes, WPRemotePaths } from "../woo.enum";
import { WooDataSyncService } from '../sync/woo-data-sync.service';
import { ApiKeyService, CS, CrudCollection, CrudUpdatesService, HttpRequestService, ObjectUtils, FetchableField, AbstractDbItemController, MongoUtils, ControllersService, RequestHelperService } from "@sixempress/main-be-lib";
import { ModelClass } from '@utils/enums/model-class.enum';
import { MultipConfigService } from "../../../multip-config/multip-config.service";
import { ExternalConnection, ExternalConnectionType, MultiRootConfig } from "../../../multip-config/multip-config.dtd";
import { WooSyncProductsService } from "../sync/woo-sync-products.service";
import { ExternalSyncUtils } from "../../external-sync.utils";
import { WooSyncProductCategories } from "../sync/woo-sync-product-categories.service";
import { InventoryCategoryController } from "@paths/multi-purpose/inventory-categories/InventoryCategory.controller";
import { InventoryCategory } from "@paths/multi-purpose/inventory-categories/InventoryCategory";
import { ObjectId } from "mongodb";
import { getMetaDataPrefix, SyncableModel } from "@services/external-sync/syncable-model";
import { WooSyncCustomersService } from "../sync/woo-sync-customers.service";
import { WooSyncOrdersService } from "../sync/woo-sync-orders.service";
import { WooCommerceLocalToRemoteService } from "../woo-commerce-local-to-remote.service";
import { WooCommerceRemoteToLocalService } from "../woo-commerce-remote-to-local.service";
import { WooCommerceService } from '../woo-commerce.service';
import { WooProduct } from "@woocommerce/woocommerce-rest-api";
import { ProductMovementController } from "@paths/multi-purpose/products/product-movements/ProductMovement.controller";

const eo = expect.objectContaining;
const ea = tt.arrayContaining;

const utils = (() => {

	const returns = {
		aggregateItems: {} as Partial<AxiosResponse<WooBuiltAggregatedInfo>>,
	};
	// here we filter the object to return so that it returns ONLY the actually requested items
	// instead of the whole return object
	// 
	// this is to test for reference sync
	HttpRequestService.request = async (m, e, d: {[model: string]: number[]}) => {

		// create an object based on request
		// this is to ensure we never return an empty object ({})
		// thus invalidating some tests especially on reference building
		if (!returns.aggregateItems.data) {
			const toR = {};
			for (const t in toR)
				for (const id in toR[t])
					toR[t][id] = {id: id};

			return {...returns.aggregateItems, data: toR} as any;
		}

		// else filter the data object
		const data = returns.aggregateItems.data;
		const toR = {};
		for (const t in d) {
			if (!toR[t])
				toR[t] = {};

			for (const id of d[t])
				if (data[t] && data[t][id])
					toR[t][id] = data[t][id];
		}
		return {...returns.aggregateItems, data: toR} as any;
	};

	const baseUrl = 'http://localhost:8888';
	const _internal = {

		partialToFull: (p: Partial<WooCrudUpdate>): WooCrudUpdate => {
			return {
				id: 1, 
				item_type: WooTypes.product,
				origin_url: baseUrl,
				// origin_url: 'http://localhost:8888',
				...p,
			};
		}
	}
	const ltrService = new WooCommerceLocalToRemoteService();
	const rtlService = new WooCommerceRemoteToLocalService();

	const ogLocalDebounced = ltrService['onCrudUpdate'];
	const ogRemoteDebounced = rtlService['onCrudUpdate'];
	
	const ogGetExternalConnections = ExternalSyncUtils.getExternalConnections;
	ExternalSyncUtils.getExternalConnections = async () => [utils.extConfig];
	ExternalSyncUtils.getExternalConnectionInfo = async () => utils.extConfig;
	
	// jest.spyOn(ExternalSyncService, 'getExternalConnections').mockImplementation(async () => [utils.extConfig]);

	const extConfig: ExternalConnection = { 
		_id: '1', locationId: '1', originUrl: baseUrl, auth: {} as any, name: 'conn',
		type: ExternalConnectionType.wordpress, useFor: {crudFromLocal: true, crudFromRemote: true},
	};
	return {

		ogGetExternalConnections,
		baseUrl: baseUrl,
		apiKey: 'hello',

		extConfig: extConfig,

		rtlService: rtlService,
		ltrService: ltrService, 
	
		setAggregateIdsReturn: (m: Partial<AxiosResponse<WooBuiltAggregatedInfo>>) => {
			returns.aggregateItems = m;
		},

		getLocalWholeObject: () => {
			return utils.ltrService['syncRequestItems'];
		},

		getReqObj: generateRequestObject,

		getWholeData: () => {
			const d = {...utils.rtlService['syncRequestItems']};
			for (const url in d) {
				d[url] = {...d[url]};
				d[url].meta = {...d[url].meta};
				delete d[url].meta.ext;
			}
			return d;
		},
		
		getDataByType: (type?: WooTypes | (string & {})) => {
			const data = utils.rtlService['syncRequestItems'][utils.baseUrl].data;
			return type ? data[type] : data;
		},

		sendCrudRequest: async (body: Partial<WooCrudUpdate> & {[k: string]: any}, opts: {skipPartialToFull?: boolean, skipThrow?: boolean, reqObj?: Request, startSyncFn?: true, startSyncFnAndWait?: true} = {}) => {
			if (opts.skipPartialToFull !== true) {
				body = _internal.partialToFull(body);
			}
			
			let answered = false;
			const req = opts.reqObj || utils.getReqObj({ body, headers: {'x-api-key': utils.apiKey, 'x-origin-url': body.origin_url} });
			const res = { sendStatus: () => answered = true, };

			await utils.rtlService['processCrudRequest'](req, res as any);

			// check if the item is present in sync
			if (body.item_type !== WooTypes.product_amount && opts.skipThrow !== true) {
				if (!utils.rtlService['syncRequestItems'][body.origin_url])
					throw new Error('body.origin');
				if (!utils.rtlService['syncRequestItems'][body.origin_url].data[body.item_type])
					throw new Error('body.item_type');
				if (!utils.rtlService['syncRequestItems'][body.origin_url].data[body.item_type][body.id])
					throw new Error('body.id');
			}

			
			if (opts.startSyncFn)
				ogRemoteDebounced();
			else if (opts.startSyncFnAndWait) 
				await utils.rtlService['syncCrudUpdates']();

			expect(answered).toBe(true);
		},

		sendLocalCrudReq: async (ids: (string | ObjectId)[], mc?: ModelClass, opts: {originUrl?: string, slug?: string, req?: Request, startFn?: boolean} = {}) => {
			await utils.ltrService['processLocalCrudAction'](
				opts.req || utils.getReqObj({slug: opts.slug || tt.testSlug, headers: {'x-origin-url': opts.originUrl || 'different_url_for_emit'}}),
				'create',
				mc || ModelClass.Product,
				ids.map(i => i.toString()),
			);

			if (opts.startFn)
				ogLocalDebounced();
		},

		catController: tt.getBaseControllerUtils<InventoryCategory, Partial<InventoryCategory>, InventoryCategoryController>({ 
			controller: new InventoryCategoryController(), 
		}),
		prodController: tt.getProdController({extConn: extConfig}),
		// prodController: tt.getBaseControllerUtils<ProductGroup, DeepPartial<ProductGroup>, ProductGroupController>({ 
		// 	controller: new ProductGroupController(), 
		// 	partialToFull: (is) => is.map((i, idx) => ({
		// 		documentLocationsFilter: ['*'],
		// 		groupData: {
		// 			name: i.groupData?.name || idx.toString(),
		// 			type: i.groupData?.type || ProductType.product,
		// 			...(i.groupData || {}),
		// 		},
		// 		models: [{
		// 			variationData: {buyPrice: 1, sellPrice: 1, variants: []},
		// 			infoData: {},
		// 		}],
		// 	}) as ProductGroup),
		// }),
	}

})();

beforeEach(async () => {
	// break function on purpose
	// utils.ltrService['onLocalCrudAction'] = () => 0 as any;
	// utils.rtlService['onRemoteCrudRequest'] = () => 0 as any;

	jest.spyOn(utils.ltrService, 'onCrudUpdate' as any).mockImplementation(() => 0);
	jest.spyOn(utils.rtlService, 'onCrudUpdate' as any).mockImplementation(() => 0);

	ExternalSyncUtils['multipExternalConfigsCache'] = {};
	utils.rtlService['syncRequestItems'] = {};
	utils.ltrService['syncRequestItems'] = {};

	// force null so that the object gets created automatically
	utils.setAggregateIdsReturn({});
	await tt.dropDatabase();
});

describe('woo commerce service', () => {
	
	describe('special case: product movements', () => {
		
		// SO
		// i have a product with variations "A","B" and each have 1 stock of item
		// if from remote i change the variation to "C","D" and set the stock to 1
		//
		// then the remote sends simultaneusly the 1 stock change to the remoteID product and sends the new products info
		// as we process the stock BEFORE processing the products, we have a problem where the new stock is set to the old "A","B" vars instead
		// of the new "C","D". 
		//
		// this happens because when we change the VARS in remote, the remoteID is not changed, but keeps the same
		// to solve this we sync the target product first before processing product amount request :]
		//
		// testing: immediateProductAmountSync()
		it('remote -> local: if a product amount crud is sent, if the target product remote ID is present in syncRequest, then it syncs that products and removes it before processing amount', async () => {

			// actual products
			const parent: WooProductSimple = {
				"id": 10, "name":"var_same1", "type":"variable", "status":"publish",
			}
			const variations: WooProductSimple[] = [
				{"id": 1, "name":"var_same1 - ACIDO", parent, "type":"variation", manage_stock: true, stock_quantity: 5, "regular_price":"21","attributes":[{"id":1,"name":"Colore","option":"A"}]},
				{"id": 2, "name":"var_same1 - ACIDO", parent, "type":"variation", manage_stock: true, stock_quantity: 5, "regular_price":"21","attributes":[{"id":1,"name":"Colore","option":"B"}]},
			]
			parent.variations = variations as WooProduct[];

			utils.setAggregateIdsReturn({data: {[WooTypes.product]: {[10]: parent}}});
			
			// create the product
			await utils.sendCrudRequest({id: 10, item_type: WooTypes.product}, {startSyncFnAndWait: true});
			// expect for the initial amount to be present
			expect((await utils.prodController.find())).toEqual(tt.ea([tt.eo({ models: tt.ea([
				tt.eo({_amountData: {'1': 5}, variationData: tt.eo({variants: tt.ea([tt.eo({value: 'A'})])})}),
				tt.eo({_amountData: {'1': 5}, variationData: tt.eo({variants: tt.ea([tt.eo({value: 'B'})])})}),
			])})]))

			// change the variant name and stock
			variations[0].stock_quantity = 10;
			variations[0].attributes[0].option = 'C';
			variations[1].stock_quantity = 10;
			variations[1].attributes[0].option = 'D';

			// simulate actual behaviour where we send all at once STARTING from the product
			await utils.sendCrudRequest({id: 10, item_type: WooTypes.product});
			await utils.sendCrudRequest({id: 2, item_type: WooTypes.product_amount, value: 10});
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.product_amount, value: 10});
			await utils.rtlService['syncCrudUpdates']();

			// expect for the initial amount to be present
			expect((await utils.prodController.find())).toEqual(tt.ea([tt.eo({ models: tt.ea([
				tt.eo({_amountData: {'1': 10}, variationData: tt.eo({variants: tt.ea([tt.eo({value: 'C'})])})}),
				tt.eo({_amountData: {'1': 10}, variationData: tt.eo({variants: tt.ea([tt.eo({value: 'D'})])})}),
				tt.eo({_amountData: {'1': 5}, _deleted: expect.anything(), variationData: tt.eo({variants: tt.ea([tt.eo({value: 'A'})])})}),
				tt.eo({_amountData: {'1': 5}, _deleted: expect.anything(), variationData: tt.eo({variants: tt.ea([tt.eo({value: 'B'})])})}),
			])})]))


			// change the variant once again
			variations[0].stock_quantity = 100;
			variations[0].attributes[0].option = 'XX';
			variations[1].stock_quantity = 100;
			variations[1].attributes[0].option = '22';
			
			// now WHILE we process the product we send amount
			await utils.sendCrudRequest({id: 10, item_type: WooTypes.product});
			const og = WooSyncProductsService.processProducts;
			WooSyncProductsService.processProducts = async (...args) => {
				await tt.wait(1000);
				return og(...args);
			};
			utils.rtlService['syncCrudUpdates']();
			await utils.sendCrudRequest({id: 2, item_type: WooTypes.product_amount, value: 100});
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.product_amount, value: 100});
			await tt.wait(1500);

			// expect for the initial amount to be present
			expect((await utils.prodController.find())).toEqual(tt.ea([tt.eo({ models: tt.ea([
				tt.eo({_amountData: {'1': 100}, variationData: tt.eo({variants: tt.ea([tt.eo({value: 'XX'})])})}),
				tt.eo({_amountData: {'1': 100}, variationData: tt.eo({variants: tt.ea([tt.eo({value: '22'})])})}),
				tt.eo({_amountData: {'1': 10}, _deleted: expect.anything(), variationData: tt.eo({variants: tt.ea([tt.eo({value: 'C'})])})}),
				tt.eo({_amountData: {'1': 10}, _deleted: expect.anything(), variationData: tt.eo({variants: tt.ea([tt.eo({value: 'D'})])})}),
				tt.eo({_amountData: {'1': 5}, _deleted: expect.anything(), variationData: tt.eo({variants: tt.ea([tt.eo({value: 'A'})])})}),
				tt.eo({_amountData: {'1': 5}, _deleted: expect.anything(), variationData: tt.eo({variants: tt.ea([tt.eo({value: 'B'})])})}),
			])})]));

			// restore mock
			WooSyncProductsService.processProducts = og;
		});

		it.todo('ensure we use ExternalSyncService.createBeJwtToken as to avoid double sync');
		
		it.todo('ensure we respect ExternalSyncService.createBeJwtToken in local to remote as to avoid double sync');

		it('if there is missing ref, it just ignores it as there is the possibility that the ref could be an invalid product :/', async () => {
			await utils.rtlService['immediateProductAmountSync']('a', 'a', 'a', utils.extConfig, {id: 11698, item_type: WooTypes.product_amount, value: 5, origin_url: 'a'});
			// wait and expect no error
			await tt.wait(1000);
		});

	});

	describe('check missing refs', () => {

		//
		// what is this test ?
		//
		// it.only('omitUrls adds the disabled urls (used for product movements of not synced prods)', async () => {
		// 	const pgs = await utils.prodController.save([{ms: [{
		// 		extId: [1],
		// 		externalSync: {disabled: [{id: utils.extConfig._id}]},
		// 	}]}]);
		// 	const pgid = pgs[0]._trackableGroupId;
		// 	const pid = pgs[0].models[0]._id;

		// 	const pmvs = await new ProductMovementController().saveToDb(utils.getReqObj(), [{
		// 		amount: 1,
		// 		documentLocationsFilter: ['1'], documentLocation: '1',
		// 		movementType: 1,
		// 		targetProductInfo: {product: new FetchableField(pid, ModelClass.Product), productsGroupId: pgid}
		// 	}]);

		// 	const pmId = pmvs.insertedIds[0];
		// 	utils.sendLocalCrudReq([pmId], ModelClass.ProductMovement);
		// 	await utils.ltrService['syncCrudUpdates']();

		// 	await tt.wait(1000);
		// });

		it('ref sync does not throw when syncing local->remote to a remote url that is AxiosIsUnreachableError', async () => {

			// add manually this line
			// as calling start() on the extSyncService is too much lol
			MultipConfigService.registerOnUpdateAction((slug) => {
				delete ExternalSyncUtils.multipExternalConfigsCache[slug]
			});

			//
			// mock the external connections, by actually calling DB with facked
			//
			const eps: ExternalConnection[] = [
				{...utils.extConfig, _id: '1', originUrl: 'http://localhost:1'},
				{...utils.extConfig, _id: '2', originUrl: 'http://localhost:2'},
			];
			const req = RequestHelperService.createBeReqObject({slug: tt.testSlug});
			await MultipConfigService['coll'].insertMany(req, [{externalConnections: eps} as any]);
			const mock = jest.spyOn(ExternalSyncUtils, 'getExternalConnections');
			mock.mockImplementation(utils.ogGetExternalConnections);

			//
			// save targets 
			// note that the category has one ext id connected already
			//
			const c = (await utils.catController.save([{name: 'a', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: '1'}]}}]))[0];
			const p = (await utils.prodController.save([{groupData: {category: new FetchableField(c._id, ModelClass.InventoryCategory)}}]))[0];

			//
			// mock the sync responses
			//
			const sendMock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
			sendMock.mockImplementation(async (ec, met, wppath, data) => {
				// return axios error on second endpoint
				if (ec._id === '2') {
					throw {isAxiosError: true, config: {url: eps[1].originUrl}, response: {status: 401}};
				}

				if (wppath === WPRemotePaths.product_categories) {
					return {items: {[c._id.toString()]: 1}};
				}
				return {items: {[1803]: {meta_data: [{
					key: getMetaDataPrefix(tt.testSlug) + 'product_group_id',
					value: p._trackableGroupId,
				}, {
					key: getMetaDataPrefix(tt.testSlug) + 'product_id',
					value: p.models[0]._id.toString(),
				}]}}};
			});

	
			// try to sync withouth errors
			await utils.sendLocalCrudReq([p.models[0]._id.toString()]);
			await utils.ltrService['syncCrudUpdates']();

			//
			// restore mocks
			//
			sendMock.mockRestore();
			mock.mockRestore();
		});

		it.todo('calls twice getEndpoints() as the endpoinst could have been updated after the missing ref sync');

		// instaed of having
		// if (!d[m][id] || !ObjectUtils.areVarsEqual(d[m][id].omitOriginUrls, items[m][id].omitOriginUrls))
		// i had
		// if (!d[m][id] || ObjectUtils.areVarsEqual(d[m][id].omitOriginUrls, items[m][id].omitOriginUrls))
		it('ensure that the items are checkd propery the omit origin', () => {

			const refsToSync = {
				product_cat: {
					44: {"addedMs":1628011025543,"omitOriginUrls":["60fff3dece713648eff2b69a"]}
				}
			};
			const processing = {"http://localhost:8888": {
				data: {
					product_cat:{
						44:{"addedMs":1628011025733,"omitOriginUrls":["60fff3dece713648eff2b69a"]}
					}
				},
				meta: {"slug":"all_20202020","apiKey":"all_20202020--12ea2453d06592537a7d7e05409835c187e5d87fa709ecc0f544e0e82dfb3514","ext":{"_id":"60fff3dece713648eff2b69a","originUrl":"http://localhost:8888","name":"localhost:8888","type":2,"useFor":{"crudFromLocal":true,"crudFromRemote":true,"rawFiles":true,"defaultClientSite":true},"locationId":"1_2","additionalStockLocation":{"useAll":true},"auth":{"apiKey":"all_20202020--12ea2453d06592537a7d7e05409835c187e5d87fa709ecc0f544e0e82dfb3514","type":"apikey"}}}}
			};
			const url = 'http://localhost:8888';

			expect(utils.rtlService['checkMissingProcessing'](url, refsToSync, processing as any)).toBe(undefined);

			// both same, so no sync
			expect(utils.rtlService['checkMissingProcessing'](url, 
											 {a: {11: {omitOriginUrls: ['a']}}} as any, 
				{[url]: {data: {a: {11: {omitOriginUrls: ['a']}}}}} as any)
			).toBe(undefined);

			// both diff, so we sync
			expect(utils.rtlService['checkMissingProcessing'](url, 
											 {a: {11: {omitOriginUrls: ['b']}}} as any, 
				{[url]: {data: {a: {11: {omitOriginUrls: ['a']}}}}} as any)
			).toEqual({a: {11: {omitOriginUrls: ['b']}}});

			// the requested items has MORE omit than the local, so no sync
			expect(utils.rtlService['checkMissingProcessing'](url, 
											 {a: {11: {omitOriginUrls: ['a', 'b']}}} as any, 
				{[url]: {data: {a: {11: {omitOriginUrls: ['a']}}}}} as any)
			).toBe(undefined);

			// the requested items has LESS omit, so we have to sync
			expect(utils.rtlService['checkMissingProcessing'](url, 
											 {a: {11: {omitOriginUrls: ['a']}}} as any, 
				{[url]: {data: {a: {11: {omitOriginUrls: ['a', 'b']}}}}} as any)
			).toEqual({a: {11: {omitOriginUrls: ['a']}}});

		});

	});

	// if we have a debounce time of 500ms
	// if we crud update the item A
	// then after 500ms the item A begins it's sync
	// well if after 501ms of the original A crud output
	// we emit A once again
	// the original sync is not yet completed
	// thus the POST or any other function is triggered twice
	// creating the prodmovs, order, or whatever twice
	//
	// this is more prevalent from remote to local
	// but we should also avoid from local to remote
	// just in case
	describe('double function trigger avoidance', () => {	

		// basically if we emit crud update to cat 1 and 2, and 1 depends on 2, that means that both are put in the processing cache
		// so when we process 1 and we see it depends on 2, we stop the current sync to sync first the 2 element, but as it's in the processing cache
		// it won't be synced and it will wait for the original sync with both elements to complete
		// thus blocking the system
		//
		// this is fixed by copying the sync logic of remote-to-local where we build the tree in the target system and then we sync by layers
		// thus we pass both category 1 and 2 to remote (wordpress) and we build the tree there
		it.todo('if from local i sync category 1 that extends category 2, and both IDS are in processing, then the system does not work as 2 cannot be synced as it\'s marked as processing');

		it('remote to local ensure that missing ref sync is done by taking into consideration the currently processing items (syncMissingReferences())', async () => {
			// restore the function so it can be triggered
			(utils.rtlService['onCrudUpdate'] as jest.Mock).mockRestore();

			let calledTimes = 0;
			// simulate delay as we're in local
			const og = WooDataSyncService['executeCrudActions'];
			WooDataSyncService['executeCrudActions'] = async (...args) => (
				await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 300), 
				calledTimes++,
				og(...args)
			);

			utils.setAggregateIdsReturn({data: {
				product_cat: {1: {id: 1, name: 'quakkkk'}},
				product: {1: {id: 1, categories: [{id: 1}]}},
			}});
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.prod_category}, {startSyncFn: true});
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 20);
			// await utils.sendCrudRequest({id: 1, item_type: WooTypes.prod_category}, {startSyncFn: true});
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.product}, {startSyncFn: true});
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 2000);
			
			// possible infinite loop ?
			// or at least a lot of syncs ?

			const saved = await utils.catController.find();
			expect(saved.length).toBe(1);
			expect(saved[0]._metaData._externalIds[0]._id).toEqual(1);
			
			// called twice for 100% ensurance that the item is correct
			expect(calledTimes).toBe(2);
			// ensure we clear the processing cache
			expect(utils.rtlService['processingItems']).toEqual({});

			WooDataSyncService['executeCrudActions'] = og;
		});
		
		// we sync twice because the model could have changed on the second crud update
		// so to be 100% secure that we have the correct data we sync twice
		// even tho 99% of the time it's useless, it's the 1% we need to worry about lol
		it('remote to local (syncs twice but wait for the first one to complete)', async () => {
			// restore the function so it can be triggered
			(utils.rtlService['onCrudUpdate'] as jest.Mock).mockRestore();
			
			let calledTimes = 0;
			// simulate delay as we're in local
			const og = WooDataSyncService['executeCrudActions'];
			WooDataSyncService['executeCrudActions'] = async (...args) => (
				await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 300), 
				calledTimes++,
				og(...args)
			);

			utils.setAggregateIdsReturn({data: {product_cat: {1: {id: 1, name: 'quakkkk'}}}});
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.prod_category}, {startSyncFn: true});
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 20);
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.prod_category}, {startSyncFn: true});
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 2000);
			
			// possible infinite loop ?
			// or at least a lot of syncs ?

			const saved = await utils.catController.find();
			expect(saved.length).toBe(1);
			expect(saved[0]._metaData._externalIds[0]._id).toEqual(1);
			
			// called twice for 100% ensurance that the item is correct
			expect(calledTimes).toBe(2);
			// ensure we clear the processing cache
			expect(utils.rtlService['processingItems']).toEqual({});

			WooDataSyncService['executeCrudActions'] = og;
		});

		it.todo('concurrency error ?');

		// TODO if we set these lines 5 times, it still only emits twice?
		// is this an error? or is this just a timing thing ? 
		// it should be atiming thing as the last item is still in the processing cache, idk
		// await utils.sendLocalCrudReq([id], ModelClass.InventoryCategory, {originUrl: 'asd', startFn: true});
		// await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 20);
		it.todo('check if it works 5 times instead of only twice');

		it('local to remote (syncs twice but wait for the first one to complete)', async () => {
			// restore the function so it can be triggered
			(utils.ltrService['onCrudUpdate'] as jest.Mock).mockRestore();

			const id = (await utils.catController.save([{name: '0'}]))[0]._id.toString();
			let calledTimes = 0;

			const og = HttpRequestService.request;
			HttpRequestService.request = async (...args) => {
				await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 500);
				calledTimes++;
				return {data: {items: [1]}} as any;
			};

			// TODO if we set these lines 5 times, it still only emits twice?
			// is this an error? or is this just a timing thing ? 
			// await utils.sendLocalCrudReq([id], ModelClass.InventoryCategory, {originUrl: 'asd', startFn: true});
			// await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 20);
			await utils.sendLocalCrudReq([id], ModelClass.InventoryCategory, {originUrl: 'asd', startFn: true});
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 20);
			await utils.sendLocalCrudReq([id], ModelClass.InventoryCategory, {originUrl: 'asd', startFn: true});
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 2500);
			
			// called twice for 100% ensurance that the item is correct
			expect(calledTimes).toBe(2);

			const localItem = (await utils.catController.find())[0];
			expect(localItem._metaData._externalIds.length).toBe(1);
			HttpRequestService.request = og;
		});

		// instead of directly calling singleLocalToRemote we need to check the processing array
		// oterwise we could have the double POST (doubble create) problem of a model
		it('local to remote respects the processing array before syncing referenced items', async () => {
			// restore the function so it can be triggered
			(utils.ltrService['onCrudUpdate'] as jest.Mock).mockRestore();

			const id = (await utils.catController.save([{name: '0'}]))[0]._id.toString();
			const prodId = (await utils.prodController.save([{groupData: {category: new FetchableField(id, ModelClass.InventoryCategory)}}]))[0].models[0]._id.toString();
			let calledTimes = 0;


			const og = HttpRequestService.request;
			HttpRequestService.request = async (m, url, b, ...args) => {
				await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 300);
				calledTimes++;
				if (url.includes(WPRemotePaths.product_categories))
					return {data: {items: {[b.items[0].__id]: 2}}} as any;

				return {data: {items: b.items.map((i, idx) => ({...i, id: idx})) }} as any;
			};

			await utils.sendLocalCrudReq([id], ModelClass.InventoryCategory);
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 20);
			await utils.sendLocalCrudReq([prodId], ModelClass.Product);
			await tt.wait(WooCommerceService['DEBOUNCE_TIME'] + 2500);
			
			// called twice for 100% ensurance that the item is correct
			// expect(calledTimes).toBe(2);

			const cat = (await utils.catController.find())[0];
			expect(cat._metaData._externalIds.length).toBe(1);
			const prod = (await utils.prodController.controller.getRawCollection(tt.testSlug).find().toArray())[0];
			expect(prod._metaData._externalIds.length).toBe(1);

			HttpRequestService.request = og;
		});

	});

	describe('fromt remote to local', () => {

		it.todo('test forceRefSync');

		// so what happens is that in our code we checked only for variants, not for variations
		// this is because i thought that woocommerce only showed variants in the front end, but in the back end it allows you to create 
		// how many variation you want, lol what
		//
		// anyway, if we save a product with same variant, different variations, then no problem, but if we add stock to one,
		// then we reverse the aggregate return order (can happen), and we add stock to the other,
		// the all stock is moved to the first
		//
		// this is because i move the stock in productController if the givenItem._id has a matching variation with different._id
		// as to allow to not manually have to move the stock when changin only the sellPrice ._.
		//
		// so the problem was that as we were matchin only the variants, not variations, this moved product amount between the varitions
		// lol
		// this should fix it
		//
		//
		// this test is here and not in woo-sync-product-movements cause we need aggregate returns and sendCrud Request
		// and i'm too lazy to copy the logic into that file lol
		it('if the local items contains ENABLED variations with same variants, both with different remoteId, we should be able to update stock separetly', async () => {

			// actual products
			const parent: WooProductSimple = {
				"id": 10, "name":"var_same1", "type":"variable", "status":"publish",
			}
			const variations: WooProductSimple[] = [
				{"id": 2, "name":"var_same1 - ACIDO", parent, "type":"variation", "regular_price":"2", "attributes":[{"id":1,"name":"Colore","option":"ACIDO"}]},
				{"id": 1, "name":"var_same1 - ACIDO", parent, "type":"variation", "regular_price":"21","attributes":[{"id":1,"name":"Colore","option":"ACIDO"}]},
			]
			parent.variations = variations as WooProduct[];

			utils.setAggregateIdsReturn({data: {[WooTypes.product]: {[10]: parent}}});
			
			// simulate actual log
			await utils.sendCrudRequest({id: 10, item_type: WooTypes.product}, {startSyncFnAndWait: true});
			// now we need, so during the .find(i => hasSameVariation())
			// the last item will be the first :D
			// and thus it will return the wrong item
			variations.reverse();

			await utils.sendCrudRequest({id: 2, item_type: WooTypes.product_amount, value: 2});
			await utils.sendCrudRequest({id: 10, item_type: WooTypes.product}, {startSyncFnAndWait: true});
			
			await utils.sendCrudRequest({id: 1, item_type: WooTypes.product_amount, value: 5});
			await utils.sendCrudRequest({id: 10, item_type: WooTypes.product}, {startSyncFnAndWait: true});

			let ms = (await utils.prodController.find())[0].models;
			expect(ms).toHaveLength(2);
			const item1 = ms.find(m => m._metaData._externalIds[0]._id === 1);
			const item2 = ms.find(m => m._metaData._externalIds[0]._id === 2);
			expect(item1._amountData).toEqual({'1': 5});
			expect(item2._amountData).toEqual({'1': 2});
		});

		// i was passing the slug accidetanly lol
		it.todo('immediateProductAmountSync passes the originUrl instead of the slug')

		// before we added to the cache and then called syncrcudupdated
		// this.restoreCache(); this.syncCrudUpdates();
		// but this was a problem as the cache could contains some items that references the items we're syncing etc
		// so it creates a kind of a semi loop
		// causing the getMissingRef to return missing items
		// 
		// so instead of adding to cache we call immediately with the data to pass:
		// this syncCrudUpdates({data});
		it.todo('syncMissingReferences calls directly syncCrudUpdates withouth adding to the cache prior');

		describe('crud request', () => {
			
			const fn = utils.sendCrudRequest;
	
			it('does a quick basic check on dtd', async () => {
				let e, d;
	
				[e, d] = await to(fn({id: 1, item_type: WooTypes.product, origin_url: 'http://localhost:8888'}, {skipPartialToFull: true}));
				expect(e).toBe(null);
	
				const error = [
					{}, {id: 1}, {item_type: WooTypes.product}, {original_url: 'http://localhost:8888'},
					{id: 1, item_type: WooTypes.product}, {id: 1, original_url: 'http://localhost:8888'}, {item_type: WooTypes.product, original_url: 'http://localhost:8888'},
					{id: 'asd', item_type: WooTypes.product, origin_url: 'http://localhost:8888'},
					{id: 1, item_type: 'asdasdasd', origin_url: 'http://localhost:8888'},
				];
	
				for (const body of error) {
					[e, d] = await to(fn(body as any, {skipPartialToFull: true}));
					if (!e) { console.log(body); }
					expect(e).not.toBe(null);
				}
	
			});
		
			it('doesnt duplicate ids', async () => {
				await fn({id: 1});
				expect(utils.getDataByType(WooTypes.product)).toEqual(eo({[1]: eo({})}));
				await fn({id: 2});
				expect(utils.getDataByType(WooTypes.product)).toEqual(eo({[1]: eo({}), [2]: eo({})}));
				await fn({id: 1});
				expect(utils.getDataByType(WooTypes.product)).toEqual(eo({[1]: eo({}), [2]: eo({})}));
				await fn({id: 2});
				expect(utils.getDataByType(WooTypes.product)).toEqual(eo({[1]: eo({}), [2]: eo({})}));
			});
		
			it('triggers sync function', async () => {
				const mock = jest.spyOn(utils.rtlService, 'onCrudUpdate' as any);
				mock.mockClear();

				await fn({id: 1}, {skipThrow: true});
				expect(mock).toHaveBeenCalledTimes(1);
	
				await fn({id: 1}, {skipThrow: true});
				expect(mock).toHaveBeenCalledTimes(2);
	
				// no call as the item is invalid
				await fn({id: 'asds' as any}, {skipThrow: true});
				expect(mock).toHaveBeenCalledTimes(2);
	
				mock.mockRestore();
			});
		
			it('adds correct object to cache', async () => {
				await fn({},
					{
						skipThrow: true,
						reqObj: utils.getReqObj({
							headers: {['x-api-key']: 'api_test_woo', ['x-origin-url']: 'url_test_woo'},
							body: {id: 10, item_type: WooTypes.prod_category},
							slug: 'slug_test_woo',
						})
					}
				);
	
				let data = utils.getWholeData();
				expect(Object.keys(data)).toEqual(['url_test_woo']);
				expect(data['url_test_woo']).toEqual({
					meta: {
						slug: 'slug_test_woo',
						apiKey: 'api_test_woo',
					},
					data: {[WooTypes.prod_category]: {[10]: eo({addedMs: expect.any(Number)})}},
				})
			});
	
		});
	
		describe('processing function', () => {
	
			const fn = async () =>{
				return utils.rtlService['syncCrudUpdates']();
			};
	
			// this is to ensure that while we are processing the items some extra data is not added
			// and after the processing is done we delete the additional added items
			it('removes the processing items from the cache immediately and restores the removed if there happened an error', async () => {
				
				// async functions that could throw
				const mocksToTest = [
					// we cant test this one as it's used in the req,res handler for outside requests
					// [ExternalSyncService, 'getExternalConnectionInfo'],

					[WooSyncProductsService, 'processProducts'],
					[WooSyncProductCategories, 'processCategories'],
					[utils.rtlService, 'getMissingRef'],
					[utils.rtlService, 'syncSingleClient'],
					[HttpRequestService, 'request'],
				];

				// ensure that the function works
				await utils.sendCrudRequest({id: 10});
				await utils.sendCrudRequest({id: 10, item_type: WooTypes.prod_category});
				let data = utils.getWholeData();
				expect(Object.keys(data)).not.toHaveLength(0);

				await fn();
				data = utils.getWholeData();
				expect(Object.keys(data)).toHaveLength(0);
	
				// now that we know it works let's try the errors
	
	
				await utils.sendCrudRequest({id: 0});
				await utils.sendCrudRequest({id: 0, item_type: WooTypes.prod_category});
				// clone the item so later we can compare the restored one
				data = ObjectUtils.cloneDeep(utils.getWholeData());
				expect(Object.keys(data)).not.toHaveLength(0);
				
				for (let i = 0; i < mocksToTest.length; i++) {
					const m = mocksToTest[i];
					const mock = jest.spyOn(m[0], m[1] as never);
					
					// throw after 100 seconds
					mock.mockReturnValue(new Promise((r, j) => setTimeout(() => j(i + 10), 100)) as never);
					const prom = fn();
	
					// so now the item should be empty as it's being processed
					expect(utils.getWholeData()).toEqual({});
					// we add some items to it
					await utils.sendCrudRequest({id: i + 1});
					await utils.sendCrudRequest({id: i + 1, item_type: WooTypes.prod_category});
					
					// and we expect thow item to be present
					const currData = ObjectUtils.cloneDeep(utils.getWholeData());
					expect(currData).not.toEqual({});

					// after the error, the items being processed have been re-added
					// so the items are not equal
					// execute sync function wrapped to prevent error
					const [e] = await to(prom);
					// just a quick test to ensure that we throw the right error 
					expect(e).toBe(i + 10)
					
					expect(currData).not.toEqual(utils.getWholeData());
					mock.mockRestore();
				}
				
				const currentData = ObjectUtils.cloneDeep(utils.getWholeData());
				// expect them to be different as we added some items during test
				expect(data).not.toEqual(currentData);
	
				// add the missing data and expect them to be equal
				const obj = {0: eo({})};
				new Array(mocksToTest.length).fill(0).map((v, idx) => idx + 1).forEach(i => obj[i] = eo({}));
				data[utils.baseUrl].data[WooTypes.product] = obj;
				data[utils.baseUrl].data[WooTypes.prod_category] = obj;
				expect(currentData).toEqual(data);
			});
	
			it.todo('just skips the sync if the origin sync request is not associated with a loationId');
	
			it.todo('calls woodatasync process function with the right params');
	
			describe('referenced items', () => {
				
				const refFn = (objs: WooBuiltAggregatedInfo, extId?: string) => {
					return utils.rtlService['getMissingRef']({}, {
						meta: {ext: {_id: extId || '1'} as any as ExternalConnection, slug: tt.testSlug, apiKey: utils.apiKey},
						objects: objs,
					});
				}

				// this is because if an item references a deleted object
				// it could mean that that reference has not been synced properly
				// as it's not "restored"
				// so we resync that item
				it.todo('checks the local reference only on NOT _deleted items');

				// process items in a specific order
				// categories -> product -> order
				// so that the references are built correctly
				// because as we cache stuff we dont want to save a product that has a category id that points to a non existing ref
				it('calls process() function is a specific order to avoid malforming data', async () => {
					// ordered functon
					const fns: any[] = [
						[WooSyncCustomersService, 'processCustomers', WooTypes.prod_category],
						[WooSyncProductCategories, 'processCategories', WooTypes.product],
						[WooSyncProductsService, 'processProducts', WooTypes.order],
						[WooSyncOrdersService, 'processOrders', WooTypes.customer],
					];
					
					// replace the fns index with the getTime() and return a 100ms promise
					for (let i = 0; i < fns.length; i++)
						jest.spyOn(fns[i][0], fns[i][1] as never).mockImplementation(() => {
							(fns[i][0][fns[i][1]] as jest.Mock).mockRestore();
							fns[i] = new Date().getTime();
							return tt.wait(100);
						});

					for (const i of fns)
						await utils.sendCrudRequest({id: 10, item_type: i[2]});
					await fn();

					// ensure the difference is ~100 ms in order
					for (let i = 0; i < fns.length; i++)
						if (fns[i + 1])
							// we account for ~2ms of margin just in case 
							if (fns[i + 1] > fns[i] + 102 || fns[i + 1] < fns[i] + 98)
								throw new Error('Difference not between limit');
				});
		
				// before contacting remote check if the items referenced are already synced
				// the query to do must contains "$elemMatch" to ensure no false positive. the same way WooDataSyncService does it
				it('ensures that the referenced items in the currently processed item are present in db with the correct externalConnectionId, otherwise syncs them', async () => {
					expect(await refFn({})).toBe(undefined);

					// save correct _id, wrong extConnId
					await utils.catController.save([
						{name: '1', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: '2'}]}},
					]);
					// expect for the sync
					expect(await refFn({product: {1: {categories: [{id: 1}]}}})).toEqual({product_cat: {1: eo({})}});
					expect(await refFn({product_cat: {2: {parent: 1, name: ''}}})).toEqual({product_cat: {1: eo({})}});

					// save correct _id and correct extConnId
					await utils.catController.save([
						{name: '1', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: '1'}]}},
					]);
					// expect no sync
					expect(await refFn({product: {1: {categories: [{id: 1}]}}})).toEqual(undefined);
					expect(await refFn({product_cat: {2: {parent: 1, name: ''}}})).toEqual(undefined);

					// TODO test product dependencies (after we sync orders)
				});
				
				it.todo('checks WooProduct.variations[] field too');

				/**
				 * if the sync object is
				 * {
				 *	prod: [{cat: 1}],
				 *  cat: [{id: 1}]
				 * }
				 *
				 * then instead of trying to sync {cat: 1} because it is referenced in prod
				 * we just check if the item will be synced in the current object cache
				 * 
				 * (this is solved by calling process() function in a specific order)
				 * 
				 * 
				 * ALSO WARNING
				 * 
				 * 
				 * if the obj is 
				 * {
				 * 	cat [{id: 1, parent: 2}, {id: 2}]
				 * }
				 * then the function should also NOT sync id: 2, but this sync should be done by the woo-sync-product-categories.service.ts
				 * 
				 */
				it('doesnt create an infinite reference sync loop. could happen if the referenced obj is in the same sync object being processed', async () => {
					
					//
					// cross-type reference
					//
					expect(await refFn({
						product: {
							1: {categories: [{id: 2}]}
						}
					})).toEqual({
						product_cat: {2: eo({})}
					});

					expect(await refFn({
						product_cat: {
							2: {name: ''},
						},
						product: {
							1: {categories: [{id: 2}]}
						}
					})).toEqual(undefined);

					//
					// same-type reference
					//
					
					expect(await refFn({
						product_cat: {
							1: {name: '', parent: 2},
						}
					})).toEqual({
						product_cat: {[2]: eo({})}
					});

					expect(await refFn({
						product_cat: {
							1: {name: '', parent: 2},
							2: {name: ''},
						}}
					)).toEqual(undefined);

				});

				it('doesnt create duplicate ids', async () => {
					expect(await refFn({
						product_cat: {
							1: {name: '', parent: 2},
						},
						product: {
							1: {categories: [{id: 2}]},
							2: {categories: [{id: 2}]},
						},
					})).toEqual({
						product_cat: {2: eo({})},
					});
				});

				it('calls the sync function with the referenced items to pre-sync', async () => {
					const mock = jest.spyOn(utils.rtlService, 'syncSingleClient' as any);

					utils.setAggregateIdsReturn({data: {
						product: {1: {categories: [{id: 2}]}},
						product_cat: {2: {id: 2, name: 'asd'}},
					}});
					await utils.sendCrudRequest({id: 1, item_type: WooTypes.product});
					await utils.rtlService['syncCrudUpdates']();

					// called twice
					// the first time from the normal sync task
					// the second time to sync the references before syncinng the normal sync task :3
					expect(mock).toHaveBeenCalledTimes(2);
					// in fact the last call contains the product_category
					expect(mock).toHaveBeenCalledWith(expect.any(String), tt.eo({data: {[WooTypes.prod_category]: {2: eo({})}}}), expect.anything());


					mock.mockRestore();
				});

			});

		});

	});
	
	describe('from local to remote', () => {

		it.todo('it lets product mov pass even if ext[0].originUrl === reqInfo.originUrl to ensure that they receive the bulkWrite for the cache');

		// before we checked if opts.forceSyncRef === true we return everything,
		// but the correct way was to deleted all the dependencies that are currently being synced
		//
		// this is because when we sync product-categories, it happens that we will sync the parent of the parent .. etc first
		// and thus instead of sending 100 categories at once, we send 1, 1, 1, 100, because the first three are parents of a category for example
		//
		// this causes a problem in woocommerce where it creates multiple times the same category, and here in local the problem is also present
		// where a single category has multiple same _externalIds.
		//
		// so if you have a better way to check this do it, otherwise this **SHOULD** be sufficient
		it.todo('getMissingRef with opts.forceSyncRef === true');

		describe('crud update', () => {

			const fn = async () => {
				return utils.ltrService['syncCrudUpdates']();
			}; 

			it('skips the unsupported modelClasses', async () => {
				expect(utils.getLocalWholeObject()).toEqual({});
				
				const supported = [ModelClass.InventoryCategory, ModelClass.Product, ModelClass.CustomerOrder, ModelClass.ProductMovement];

				// test all modelclasses
				for (const m of Object.values(ModelClass)) {
					if (supported.includes(m))
						continue;

					await utils.sendLocalCrudReq([new ObjectId().toString()], m);
				}

				expect(utils.getLocalWholeObject()).toEqual({});

				for (const m of supported) {
					expect(utils.getLocalWholeObject()).toEqual({});
					
					// test supported
					await utils.sendLocalCrudReq([new ObjectId().toString()], m);

					expect(utils.getLocalWholeObject()).not.toEqual({});
					// restore
					utils.ltrService['syncRequestItems'] = {};
				}
			});

			it('adds correct object replacing the old', async () => {
				await utils.sendLocalCrudReq(['asd'], undefined, {originUrl: 'hello_url'});
				expect(utils.getLocalWholeObject()).toEqual({
					[tt.testSlug]: eo({data: {[ModelClass.Product]: {
						'asd': eo({omitOriginUrls: ea(['hello_url'])})
					}},
				})});

				await utils.sendLocalCrudReq(['10'], undefined, {originUrl: 'hello_url_2'});
				expect(utils.getLocalWholeObject()).toEqual({
					[tt.testSlug]: eo({data: {[ModelClass.Product]: {
						'asd': eo({omitOriginUrls: ['hello_url']}), 
						'10': eo({omitOriginUrls: ['hello_url_2']})
					}},
				})});

				await utils.sendLocalCrudReq(['asd'], undefined, {originUrl: 'hello_url_2'});
				expect(utils.getLocalWholeObject()).toEqual({
					[tt.testSlug]: eo({data: {[ModelClass.Product]: {
						'asd': eo({omitOriginUrls: ['hello_url_2']}), 
						'10': eo({omitOriginUrls: ['hello_url_2']})
					}},
				})});
			});

			// same describe as the from remote to local tests i think
			describe('referenced items', () => {
				
				it('calls process() function is a specific order to avoid malforming data', async () => {
					// ordered function
					const fns: any[] = [
						[WooSyncProductCategories, 'buildWooCategories', ModelClass.InventoryCategory],
						[WooSyncProductCategories, 'sendWooCategories', ModelClass.InventoryCategory],
						
						[WooSyncProductsService, 'buildWooProducts', ModelClass.Product],
						[WooSyncProductsService, 'sendWooProducts', ModelClass.Product],

						[WooSyncOrdersService, 'buildWooOrders', ModelClass.CustomerOrder],
						[WooSyncOrdersService, 'sendWooOrders', ModelClass.CustomerOrder],
					];

					// disable functions as to have a precise time
					const dM = [
						jest.spyOn(AbstractDbItemController.prototype, 'findForUser'),
						jest.spyOn(utils.ltrService, 'getMissingRef' as any),
					];
					dM[0].mockImplementation(async () => []);
					dM[1].mockImplementation(async () => undefined);
					
					// replace the fns index with the getTime() and return a 100ms promise
					for (let i = 0; i < fns.length; i++) {
						jest.spyOn(fns[i][0], fns[i][1] as never).mockImplementation((slug, builtItem) => {
							(fns[i][0][fns[i][1]] as jest.Mock).mockRestore();
							fns[i] = new Date().getTime();
							// we return empty array for the send function (as to avoid executing bulkWrite())
							// and we return array with [1] for the build function (as to simulate a built endpoint so we can send())
							return tt.wait(100).then(() => builtItem === 1 ? [] : [1]);
						});
					}

					for (let i = 0; i < fns.length; i += 2)
						await utils.sendLocalCrudReq([new ObjectId().toString()], fns[i][2]);

					// process
					await fn();

					// restore mocks disable for performace
					dM.forEach(m => m.mockRestore());

					// ensure the difference is ~100 ms in order
					for (let i = 0; i < fns.length; i++)
						if (fns[i + 1])
							// we account for ~10ms of margin as to handle the calls in between different modelclasses
							if (fns[i + 1] > fns[i] + 110 || fns[i + 1] < fns[i] + 90)
								throw new Error('Difference not between limit');
				});
			
				describe('reference building function', () => {
				
					const refFn = async (mc: ModelClass, ids: (SyncableModel[]) | ((string | ObjectId)[])) => {
						let objs: SyncableModel[] = [];

						if (ids.length) {
							// query by ids
							if (typeof ids[0] === 'string' || MongoUtils.isObjectId(ids[0])) {
								
								const c = ControllersService.getInfoByModelClass(mc).controller;
								objs = await new c().findForUser(utils.getReqObj(), {_id: {$in: (ids as any).map(i => new ObjectId(i))}}, {skipFilterControl: true}) as any;
							}
							else {
								objs = ids as any;
							}

						}

						const cache: ModelIdsHm = {[mc]: {}};
						for (const i of objs) cache[mc][i._id.toString()] = {addedMs: 0};

						return utils.ltrService['getMissingRef']({}, {
							eps: [utils.extConfig],
							req: utils.getReqObj(),
							mc: mc,
							models: objs,
							slug: tt.testSlug,
							currentProcessing: cache,
						});
					}

					it('if category A depends on B and both are syncing then we do not return B as dependency', async () => {
						let cat0 = (await utils.catController.save([{name: '0'}]))[0];
						let cat1 = (await utils.catController.save([{name: '1', extends: new FetchableField(cat0._id, ModelClass.InventoryCategory)}]))[0];

						expect((await refFn(ModelClass.InventoryCategory, [cat1]))).toEqual({[ModelClass.InventoryCategory]: {[cat0._id.toString()]: eo({})}});
						expect((await refFn(ModelClass.InventoryCategory, [cat1, cat0]))).toEqual(undefined);
					});

					it('ensures that the referenced items in the currently processed item are present in db, otherwise syncs them', async () => {
						
						expect(await refFn(ModelClass.InventoryCategory, [])).toBe(undefined);
	
						// save correct _id, wrong extConnId
						let cats = await utils.catController.save([
							{name: '1', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: '2'}]}},
						]);
						let prods = await utils.prodController.save([
							{groupData: {category: new FetchableField(cats[0]._id, ModelClass.InventoryCategory)}},
						]);
						// expect for the sync
						expect(await refFn(ModelClass.Product, prods))
							.toEqual({[ModelClass.InventoryCategory]: {[cats[0]._id.toString()]: {addedMs: expect.any(Number), omitOriginUrls: ['2']}}});
	
						// save correct _id and correct extConnId
						await utils.catController.patch(cats[0], [{op: 'set', path: '_metaData', value: {_externalIds: [{_id: 1, _externalConnectionId: '1'}]}}]);
						// expect no sync
						expect(await refFn(ModelClass.Product, prods))
						.toEqual(undefined);
	
						// TODO test product dependencies (after we sync orders)
					});
	
					it('sends the referenced items to remote to correctly build refs', async () => {

						const og = HttpRequestService.request;

						const saved: any = {};
						// mock response from endpoint
						HttpRequestService.request = ((async (m, url, bod) => {
							const items = bod.items;

							if (url.includes(WPRemotePaths.create_easy_products)) {
								saved.products = items;
								return {data: {
									items: items.map((i, idx) => ({id: idx, meta_data: i.meta_data}))
								}};
							}
							else {
								saved.categories = items;
								return {data: {
									items: items.map((i, idx) => '_catid_' + idx),
								}};
							}
						}) as any);



						// save correct _id, wrong extConnId
						let cats = await utils.catController.save([
							{name: 'cat_thing', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: '2'}]}},
						]);
						
						let prodGroups = await utils.prodController.save([
							{groupData: {
								name: 'prod_thing',
								category: new FetchableField(cats[0]._id, ModelClass.InventoryCategory)}
							},
						]);


						// empty (no request)
						expect(saved).toEqual({});

						// we send only the product notification
						await utils.sendLocalCrudReq([prodGroups[0].models[0]._id], ModelClass.Product);
						await utils.ltrService['syncCrudUpdates']();

						// // but both are synced
						// expect(saved).toEqual({
						// 	categories: [eo({name: 'cat_thing'})],
						// 	// correct category id assigned in the mock
						// 	products: [eo({name: 'prod_thing', category_ids: ['_catid_0']})]
						// });

						HttpRequestService.request = og
					});

					// as local->remote we push to ALL remote endpoints
					// we need to check for each ref which endpoints are not yet synced :/
					// thus the returning object must contain the originUrl of at least 1 synced externalIds (if present obiovusly else it's an empty string)
					it.todo('when creating the toReference return object it uses the originUrl correctly for the object if it was already synced somehwere')

				});
				
				// do we need this ?
				it.todo('doesnt create an infinite reference sync loop. could happen if the referenced obj is in the same sync object being processed');

			});

			// when we receive customer order from wordpress, we exclude origin url from emit. we exclude it also for prod-mov which means no _metaData
			//
			// now when we change the status, we delete old movs and create new ones (the logic of priced rows), but as the old ones have no _metaData, on delete they are ignored
			// and this means that the new movs we create decrese the remote stock further as they are not "collapsed" with the _deleted ones
			//
			// here we ensure that the model class product mov is always added to the sync object, and then the woo-sync-prod-mov updates the _metaData without sending them
			// as we will be adding the originUrl into the omitUrl array
			it('if the model class is ProductMovement then it adds it to the emit even if the original req is from outside', async () => {
				expect(utils.getLocalWholeObject()).toEqual({});
				
				const mock = jest.spyOn(ExternalSyncUtils, 'getExternalConnections');
				mock.mockReturnValue(Promise.resolve([{...utils.extConfig, _id: '1', originUrl: 'origin_url_1'}]));

				const addWithOmitUrl = [ModelClass.ProductMovement];
				const all = [ModelClass.InventoryCategory, ModelClass.Product, ModelClass.CustomerOrder, ...addWithOmitUrl];

				for (const m of all) {
					expect(utils.getLocalWholeObject()).toEqual({});
					
					const id = new ObjectId().toString();
					await utils.sendLocalCrudReq([id], m, {originUrl: 'origin_url_1'});

					// ensure it is added with omit url
					if (addWithOmitUrl.includes(m)) {
						const obj = utils.getLocalWholeObject();
						expect(obj[tt.testSlug].data[m][id].omitOriginUrls).toEqual(['origin_url_1']);
					}
					else {
						expect(utils.getLocalWholeObject()).toEqual({});
					}
					utils.ltrService['syncRequestItems'] = {};
				}

				mock.mockRestore();
			});

		});

		describe('processing local crud', () => {

			// idk 
			it.todo('executes bulk write only if updates present and executes on raw collection (no crud updates)');

		});

	});

	describe('syncing local to remote', () => {

		// filter: {'externalSync.disabled.id': {$ne: extConn._id}}
		it.todo('takes only the ids that are not "externalSync.disabled.id === ext._id"');

	});

});

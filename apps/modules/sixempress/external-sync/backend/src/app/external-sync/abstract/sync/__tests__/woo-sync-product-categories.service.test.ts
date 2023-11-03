import { InventoryCategory } from "@paths/multi-purpose/inventory-categories/InventoryCategory";
import { InventoryCategoryController } from "@paths/multi-purpose/inventory-categories/InventoryCategory.controller";
import { SyncableModel } from "@services/external-sync/syncable-model";
import { ExternalConnection } from "@services/multip-config/multip-config.dtd";
import { ModelClass } from "@utils/enums/model-class.enum";
import { WooProductCategory } from "@woocommerce/woocommerce-rest-api";
import to from "await-to-js";
import { FetchableField, MongoUtils } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";
import { AddedIdInfo } from "../../woo.dtd";
import { WooSyncProductCategories } from "../sync-product-categories.service";

const utils = (() => {

	return {
		getReqObj: tt.generateRequestObject,
		
		extConfig: { _id: '1', locationId: '1', originUrl: '', auth: {}} as ExternalConnection,

		controller: tt.getBaseControllerUtils<InventoryCategory, Partial<InventoryCategory>, InventoryCategoryController>({ 
			controller: new InventoryCategoryController(), 
		}),

		process: (items: Partial<WooProductCategory>[], forceIds?: number[]) => {
			const ids: number[] = forceIds || [];
			const reference: {[i: string]: WooProductCategory} = {};

			for (let idx = 0; idx < items.length; idx++) {
				const i = items[idx];
				
				i.name = String(i.name || i.id || idx);

				if (!ids.includes(i.id))
					ids.push(i.id);

				reference[i.id] = i as WooProductCategory;
			}

			return WooSyncProductCategories.processCategories(utils.extConfig, utils.getReqObj(), ids, reference);
		},

		localBuild: async (items: (string[]) | (ObjectId[]) | (SyncableModel[])) => {
			
			if (items.length === 0) 
				return [];

			let localitems: InventoryCategory[];

			if (MongoUtils.isObjectId(items[0]) || typeof items[0] === 'string') {
				localitems = await new InventoryCategoryController().findForUser(utils.getReqObj(), {_id: {$in: (items as any).map(i => new ObjectId(i))}}, {skipFilterControl: true});
			} else {
				localitems = items as any;
			}
			
			const obj: AddedIdInfo = {};
			for (const i of localitems)
				obj[i._id.toString()] = {addedMs: 0};
			return WooSyncProductCategories.buildWooCategories([utils.extConfig], utils.getReqObj(), tt.testSlug, obj, localitems);
		}

	}
})();

beforeEach(async () => {
	await tt.dropDatabase();
});

describe("woo sync product categories", () => {

	it.todo('respects omittedUrls for endpoints');

	describe('remote to local', () => {
		
		it.todo('uses $elemMatch to get the items correctly based on remote id');

		it('create', async () => {
			await utils.process([
				{id: 1, name: 'hello'},
				{id: 2, name: 'helloa'},
			]);
	
			expect(await utils.controller.find()).toEqual(tt.arrayContaining([
				tt.eo({name: 'hello', _metaData: {_externalIds: [tt.eo({_id: 1})]}}),
				tt.eo({name: 'helloa', _metaData: {_externalIds: [tt.eo({_id: 2})]}}),
			]));
		});
	
		it('modify', async () => {
			await utils.process([
				{id: 1, name: 'hello'},
				{id: 2, name: 'helloa'},
			]);
	
			expect(await utils.controller.find()).toEqual(tt.arrayContaining([
				tt.eo({name: 'hello', _metaData: {_externalIds: [tt.eo({_id: 1})]}}),
				tt.eo({name: 'helloa', _metaData: {_externalIds: [tt.eo({_id: 2})]}}),
			]));
	
	
			await utils.process([
				{id: 1, name: 'xxx'},
				{id: 2, name: 'yyy'},
				{id: 3, name: 'zzzz'},
			]);
	
			expect(await utils.controller.find()).toEqual(tt.arrayContaining([
				tt.eo({name: 'xxx', _metaData: {_externalIds: [tt.eo({_id: 1})]}}),
				tt.eo({name: 'yyy', _metaData: {_externalIds: [tt.eo({_id: 2})]}}),
				tt.eo({name: 'zzzz', _metaData: {_externalIds: [tt.eo({_id: 3})]}}),
			]));
	
		});
	
		it('delete', async () => {
			await utils.process([
				{id: 1, name: 'hello'},
				{id: 2, name: 'helloa'},
			]);
	
			expect(await utils.controller.find()).toEqual(tt.arrayContaining([
				tt.eo({name: 'hello', _metaData: {_externalIds: [tt.eo({_id: 1})]}}),
				tt.eo({name: 'helloa', _metaData: {_externalIds: [tt.eo({_id: 2})]}}),
			]));
	
	
			await utils.process([
				{id: 2, name: 'yyy'},
				{id: 3, name: 'zzzz'},
			], [1]);
	
			// 1 is missing
			expect(await utils.controller.find()).toEqual(tt.arrayContaining([
				tt.eo({name: 'yyy', _metaData: {_externalIds: [tt.eo({_id: 2})]}}),
				tt.eo({name: 'zzzz', _metaData: {_externalIds: [tt.eo({_id: 3})]}}),
			]));

			await utils.process([], [1, 2, 3]);
			expect(await utils.controller.find()).toEqual([]);
		});

		// if the sync object contains [{id: 3, parent: 2}, {id: 2, parent: 1}, {id: 1}]
		// then the items should be correctly saved in the order 3, 2, 1
		// so as to build the correct local references for the extends field
		it('correctly builds refs when passed in the same sync object', async () => {
			// 1 -> 2 -> 3
			await utils.process([{id: 1, parent: 2}, {id: 2, parent: 3}, {id: 3}]);
			// ordered by id: 1, 2, 3
			let items = (await utils.controller.find()).sort((a, b) => a.name > b.name ? 1 : - 1);
			expect(items[0].extends.id).toBe(items[1]._id.toString());
			expect(items[1].extends.id).toBe(items[2]._id.toString());
			expect(items[2].extends).toBe(undefined);

			//
			// try again with a different process array order
			//
			await tt.dropDatabase();

			// 3 -> 2 -> 1
			await utils.process([{id: 3, parent: 2}, {id: 1}, {id: 2, parent: 1}]);
			// invert the sort to account for the inversed three order
			items = (await utils.controller.find()).sort((a, b) => a.name < b.name ? 1 : - 1);
			expect(items[0].extends.id).toBe(items[1]._id.toString());
			expect(items[1].extends.id).toBe(items[2]._id.toString());
			expect(items[2].extends).toBe(undefined);
		});

		it('adds/removes parent', async () => {
			await utils.process([{id: 1, parent: 2}, {id: 2}]);
			let item = (await utils.controller.find({name: '1'}))[0];
			let parent = (await utils.controller.find({name: '2'}))[0];
			expect(item.extends.id).toBe(parent._id.toString());
			expect(item._parentsTree).toEqual([parent._id.toString()]);

			await utils.process([{id: 1}]);
			item = (await utils.controller.find({name: '1'}))[0];
			expect(item.extends).toBe(undefined);
			expect(item._parentsTree).toBe(undefined);
		});
	
	});

	describe('local to remote', () => {

		it('orders the product categories by dependencies', async () => {
			let cat =  (await utils.controller.save([{name: '1'}]))[0];
			let cat2 = (await utils.controller.save([{name: '2', extends: new FetchableField(cat._id, ModelClass.InventoryCategory)}]))[0];
			let cat3 = (await utils.controller.save([{name: '3', extends: new FetchableField(cat2._id, ModelClass.InventoryCategory)}]))[0];

			const data1 = (await utils.localBuild([cat, cat2, cat3]))[0].remote;
			const data2 = (await utils.localBuild([cat2, cat, cat3]))[0].remote;
			const data3 = (await utils.localBuild([cat3, cat2, cat]))[0].remote;
			const data4 = (await utils.localBuild([cat3, cat, cat2]))[0].remote;
			
			// this one is an impossibile case as the references are checked before entering the function
			// const data5 = (await utils.localBuild([cat3, cat, cat3]))[0].remote;

			// expect all data to be equal
			expect(data1).toEqual(data2);
			expect(data1).toEqual(data3);
			expect(data1).toEqual(data4);
			
			// expect the array to be this
			expect(data1).toHaveLength(3);
			expect(data1[0]).toEqual(tt.eo({name: '1'}));
			expect(data1[1]).toEqual(tt.eo({name: '2'}));
			expect(data1[2]).toEqual(tt.eo({name: '3'}));

		});

		// this is skipped as we add the __extends field only if we sync the parent also
		it.skip('orders order safeswitch (prevent infinite loop)', async () => {
			let cat =  (await utils.controller.save([{name: '1'}]))[0];
			let cat2 = (await utils.controller.save([{name: '2', extends: new FetchableField(cat._id, ModelClass.InventoryCategory)}]))[0];
			let cat3 = (await utils.controller.save([{name: '3', extends: new FetchableField(cat2._id, ModelClass.InventoryCategory)}]))[0];

			(await utils.localBuild([cat, cat2, cat3]))[0].remote;
			(await utils.localBuild([cat2, cat, cat3]))[0].remote;
			(await utils.localBuild([cat3, cat2, cat]))[0].remote;
			(await utils.localBuild([cat3, cat, cat2]))[0].remote;

			// this will throw as cat3 depends on cat2 and cat2 is not present in this array
			const [e, d] = await to(utils.localBuild([cat3, cat, cat3]));
			expect(e).toBeTruthy();
		});

		// used to fall back to the __extends id if the parent id is not present in the remote or other problems
		it.todo('appends ALWAYS the __extends id if present in the syncing data obj');

		it.todo('create');
		it.todo('update');
		it.todo('delete');

	});

});

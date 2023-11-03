import { getBasicRest } from "./basic-rest-request";

const utils = (() => {
	return {
		...getBasicRest('products/categories', 'product_categories')
	}
})();

describe('categories', () => {

	it('creates', async () => {
		const ret = await utils.mySaveItems([{__id: 'a1', name: 'hello'}, {__id: 'a2', name: 'asd'}]);
		let ids = Object.values(ret) as number[];
		expect(ret).toEqual({a1: expect.any(Number), a2: expect.any(Number)});
		
		let saved = await utils.wooGetIds(ids);
		expect(saved).toEqual(tt.ea([tt.eo({name: 'hello'}), tt.eo({name: 'asd'})]));
	});

	it('updates', async () => {
		let ret = await utils.mySaveItems([{__id: 'a1', name: 'hello'}, {__id: 'a2', name: 'asd'}]);
		let ids = Object.values(ret) as number[];
		expect(ret).toEqual({a1: expect.any(Number), a2: expect.any(Number)});

		const saved = await utils.wooGetIds(ids);
		expect(saved).toEqual(tt.ea([tt.eo({name: 'hello'}), tt.eo({name: 'asd'})]));

		const oldIds = ids;
		ret = await utils.mySaveItems(ids.map((i, idx) => ({__id: 'a' + idx+1, id: i, name: 'id_name_' + i})));
		ids = Object.values(ret) as number[];
		expect(ids).toEqual(oldIds);

		const updated = await utils.wooGetIds(ids);
		// update the names of the cached saved objs
		saved.find(u => u.id === ids[0]).name = 'id_name_' + ids[0];
		saved.find(u => u.id === ids[1]).name = 'id_name_' + ids[1];
		expect(updated).toEqual(tt.ea(saved));
	});

	it('delets categories', async () => {
		const ret = await utils.mySaveItems([{__id: 'a1', name: 'hello'}]);
		let ids = Object.values(ret) as number[];
		expect(ret).toEqual({a1: expect.any(Number)});

		let saved = await utils.wooGetIds(ids);
		expect(saved).toEqual([tt.eo({name: 'hello'})]);

		await utils.myPostRaw({delete: ret});
		saved = await utils.wooGetIds(ids);
		expect(saved).toEqual([]);
	});

	it('deletes categories ids even if ids doesnt exists', async () => {
		const ar = [201391203, 1238982, 1328291, 3232212312];
		const b = await utils.myPostRaw({delete: ar});
		expect(b.delete).toEqual(ar);
	});

	it('creates a new category if the old id is deleted', async () => {
		let ret = await utils.mySaveItems([{__id: 'a1', name: 'hello'}]);
		let ids = Object.values(ret) as number[];
		expect(ret).toEqual({a1: expect.any(Number)});

		// check
		let saved = await utils.wooGetIds(ids);
		expect(saved).toEqual([tt.eo({name: 'hello'})]);

		// delete
		await utils.myPostRaw({delete: ret});
		saved = await utils.wooGetIds(ids);
		expect(saved).toEqual([]);

		// restore
		ret = await utils.mySaveItems([{__id: 'a1', id: ret[0], name: 'hello'}]);
		let newIds = Object.values(ret) as number[];
		saved = await utils.wooGetIds(ids);
		expect(saved).toEqual([]);
		saved = await utils.wooGetIds(newIds);
		expect(saved).toEqual([tt.eo({name: 'hello'})]);
	});

	it('builds refs with __extends', async () => {
		const ret = await utils.mySaveItems([
			{__id: 'a1', name: 'hello'}, 
			{__id: 'a2', __extends: 'a1', name: 'asd'},
			{__id: 'a3', __extends: 'a2', name: 'quakl'},
		]);
		let ids = Object.values(ret) as number[];
		expect(ret).toEqual({a1: expect.any(Number), a2: expect.any(Number), a3: expect.any(Number)});
		
		const parent = ret['a1'];
		const parent2 = ret['a2'];
		let saved = await utils.wooGetIds(ids);
		expect(saved).toEqual(tt.ea([
			tt.eo({name: 'hello'}), 
			tt.eo({name: 'asd', parent: parent}),
			tt.eo({name: 'quakl', parent: parent2}),
		]));
	});

	// if we send an invalid parent id it will fallback to use __extends
	it.todo('fallbacks to __extends if "parent id" is not present');

});

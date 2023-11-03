import { getBasicRest, productsRest } from './basic-rest-request';

const eo = expect.objectContaining;
const ea = tt.arrayContaining;

const utils = (() => {
	
	return {
		...productsRest,
		tag: getBasicRest('products/tags', ''),
	}

})();

beforeEach(async () => {
	await utils.dropProducts();
});


/**
 * When testing GET we try to use the POST of woo commerce directly instead of our own POST
 * and when testing POST we try to use the GET of woo commerce directly
 * 
 * this is to ensure that my GET does not have errors with my POST and they cancel out and it seems ok
 */
describe('woo products CUSTOM rest functions', () => {

	// if we stop sync and delete a prod, then re-enable sync, the product is re-created but with stock 0
	// so in that case we take the current_stock data to restore the stock info
	it.todo('when received a crud request for a deleted prod id we re-create a product with different id and implement the current_stock data');

	it('creates tags once', async () => {

		// clear tags
		let allTags = await utils.tag.wooGet();
		await utils.tag.wooBatch({delete: allTags.map(t => t.id)});
		allTags = await utils.tag.wooGet();
		expect(allTags).toHaveLength(0);

		// add one
		await utils.mySave([{name: 'hello', type: 'simple', create_tags: ['q']}]);
		allTags = await utils.tag.wooGet();
		expect(allTags).toHaveLength(1);
		expect(allTags).toEqual(tt.ea([
			tt.eo({name: 'q'}),
		]));

		// ad multiple
		await utils.mySave([
			{name: 'hello1', type: 'simple', create_tags: ['asxx', 'asdxx']},
			{name: 'hello2', type: 'simple', create_tags: ['vvaa', 'ax']},
		]);
		allTags = await utils.tag.wooGet();
		expect(allTags).toHaveLength(5);
		expect(allTags).toEqual(tt.ea([
			tt.eo({name: 'q'}),
			tt.eo({name: 'asxx'}),
			tt.eo({name: 'asdxx'}),
			tt.eo({name: 'vvaa'}),
			tt.eo({name: 'ax'}),
		]));


	});

	it('returns a hashmap of product ids and the metadata and variations array with same schema if present WITHOUT doubling the meta_data', async () => {
		let ids = (await utils.mySaveRaw({items: [
			{name: 'simp', type: 'simple', meta_data: [{key: '_gid', value: '0'}]},
			{name: 'hello', type: 'variable', meta_data: [{key: '_gid', value: '10'}, {key: '_childs', value: '123'}], attributes: [{name: 'color', options: ['red', 'yello']}], variations: [
				{meta_data: [{key: '_pid', value: '1'}], regular_price: '10.10', attributes: [{name: 'color', option: 'red'}]},
				{meta_data: [{key: '_pid', value: '2'}], regular_price: '10.15', attributes: [{name: 'color', option: 'yello'}]},
			]}
		]})).items;
		let ks = Object.keys(ids);
		expect(ks).toHaveLength(2);
		const items: any[] = Object.values(await utils.myGet(ks));
		const idsData = {
			simpleId: items.find(i => i.name === 'simp').id,
			varIds: {
				parent: items.find(i => i.name === 'hello').id,
				child0: items.find(i => i.name === 'hello').variations.find(v => v.attributes[0].option === 'red').id,
				child1: items.find(i => i.name === 'hello').variations.find(v => v.attributes[0].option === 'yello').id,
			}
		}
		expect(ids).toEqual({
			[idsData.simpleId]: {
				meta_data: [eo({key: '_gid', value: '0'})],
			},
			[idsData.varIds.parent]: {
				meta_data: ea([eo({key: '_gid', value: '10'}), eo({key: '_childs', value: '123'})]),
				variations: {
					[idsData.varIds.child0]: { meta_data: [eo({key: '_pid', value: '1'})] },
					[idsData.varIds.child1]: { meta_data: [eo({key: '_pid', value: '2'})] }
				},
			}
		});

		ids = (await utils.mySaveRaw({items: [
			{id: idsData.simpleId, name: 'simp', type: 'simple', meta_data: [{key: '_gid', value: '0'}]},
			{id: idsData.varIds.parent, name: 'hello', type: 'variable', meta_data: [{key: '_gid', value: '10'}, {key: '_childs', value: '123'}], attributes: [{name: 'color', options: ['red', 'yello']}], variations: [
				{id: idsData.varIds.child0, meta_data: [{key: '_pid', value: '1'}], regular_price: '10.10', attributes: [{name: 'color', option: 'red'}]},
				{id: idsData.varIds.child1, meta_data: [{key: '_pid', value: '2'}], regular_price: '10.15', attributes: [{name: 'color', option: 'yello'}]},
			]}
		]})).items;
		ks = Object.keys(ids);
		expect(ks).toHaveLength(2);
		expect(ids).toEqual({
			[idsData.simpleId]: {
				meta_data: [eo({key: '_gid', value: '0'})],
			},
			[idsData.varIds.parent]: {
				meta_data: ea([eo({key: '_gid', value: '10'}), eo({key: '_childs', value: '123'})]),
				variations: {
					[idsData.varIds.child0]: { meta_data: [eo({key: '_pid', value: '1'})] },
					[idsData.varIds.child1]: { meta_data: [eo({key: '_pid', value: '2'})] }
				},
			}
		});
	});

	it('creates simple product', async () => {
		const ids = await utils.mySave([{name: 'hello', type: 'simple', regular_price: '25.25'}]);
		expect(ids).toEqual([expect.any(Number)]);

		const saved = await utils.wooGet(ids);
		// no variations
		expect(saved[0].variations).toEqual(undefined);
		expect(saved).toEqual([eo({name: 'hello', type: 'simple', regular_price: '25.25'})]);
	});

	it('creates variable product', async () => {
		const ids = await utils.mySave([
			{name: 'hello', type: 'variable', attributes: [{name: 'color', options: ['red', 'yello']}], variations: [
				{regular_price: '10.10', attributes: [{name: 'color', option: 'red'}]},
				{regular_price: '10.15', attributes: [{name: 'color', option: 'yello'}]},
			]}
		]);
		// only one number, the variable parent
		expect(ids).toEqual([expect.any(Number)]);
		
		const saved = await utils.wooGet(ids);
		expect(saved[0].variations).toHaveLength(2);
		expect(saved).toEqual([
			eo({name: 'hello', type: 'variable', variations: ea([
				eo({regular_price: '10.10', attributes: [eo({name: 'color', option: 'red'})]}),
				eo({regular_price: '10.15', attributes: [eo({name: 'color', option: 'yello'})]}),
			])}),
		]);
	});

	it('allows you to update an item by just specifying the id', async () => {
		let ids = await utils.mySave([
			{name: 'hello', type: 'simple', regular_price: '25.25'},
			{name: 'baoi', type: 'simple', regular_price: '10.10'},
		]);
		let saved = await utils.wooGet(ids);
		expect(saved).toHaveLength(2);
		expect(saved).toEqual(ea([
			eo({name: 'hello', type: 'simple', regular_price: '25.25'}),
			eo({name: 'baoi', type: 'simple', regular_price: '10.10'}),
		]));
		

		const originalIds = ids;
		ids = await utils.mySave([
			{id: ids[0], name: 'not_so_hello', type: 'simple', regular_price: '25.10'},
			{id: ids[1], name: 'bai bai', type: 'simple', regular_price: '5.50'},
		]);
		expect(originalIds).toEqual(ids); // just to be sure

		saved = await utils.wooGet(ids);
		expect(saved).toHaveLength(2);
		expect(saved).toEqual(ea([
			eo({name: 'not_so_hello', type: 'simple', regular_price: '25.10'}),
			eo({name: 'bai bai', type: 'simple', regular_price: '5.50'}),
		]));
	});

	it('allows you to go from simple to variable and viceversa', async () => {
		const id = (await utils.mySave([{name: 'hello', type: 'simple', regular_price: '25.25'}]))[0];
		let item = (await utils.wooGet([id]))[0];
		expect(item).toEqual(eo({name: 'hello', type: 'simple', regular_price: '25.25'}));

		(await utils.mySave([{id, name: 'not_so_simple', type: 'variable', 
			attributes: [{name: 'color'}, {name: 'size'}],
			variations: [
				{regular_price: '1.00', attributes: [{name: 'color', option: 'red'}, {name: 'size', option: '1'}]},
				{regular_price: '2.00', attributes: [{name: 'color', option: 'yellow'}, {name: 'size', option: '2'}]},
			],
		}]))[0];

		item = (await utils.wooGet([id]))[0];
		// 2 variations
		expect(item.variations).toHaveLength(2);
		// 4 attributes
		expect(item.variations.reduce((_, c) => _ += c.attributes.length, 0)).toBe(4);

		expect(item).toEqual(eo({name: 'not_so_simple', type: 'variable', 
			attributes: ea([eo({name: 'color'}), eo({name: 'size'})]),
			variations: ea([
				eo({regular_price: '1.00', attributes: ea([eo({name: 'color', option: 'red'}), eo({name: 'size', option: '1'})])}),
				eo({regular_price: '2.00', attributes: ea([eo({name: 'color', option: 'yellow'}), eo({name: 'size', option: '2'})])}),
			])
		}));

		// back to simple
		(await utils.mySave([{id, name: 'simple_again', type: 'simple', regular_price: '11111.10'}]))[0];
		item = (await utils.wooGet([id]))[0];
		expect(item).toEqual(eo({name: 'simple_again', type: 'simple', regular_price: '11111.10'}));
	});

	it('allows you to save/update multiple prod at the times', async () => {
		let ids = await utils.mySave([
			{name: 'hello', type: 'simple', regular_price: '25.25'},
			{name: 'not_so_simple', type: 'variable', 
				attributes: [{name: 'color'}, {name: 'size'}],
				variations: [
					{regular_price: '1.00', attributes: [{name: 'color', option: 'red'}, {name: 'size', option: '1'}]},
					{regular_price: '2.00', attributes: [{name: 'color', option: 'yellow'}, {name: 'size', option: '2'}]},
				],
			}
		]);
		expect(ids).toEqual([expect.any(Number), expect.any(Number)]);
		let items = (await utils.wooGet(ids));
		expect(items).toEqual(ea([
			eo({name: 'hello', type: 'simple', regular_price: '25.25'}),
			eo({name: 'not_so_simple', type: 'variable',
				attributes: ea([eo({name: 'color'}), eo({name: 'size'})]),
				variations: ea([
					eo({regular_price: '1.00', attributes: ea([eo({name: 'color', option: 'red'}), eo({name: 'size', option: '1'})])}),
					eo({regular_price: '2.00', attributes: ea([eo({name: 'color', option: 'yellow'}), eo({name: 'size', option: '2'})])}),
				])
			})
		]));

		ids = await utils.mySave([
			{id: ids[0], name: 'aaaaaaaaaaaaaaaaa', type: 'simple', regular_price: '25.25'},
			{id: ids[1], name: 'BBBBBBBBBBBBBBBBB', type: 'variable', 
				attributes: [{name: 'color'}, {name: 'size'}],
				variations: [
					{regular_price: '1.00', attributes: [{name: 'color', option: 'red'}, {name: 'size', option: '1'}]},
					{regular_price: '2.00', attributes: [{name: 'color', option: 'yellow'}, {name: 'size', option: '2'}]},
				],
			},

			{name: 'second_simple', type: 'simple', regular_price: '25.25'},
			{name: 'second_not_so_simple', type: 'variable', 
				attributes: [{name: 'color'}],
				variations: [{regular_price: '2.00', attributes: [{name: 'color', option: '2'}]}],
			},
		]);
		expect(ids).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]);
		items = (await utils.wooGet(ids));
		expect(items).toEqual(ea([
			eo({id: ids[0], name: 'aaaaaaaaaaaaaaaaa', type: 'simple', regular_price: '25.25'}),
			eo({id: ids[1], name: 'BBBBBBBBBBBBBBBBB', type: 'variable',
				attributes: ea([eo({name: 'color'}), eo({name: 'size'})]),
				variations: ea([
					eo({regular_price: '1.00', attributes: ea([eo({name: 'color', option: 'red'}), eo({name: 'size', option: '1'})])}),
					eo({regular_price: '2.00', attributes: ea([eo({name: 'color', option: 'yellow'}), eo({name: 'size', option: '2'})])}),
				])
			}),

			eo({name: 'second_simple', type: 'simple', regular_price: '25.25'}),
			eo({name: 'second_not_so_simple', type: 'variable',
				attributes: ea([eo({name: 'color'})]),
				variations: ea([
					eo({regular_price: '2.00', attributes: ea([eo({name: 'color', option: '2'})])}),
				])
			}),
		]));

	});

	it('adds sku/cod to the correct field if no conflict are present, otherwise it adds it to the name', async () => {
		let ids = await utils.mySave([{name: 'hello', type: 'simple', regular_price: '25.25', sku: '123'}]);
		let saved = await utils.wooGet(ids);

		// no variations
		expect(saved[0].variations).toEqual(undefined);
		expect(saved).toEqual([eo({name: 'hello', type: 'simple', regular_price: '25.25', sku: '123'})]);

		ids = [...ids, ...await utils.mySave([{name: 'hello_2', type: 'simple', regular_price: '25.25', sku: '123'}])];
		saved = await utils.wooGet(ids);
		expect(saved).toEqual(tt.ea([
			tt.eo({name: 'hello', type: 'simple', regular_price: '25.25', sku: '123'}),
			tt.eo({name: 'hello_2 [123]', type: 'simple', regular_price: '25.25'}),
		]));

	});

	// here we enusre that the new WC_Product() classes are instanced with the id ($p['id']) passed to them
	// ensure to pass id to:
	// wc_product_simple
	// wc_product_variant
	// wc_product_sariation
	it.todo('allows you to set stock_status of simple and variiations');

	// happens if the product id was completely deleted withouth sync or the given id is invalid
	it.todo('creates a new product model if a passed id is invalid')

	it.todo('restore trashed product (by changin status "publish" "trash")');

	// it('delets products', async () => {
	// 	const ids = await utils.mySave([{name: 'hello', type: 'simple', regular_price: '25.25'}]);
	// 	expect(ids).toEqual([expect.any(Number)]);

	// 	let saved = await utils.wooGet(ids);
	// 	expect(saved).toEqual([eo({name: 'hello', type: 'simple', regular_price: '25.25'})]);

	// 	await utils.mySaveRaw({delete: ids});
	// 	saved = await utils.wooGet(ids);
	// 	expect(saved).toEqual([]);
	// });

	// it('deletes product ids even if ids doesnt exists', async () => {
	// 	const ar = [201391203, 1238982, 1328291, 3232212312];
	// 	const b = await utils.mySaveRaw({delete: ar});
	// 	expect(b.delete).toEqual(ar);
	// });

});

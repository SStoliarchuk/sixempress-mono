import to from 'await-to-js';
import { productsRest } from './basic-rest-request';

const eo = expect.objectContaining;
const ea = expect.arrayContaining;

const utils = (() => {

	return {
		...productsRest,
	}

})();

/**
 * When testing GET we try to use the POST of woo commerce directly instead of our own POST
 * and when testing POST we try to use the GET of woo commerce directly
 * 
 * this is to ensure that my GET does not have errors with my POST and they cancel out and it seems ok
 */
describe('additional endpoints', () => {

	describe('get aggregate ids', () => {

		it('returns the products with the correct types', async () => {
			const saved = await utils.wooBatch({create: [
				{type: 'grouped'},
				{type: 'external'},
				{type: 'simple'},
				{type: 'variable'},
			]});

			expect(Object.values(await utils.myGet(saved.create.map(p => p.id)))).toEqual([
				eo({type: 'grouped'}),
				eo({type: 'external'}),
				eo({type: 'simple'}),
				eo({type: 'variable'}),
			])
		});

		it('returns variable products with variations field filled with child objects instead of ids', async () => {
			const saved = await utils.mySave([{
				type: 'variable', 
				attributes: [{name: 'size'}],
				variations: [{regular_price: '9.32', attributes: [{name: 'size', option: '32'}]}],
			}]);
			const prodId = saved[0];

			// we add these two with another method just to be safe it's added correctly
			await utils.wooProduct(prodId + '/variations', {regular_price: '16.90', attributes: [{name: 'size', option: '16'}]});
			await utils.wooProduct(prodId + '/variations/batch', {create: [{regular_price: '8.90', attributes: [{name: 'size', option: '8'}]}]});
			
			const get = (await utils.myGet([prodId]))[prodId];
			expect(get.variations).toHaveLength(3);
			expect(get).toEqual(eo({
				type: 'variable',
				id: prodId,
				variations: ea([
					eo({regular_price: '16.90', attributes: [eo({name: 'size', option: '16'})]}),
					eo({regular_price: '9.32', attributes: [eo({name: 'size', option: '32'})]}),
					eo({regular_price: '8.90', attributes: [eo({name: 'size', option: '8'})]}),
				])
			}));

		});

		it.todo('if we ask for a product_variation id, it returns that product variation with a field "parent" containg the WooProductSimple (aka as we would process normally a product id)')

		it('returns multiple items togheter', async () => {
			const prodId = (await utils.wooBatch({create: [
				{type: 'simple', name: 'im a simple prod'},
			]})).create[0].id;

			const varProdId = (await utils.mySave([{
				type: 'variable', 
				name: 'not so simple prod',
				attributes: [{name: 'size'}],
				variations: [
					{regular_price: '9.32', attributes: [{name: 'size', option: '32'}]},
					{regular_price: '9.32', attributes: [{name: 'size', option: '10'}]},
				],
			}]))[0];

			const orderId = (await utils.wooRequest('POST', 'orders', {
				billing: {first_name: 'John'}
			})).id;

			const retObj = await utils.myGet({product: [prodId, varProdId], order: [orderId]});

			expect(retObj).toEqual({
				product: {
					[prodId]: eo({type: 'simple', name: 'im a simple prod'}),
					[varProdId]: eo({type: 'variable', name: 'not so simple prod', variations: [
						eo({regular_price: '9.32', attributes: [eo({name: 'size', option: '32'})]}),
						eo({regular_price: '9.32', attributes: [eo({name: 'size', option: '10'})]}),
					]}),
				},
				order: {
					[orderId]: eo({billing: eo({first_name: 'John'})}),
				}
			})

		});

		// we do this as to ensure that we dont get any false positives as we return an empty array or what
		it('gives error on post_type not supported', async () => {
			let e, d;
			[e, d] = await to(utils.myGet({product: []}));
			expect(e).toBe(null);

			[e, d] = await to(utils.myGet({sdasdasdasd: []}));
			expect(e).not.toBe(null);
		});

		it('doesnt add any key if the id not found', async () => {
			let get = await utils.myGet({product: [31231233212, 132312312313], order: [231123123233]});
			expect(get).toEqual({product: [], order: []});
		});

	});

});

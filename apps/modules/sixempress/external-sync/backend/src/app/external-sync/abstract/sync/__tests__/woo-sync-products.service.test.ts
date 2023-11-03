import { CrudCollection, FetchableField, HttpRequestService, } from "@sixempress/main-be-lib";
import { ModelClass } from '@utils/enums/model-class.enum';
import { ObjectId } from "mongodb";
import { Product, ProductType } from "../../../../../../paths/multi-purpose/products/Product";
import { ProductGroup } from "../../../../../../paths/multi-purpose/products/ProductGroup";
import { dropDatabase } from "../../../../../../tests/setupTests";
import { AddedIdInfo, ItemsBuildOpts, WooProductSimple, WooSavedProductResponse } from "../../woo.dtd";
import { WooSyncProductsService, NameMappingReturn } from "../sync-products.service";
import { AxiosResponse } from 'axios';
import { ExternalConnection, ExternalConnectionType } from "../../../../../multip-config/multip-config.dtd";
import { ExternalSyncUtils } from "../../../external-sync.utils";
import { getMetaDataPrefix } from "../../../syncable-model";
import { PartialGroup } from '../../../../../../tests/commonTests';
import { ProductTypeController } from "../ProductType.controller";
import { WooTypes } from "../../woo.enum";

const eo = expect.objectContaining;
const ea = tt.arrayContaining;

const utils = (() => {

	const returns = {
		httpRes: {data: {}} as Partial<AxiosResponse<WooSavedProductResponse>>,
	};
	HttpRequestService.request = async () => returns.httpRes as any;

	
	const _internal = {
		extConfig: {
			_id: '1', 
			locationId: '1', 
			originUrl: '',
			auth: {},
		} as ExternalConnection,
	}

	return {
		setHttpRequestReutnr: (m: Partial<AxiosResponse<WooSavedProductResponse>>) => {
			returns.httpRes = m;
		},
		getReqObj: tt.generateRequestObject,
		service: WooSyncProductsService,
		extConfig: _internal.extConfig,
		controller: tt.getProdController({extConn: _internal.extConfig}),

		process: (items: ((WooProductSimple & {id: number, variations?: (WooProductSimple & {id: number})[]})[]), maps?: ItemsBuildOpts['forceProductMapping']) => {
			const ids: number[] = [];
			const reference: {[i: string]: WooProductSimple} = {};
			for (const i of items) {
				ids.push(i.id);
				i.type = i.type || (i.variations ? 'variable' : 'simple');
				reference[i.id] = i;
			}
			return WooSyncProductsService.receiveFromRemote(utils.extConfig, utils.getReqObj(), ids, reference, {forceProductMapping: maps});
		},
		processForRemote: async (pgs: PartialGroup[], ep?: Partial<ExternalConnection>[], manualIdsParam?: AddedIdInfo | ((models: Product[]) => AddedIdInfo)) => {
				
			// create amounts cache for later setting started amount
			const amounts: {obj: Product, amount: number}[] = [];
			for (const p of pgs)
				for (const m of (p.ms || p.models || []))
					if (m._totalAmount)
						amounts.push({obj: m as any, amount: m._totalAmount});

			// add to db the items		
			const saved = await utils.controller.save(pgs);
			// and now set their amounts
			for (const a of amounts)
				await utils.controller.setAmount(a.obj._id, a.amount);

			const ids: string[] = [];
			const models: Product[] = [];
			for (const s of saved) {
				for (const m of s.models) {
					models.push(m);
					ids.push(m._id.toString())
				}
			}


			const data = 
				!manualIdsParam 
					? ids.reduce((car, i) => (car[i] = {}, car), {}) 
				: typeof manualIdsParam === 'function' 
					? manualIdsParam(models) 
				: manualIdsParam 

			// mock
			const extrnals: ExternalConnection[] = (ep as any || [utils.extConfig]);
			extrnals.forEach(e => e.type = ExternalConnectionType.wordpress);
			ExternalSyncUtils.getExternalConnections = () => new Promise(r => r(extrnals));
			
			const local = await new ProductTypeController().findForUser(utils.getReqObj(), {_id: {$in: Object.keys(data).map(i => new ObjectId(i))}}, {skipFilterControl: true});
			
			const transalted = await utils.service.buildWooProducts(extrnals, utils.getReqObj(), tt.testSlug, data, local);
			return ep ? transalted : transalted[0].remote;
			// return {woo: transalted, saved: await utils.controller.find({_id: {$in: saved.map(s => s._id)}})};
		}

	}
})();

beforeEach(async () => {
	await dropDatabase();
});

describe('woo sync products service', () => {

	it.todo('respects omittedUrls for endpoints');

	describe('unique tag (COD / SKU)', () => {

		describe('remote -> local', () => {

			it.todo('sets group SKU (groupData.uniqueTags) and each variations SKU (infoData.sku)');
			
			it('if code is not used, it is added to the unique tags, otherwise it is added to the name', async () => {
			
				await utils.process([{
					id: 10,
					name: 'test',
					regular_price: '12.2',
					sku: '123',
				}, {
					id: 12, 
					name: 'second',
					regular_price: '10.00',
					sku: '126',
				}]);
				let pgs = await utils.controller.find();
				
				expect(pgs).toEqual(tt.ea([
					tt.eo({groupData: tt.eo({name: 'test', uniqueTags: ['123']})}),
					tt.eo({groupData: tt.eo({name: 'second', uniqueTags: ['126']})}),
				]));

				await utils.process([{
					id: 102,
					name: 'test_2',
					regular_price: '12.2',
					sku: '123',
				}, {
					id: 122, 
					name: 'second_2',
					regular_price: '10.00',
					sku: '126',
				}]);
				pgs = await utils.controller.find();
				// expect only 2 pgs with uniqueTags
				expect(pgs.map(pg => pg.groupData.uniqueTags).filter(i => i)).toHaveLength(2);
				expect(pgs).toEqual(tt.ea([
					tt.eo({groupData: tt.eo({name: 'test', uniqueTags: ['123']})}),
					tt.eo({groupData: tt.eo({name: 'second', uniqueTags: ['126']})}),

					tt.eo({groupData: tt.eo({name: '[123] test_2'})}),
					tt.eo({groupData: tt.eo({name: '[126] second_2'})}),
				]));

			});

		});

		describe('local -> remote', () => {

			it.skip('infoData.sku has more priority than groupData.uniqueTags', async () => {
				const res = await utils.processForRemote([{
					gd: {name: "simple", uniqueTags: ['x02', '445']},
					ms: [{variationData: {sellPrice: 100}, infoData: {sku: ['1']}}],
				}, {
					gd: {name: "variable", uniqueTags: ['x025', '5']},
					ms: [
						{infoData: {sku: ['1']}, variationData: {sellPrice: 500}, vv: [{name: 'size', value: '1'}, {name: 'color', value: 'blu'}]},
						{infoData: {sku: ['2']}, variationData: {sellPrice: 120}, vv: [{name: 'size', value: '2'}, {name: 'color', value: 'red'}]},
						{infoData: {sku: ['3']}, variationData: {sellPrice: 1100}, vv: [{name: 'size', value: '3'}, {name: 'color', value: 'yel'}]},
					],
				}]);
				
				expect(res).toEqual(ea([ 
					eo({
						name: 'simple',
						type: 'simple',
						sku: '1',
					}),
					eo({
						name: 'variable',
						type: 'variable',
						sku: 'x025',
						variations: tt.ea([
							tt.eo({sku: '1', regular_price: '5.00'}),
							tt.eo({sku: '2', regular_price: '1.20'}),
							tt.eo({sku: '3', regular_price: '11.00'}),
						])
					}),
				]))
			});

			it('if code is not used, it is added to the unique tags, otherwise it is added to the name', async () => {

				const res = await utils.processForRemote([{
					gd: {name: "simple", uniqueTags: ['x02', '445']},
					ms: [{variationData: {sellPrice: 100}}],
				}, {
					gd: {name: "variable", uniqueTags: ['x025', '5']},
					ms: [
						{variationData: {sellPrice: 500}, vv: [{name: 'size', value: '1'}, {name: 'color', value: 'blu'}]},
						{variationData: {sellPrice: 120}, vv: [{name: 'size', value: '2'}, {name: 'color', value: 'red'}]},
						{variationData: {sellPrice: 1100}, vv: [{name: 'size', value: '3'}, {name: 'color', value: 'yel'}]},
					],
				}]);
				
				expect(res).toEqual(ea([ 
					eo({
						name: 'simple',
						type: 'simple',
						sku: 'x02',
					}),
					eo({
						name: 'variable',
						type: 'variable',
						sku: 'x025',
					}),
				]))
			});

		});

	});

	describe('from REMOTE to LOCAL', () => {

		it.todo('picks the correct products by check the id agains the exteernal._id and external._wooProductGroupId while checking also for the external._id')

		it.todo('doesnt execute save function if the item has not changed');
		
		it.todo('doesnt execute save if only product amount has changed');

		describe('creates additional data', () => {

			// uses $elemMatch
			it.todo('correctly queries items');

			it.todo('creates the correct remote_id => ibasemodel hashmap');

		});

		// here we ensure we dont just check for the fields separately with
		// {
		//   '_metaData._externalIds._externalConnectionId': ext._id,
		//   '_metaData._externalIds._additional._wooProductGroupId': {$in: ids},
		// }
		//
		// but we use
		// '_metaData._externalIds': {$elemMatch: {
		// 	'_externalConnectionId': ext._id,
		// 	'_additional._wooProductGroupId': {$in: ids},
		// }}
		//
		// this is because the first approach gives false positives
		// even tho we "filter" them with logic later on
		it.todo('ensures that the query for reference items is correct by using $elemMatch on "_metaData._externalIds"');

		describe('create', () => {

			it('simple product', async () => {
				await utils.process([{
					id: 10,
					name: 'test',
					regular_price: '12.2',
				}, {
					id: 12, 
					name: 'second',
					regular_price: '10.00',
				}]);
				let pgs = await utils.controller.find();
				expect(pgs).toHaveLength(2);
				
				const first = pgs.find(p => p.groupData.name === 'test');
				expect(first.models).toHaveLength(1);
				expect(first.models[0]).toEqual(eo({
					_metaData: eo({_externalIds: ea([eo({_id: 10, _additional: eo({_wooProductGroupId: 10})})])}),
					groupData: eo({name: 'test', type: ProductType.product}),
					variationData: eo({sellPrice: 1220}),
				}));

				const second = pgs.find(p => p.groupData.name === 'second');
				expect(second.models).toHaveLength(1);
				expect(second.models[0]).toEqual(eo({
					_metaData: eo({_externalIds: ea([eo({_id: 12, _additional: eo({_wooProductGroupId: 12})})])}),
					groupData: eo({name: 'second', type: ProductType.product}),
					variationData: eo({sellPrice: 1000}),
				}));
			});

			it('variable product', async () => {
				await utils.process([{
					id: 40,
					regular_price: '2.50',
					name: 'hellso',
					type: 'variable',
					variations: [
						{
							id: 10,
							regular_price: '10.10',
							attributes: [{
								name: 'size',
								option: '16',
							}]
						},
						{
							id: 15,
							regular_price: '10.15',
							attributes: [{
								name: 'size',
								option: '32',
							}]
						}
					],
				}]);

				let pgs = await utils.controller.find();
				expect(pgs).toHaveLength(1);
				
				const first = pgs.find(p => p.groupData.name === 'hellso');
				expect(first.models).toHaveLength(2);
				expect(first.models).toEqual(ea([
					eo({
						_metaData: eo({_externalIds: ea([eo({_id: 10, _additional: eo({_wooProductGroupId: 40})})])}),
						groupData: eo({name: 'hellso', type: ProductType.product}),
						variationData: eo({sellPrice: 1010, variants: ea([{name: 'size', value: '16'}])}),
					}),
					eo({
						_metaData: eo({_externalIds: ea([eo({_id: 15, _additional: eo({_wooProductGroupId: 40})})])}),
						groupData: eo({name: 'hellso', type: ProductType.product}),
						variationData: eo({sellPrice: 1015, variants: ea([{name: 'size', value: '32'}])}),
					}),
				]))
			});

			it('ignores a type not supported', async () => {
				await utils.process([{
					id: 10,
					name: 'test',
					regular_price: '12.2',
					type: 'grouped',
				}]);
				expect(await utils.controller.find()).toHaveLength(0);
			});
			
			it.skip('adds externalSync enabled id from the coming connection', async () => {
				await utils.process([{
					id: 10,
					name: 'hello',
				}]);

				expect(await utils.controller.find()).toEqual([
					eo({ externalSync: eo({enabled: [{id: utils.extConfig._id}]}) }),
				])
			});

		});
		
		describe('update', () => {
			
			// in simple remote, simple local, (aka 1 active model, n _deleted model). we passed the first model of the PG, and not the filtered active models array
			// it was a typo, so here we need to ensure that we pass to the translate function the first non _deleted model ._.
			it('when modifying simple -> simple, ensure we pass the first non _deleted local ref to the translate function', async () => {
				const buildFn = (pg: ProductGroup) => {
					return WooSyncProductsService['translateProductGroup'](utils.extConfig, {} as any, {type: 'simple', name: 'asd'}, pg);
				}

				await utils.controller.save([{ms: [{_deleted: 1}, {}]}]);
				const pgs = await utils.controller.find({}, {keepAllVariations: true});
				
				// expect for the first item in array to be _deleted
				expect(pgs[0].models[0]._deleted).not.toBe(undefined);
				
				const r = buildFn(pgs[0]);

				// expect the built model to not be the _deleted variation
				// but the other variant regardless of saleable compatibility as we're in simple mode
				expect(r.models[0].variationData).not.toEqual(pgs[0].models[0].variationData);
				
			});

			// // this is to check if the item was ever synced with remote or not
			// it('we add setAmount only if no models (even deleted etc) have an ext id connection');

			it('updates only if the product has enabled the external sync position', async () => {
				await utils.process([{
					id: 10,
					name: 'hello',
				}]);

				await utils.process([{
					id: 10,
					name: 'hellowo',
				}]);
				
				expect(await utils.controller.find()).toEqual([
					eo({ 
						groupData: eo({name: 'hellowo'}),
					}),
				]);
				// block external connection
				await utils.controller.controller.getCollToUse(utils.getReqObj()).updateMany({}, {$set: {externalSync: {disabled: [{id: utils.extConfig._id}]}}});
			
				await utils.process([{
					id: 10,
					name: 'hellowowowowow',
				}]);
				expect(await utils.controller.find()).toEqual([
					eo({ 
						groupData: eo({name: 'hellowo'}),
					}),
				]);

			});

			// if the changed product id is an id of a variation, then the woo aggregator returns that product with the field
			// "parent" containing the whole wooproduct parent
			// so what we do is we continue the update operations by using that whole wooproduct parent
			it.todo('updates whole product-group if we send a product_variation changed id');

			describe('updates from variable to simple product', () => {

				it('keeps the most common variation/infoData', async () => {
					const id = new ObjectId();
					await utils.controller.save([{
						// info data
						gd: {name: 'abc'}, ms: [{
							extId: [{id: 11, p: 10}],
							infoData: { barcode: ['samesame'] },
							v: {buyPrice: 4, sellPrice: 15, supplier: new FetchableField(new ObjectId(), ModelClass.Supplier)}, 
							vv: [{name: 'type', value: '1'}, {name: 'color', value: 'blue'}],
						}, {
							extId: [{id: 12, p: 10}],
							infoData: { barcode: ['samesame'] },
							v: {buyPrice: 1, sellPrice: 10, supplier: new FetchableField(new ObjectId(), ModelClass.Supplier)}, 
							vv: [{name: 'type', value: '2'}, {name: 'color', value: 'yellow'}],
						}]
					}, {
						// variation data
						gd: {name: 'abc'}, ms: [{
							extId: [{id: 250, p: 40}],
							infoData: { barcode: ['nono', 'ass'] },
							v: {buyPrice: 10, sellPrice: 10, supplier: new FetchableField(id, ModelClass.Supplier)},
							vv: [{name: 'type', value: '1'}, {name: 'color', value: 'blue'}],
						}, {
							extId: [{id: 251, p: 40}],
							infoData: { barcode: ['nono', 'sa'] },
							v: {buyPrice: 10, sellPrice: 10, supplier: new FetchableField(id, ModelClass.Supplier)},
							vv: [{name: 'type', value: '2'}, {name: 'color', value: 'yellow'}],
						}, { 
							extId: [{id: 252, p: 40}],
							infoData: { barcode: ['nono', '31222'] },
							v: {buyPrice: 10, sellPrice: 10, supplier: new FetchableField(id, ModelClass.Supplier)},
							vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
						}]
					}]);

					await utils.process([{
						id: 10,
						name: 'info_first',
						type: 'simple',
						regular_price: '25.00',
					}, {
						id: 40,
						name: 'var_second',
						type: 'simple',
						regular_price: '10.66',
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'info_first', type: ProductType.product},
							models: ea([
								eo({
									infoData: { barcode: ['samesame'] },
									variationData: {buyPrice: 0, sellPrice: 2500, variants: []},
								}),
							]),
						}),
						eo({
							groupData: {name: 'var_second', type: ProductType.product},
							models: ea([
								eo({
									// expect one automatic tring
									infoData: { barcode: ea([expect.any(String)]) },
									variationData: {buyPrice: 10, sellPrice: 1066, supplier: new FetchableField(id, ModelClass.Supplier), variants: []},
								}),
							]),
						}),
					]));

				});

				// we need to update each time the _metaData field accordingly by removing the parent id
				// that's the reason we modify the simple, to ensure that it is visible with the proper id
				it('allows you to go variable -> simple -> simple (modified) -> variable', async () => {

					await utils.process([{
						id: 10,
						name: 'not_anymore',
						type: 'variable',
						variations: [
							{id: 10, regular_price: '10.10', attributes: [{name: 'size', option: '16'}]},
							{id: 15, regular_price: '10.15', attributes: [{name: 'size', option: '32'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'not_anymore', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 1010, variants: ea([eo({name: 'size', value: '16'})])})}),
								eo({variationData: eo({sellPrice: 1015, variants: ea([eo({name: 'size', value: '32'})])})}),
							]),
						}),
					]));

					await utils.process([{
						id: 10,
						name: 'simple',
						type: 'simple',
						regular_price: '25.00',
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'simple', type: ProductType.product},
							models: [eo({variationData: eo({sellPrice: 2500})})],
						}),
					]));

					await utils.process([{
						id: 10,
						name: 'simple_but_not_that_one',
						type: 'simple',
						regular_price: '30.00',
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'simple_but_not_that_one', type: ProductType.product},
							models: [eo({variationData: eo({sellPrice: 3000})})],
						}),
					]));

					await utils.process([{
						id: 10,
						name: 'not_anymore',
						type: 'variable',
						variations: [
							{id: 10, regular_price: '10.10', attributes: [{name: 'size', option: '16'}]},
							{id: 15, regular_price: '10.15', attributes: [{name: 'size', option: '32'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'not_anymore', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 1010, variants: ea([eo({name: 'size', value: '16'})])})}),
								eo({variationData: eo({sellPrice: 1015, variants: ea([eo({name: 'size', value: '32'})])})}),
							]),
						}),
					]));

				});
				
			});

			describe("updates from simple to variable", () => {

				// here we simulate wordpress that when creating the variations
				// first emits the variation with the basic data
				//
				// then after the user presses "update" it sends the variations with the actual inserted data
				// like the amount to set
				it('correctly remaps the amounts', async () => {
					await utils.process([{
						id: 10,
						name: 'info_first',
						type: 'simple',
						regular_price: '25.00',
						manage_stock: true,
						stock_quantity: 10,
					}]);
	
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'info_first', type: ProductType.product},
							models: ea([
								eo({_totalAmount: 10, variationData: {buyPrice: 0, sellPrice: 2500, variants: []},}),
							]),
						}),
					]));

					// simulate creating the empty variations
					await utils.process([{
						id: 10,
						name: 'info_first',
						type: 'variable',
						regular_price: '25.00',
						manage_stock: true,
						stock_quantity: 10,
						variations: [{
							id: 101,
							name: 'info_first',
							type: 'variable',
							regular_price: '0.00',
							manage_stock: 'parent',
							attributes: [{name: 'a', option: '1'}],
						}, {
							id: 102,
							name: 'info_first',
							type: 'variable',
							regular_price: '0.00',
							manage_stock: 'parent',
							attributes: [{name: 'a', option: '2'}],
						}]
					}]);
	
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'info_first', type: ProductType.product},
							models: ea([
								eo({_deleted: expect.anything(), _totalAmount: 10, variationData: {buyPrice: 0, sellPrice: 2500, variants: []},}),
								eo({_totalAmount: 0, variationData: {buyPrice: 0, sellPrice: 0, variants: [{name: 'a', value: '1'}]},}),
								eo({_totalAmount: 0, variationData: {buyPrice: 0, sellPrice: 0, variants: [{name: 'a', value: '2'}]},}),
							])						
						}),
					]));

					// then after we set the variation options, and we set the stock
					// due to how remote-to-local sync work, we sync immediately the stock movements
					// which will refer to the local variation that are still not updated, as we debounce the update to the products
					//
					// thus the stock info will be set to those "empty" variations given by woocommerce

					const pgs = await utils.controller.find();
					await utils.controller.setAmount(pgs[0].models.find(m => m.variationData.variants[0]?.value === '1'), 11);
					await utils.controller.setAmount(pgs[0].models.find(m => m.variationData.variants[0]?.value === '2'), 22);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'info_first', type: ProductType.product},
							models: ea([
								eo({_deleted: expect.anything(), _totalAmount: 10, variationData: {buyPrice: 0, sellPrice: 2500, variants: []},}),
								eo({_totalAmount: 11, variationData: {buyPrice: 0, sellPrice: 0, variants: [{name: 'a', value: '1'}]},}),
								eo({_totalAmount: 22, variationData: {buyPrice: 0, sellPrice: 0, variants: [{name: 'a', value: '2'}]},}),
							])						
						}),
					]));

					// now as the stock have been updated, as it is not debounced
					// here we update the variation now as they are debuonced

					await utils.process([{
						id: 10,
						name: 'info_first',
						type: 'variable',
						regular_price: '25.00',
						manage_stock: true,
						stock_quantity: 10,
						variations: [{
							id: 101,
							name: 'info_first',
							type: 'variable',
							// notice the price change to create a new variation
							regular_price: '1.00',
							// notice the stock passed
							manage_stock: true,
							stock_quantity: 11,
							attributes: [{name: 'a', option: '1'}],
						}, {
							id: 102,
							name: 'info_first',
							type: 'variable',
							// notice the price change to create a new variation
							regular_price: '2.00',
							// notice the stock passed
							manage_stock: true,
							stock_quantity: 22,
							attributes: [{name: 'a', option: '2'}],
						}]
					}]);
	
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'info_first', type: ProductType.product},
							models: ea([
								eo({_deleted: expect.anything(), _totalAmount: 10, variationData: {buyPrice: 0, sellPrice: 2500, variants: []},}),
								eo({_totalAmount: 11, variationData: {buyPrice: 0, sellPrice: 100, variants: [{name: 'a', value: '1'}]},}),
								eo({_totalAmount: 22, variationData: {buyPrice: 0, sellPrice: 200, variants: [{name: 'a', value: '2'}]},}),
							])						
						}),
					]));



				});

			});

			// we ensure that if a product is created by a rest sync
			// then that same product is modifiable
			// just to ensure that another product is not created but the same is used
			describe('allows you to modify a created product', () => {

				it('simple', async () => {
					await utils.process([{
						id: 10,
						name: 'simple',
						type: 'simple',
						regular_price: '25.00',
					}]);
		
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'simple', type: ProductType.product},
							models: [eo({variationData: eo({sellPrice: 2500})})],
						}),
					]));
		
					await utils.process([{
						id: 10,
						name: 'simple_but_not_that_one',
						type: 'simple',
						regular_price: '30.00',
					}]);
		
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'simple_but_not_that_one', type: ProductType.product},
							models: [eo({variationData: eo({sellPrice: 3000})})],
						}),
					]));
				});

				it('variable', async () => {
					await utils.process([{
						id: 10,
						name: 'simple',
						type: 'variable',
						variations: [
							{id: 1, regular_price: '1.00', attributes: [{name: 'h', option: '1'}]},
							{id: 2, regular_price: '2.00', attributes: [{name: 'h', option: '2'}]},
						],
					}]);
		
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'simple', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 100, variants: [{name: 'h', value: '1'}]})}),
								eo({variationData: eo({sellPrice: 200, variants: [{name: 'h', value: '2'}]})}),
							]),
						}),
					]));
		
					await utils.process([{
						id: 10,
						name: 'complexxy?',
						type: 'variable',
						variations: [
							{id: 1, regular_price: '11.00', attributes: [{name: 'h', option: '12'}]},
							{id: 2, regular_price: '21.00', attributes: [{name: 'h', option: '22'}]},
						],
					}]);
		
					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'complexxy?', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 1100, variants: [{name: 'h', value: '12'}]})}),
								eo({variationData: eo({sellPrice: 2100, variants: [{name: 'h', value: '22'}]})}),
							]),
						}),
					]));
				});

			});

			it('updates a simple product', async () => {
				await utils.controller.save([
					{gd: {name: 'hello'}, ms: [{extId: [10], variationData: {sellPrice: 400}}]},
					{gd: {name: 'second_hello'}, ms: [{extId: [16], variationData: {sellPrice: 300}}]},
				]);
				// let pgs = await utils.controller.find();
				// console.log((pgs.reduce((c, _) => (c.push(..._.models), c), [])).map(m => m._metaData._externalIds));

				await utils.process([{
					id: 10,
					name: 'hello_world',
					regular_price: '10.10',
				}, {
					id: 16,
					name: 'second_hello_2',
					regular_price: '30.30',
				}]);

				let pgs = await utils.controller.find();
				
				const models = []; for (const p of pgs) for (const m of p.models) models.push(m);
				expect(models).toEqual(ea([
					eo({
						_metaData: eo({_externalIds: ea(true, [eo({_id: 16})])}),
						groupData: eo({name: 'second_hello_2', type: ProductType.product}),
						variationData: eo({sellPrice: 3030}),
					}),
					eo({
						_metaData: eo({_externalIds: ea(true, [eo({_id: 10})])}),
						groupData: eo({name: 'hello_world', type: ProductType.product}),
						variationData: eo({sellPrice: 1010}),
					}),
				]));
			});

			describe('variables', () => {
				
				it('updates sellprice variable product 1:1', async () => {
					await utils.controller.save([{
						gd: {name: 'sddd'}, ms: [{
							extId: [{id: 10, p: 1}],
							infoData: { barcode: ['yeye'] },
							v: {sellPrice: 15}, vv: [{name: 'size', value: '16'}],
						}, {
							extId: [{id: 15, p: 1}],
							v: {sellPrice: 10}, vv: [{name: 'size', value: '32'}],
						}]
					}, {
						gd: {name: 'abc'}, ms: [{
							extId: [{id: 250, p: 40}],
							infoData: { barcode: ['nono'] },
							v: {sellPrice: 15}, vv: [{name: 'type', value: '1'}, {name: 'color', value: 'blue'}],
						}, {
							extId: [{id: 251, p: 40}],
							infoData: { barcode: ['12', '3'] },
							v: {sellPrice: 10}, vv: [{name: 'type', value: '2'}, {name: 'color', value: 'yellow'}],
						}, { 
							extId: [{id: 252, p: 40}],
							infoData: { barcode: ['12qq', '333'] },
							v: {sellPrice: 101}, vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
						}]
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'sddd', type: ProductType.product},
							models: ea([
								eo({
									infoData: { barcode: ['yeye'] },
									variationData: eo({sellPrice: 15, variants: ea([eo({name: 'size', value: '16'})])})
								}),
								eo({
									variationData: eo({sellPrice: 10, variants: ea([eo({name: 'size', value: '32'})])})
								}),
							]),
						}),
						eo({
							groupData: {name: 'abc', type: ProductType.product},
							models: ea([
								eo({
									infoData: { barcode: ['nono'] },
									variationData: eo({sellPrice: 15, variants: ea([eo({name: 'type', value: '1'}), eo({name: 'color', value: 'blue'})])})
								}),
								eo({
									infoData: { barcode: ['12', '3'] },
									variationData: eo({sellPrice: 10, variants: ea([eo({name: 'type', value: '2'}), eo({name: 'color', value: 'yellow'})])})
								}),
								eo({
									infoData: { barcode: ['12qq', '333'] },
									variationData: eo({sellPrice: 101, variants: ea([eo({name: 'type', value: '3'}), eo({name: 'color', value: 'gray'})])})
								}),
							]),
						}),
					]));

					await utils.process([{
						id: 1,
						name: 'hellso',
						type: 'variable',
						variations: [
							{id: 10, regular_price: '10.10', attributes: [{name: 'size', option: '16'}]},
							{id: 15, regular_price: '10.15', attributes: [{name: 'size', option: '32'}]}
						],
					}, {
						id: 40,
						name: 'zzzz',
						type: 'variable',
						variations: [
							{id: 250, regular_price: '1.00', attributes: [{name: 'type', option: '1'}, {name: 'color', option: 'blue'}]},
							{id: 251, regular_price: '99.10', attributes: [{name: 'type', option: '2'}, {name: 'color', option: 'yellow'}]},
							{id: 252, regular_price: '150.21', attributes: [{name: 'type', option: '3'}, {name: 'color', option: 'gray'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'hellso', type: ProductType.product},
							models: ea([
								eo({
									infoData: { barcode: ['yeye'] },
									variationData: eo({sellPrice: 1010, variants: ea([eo({name: 'size', value: '16'})])})
								}),
								eo({
									variationData: eo({sellPrice: 1015, variants: ea([eo({name: 'size', value: '32'})])})
								}),
							]),
						}),
						eo({
							groupData: {name: 'zzzz', type: ProductType.product},
							models: ea([
								eo({
									infoData: { barcode: ['nono'] },
									variationData: eo({sellPrice: 100, variants: ea([eo({name: 'type', value: '1'}), eo({name: 'color', value: 'blue'})])})
								}),
								eo({
									infoData: { barcode: ['12', '3'] },
									variationData: eo({sellPrice: 9910, variants: ea([eo({name: 'type', value: '2'}), eo({name: 'color', value: 'yellow'})])})
								}),
								eo({
									infoData: { barcode: ['12qq', '333'] },
									variationData: eo({sellPrice: 15021, variants: ea([eo({name: 'type', value: '3'}), eo({name: 'color', value: 'gray'})])})
								}),
							]),
						}),
					]));
		
				});
		
				it('removes a variable', async () => {
					await utils.controller.save([{
						gd: {name: 'abc'}, ms: [{
							extId: [{id: 250, p: 40}],
							v: {buyPrice: 1, sellPrice: 15},
							vv: [{name: 'type', value: '1'}, {name: 'color', value: 'blue'}],
						}, {
							extId: [{id: 251, p: 40}],
							v: {buyPrice: 1, sellPrice: 10},
							vv: [{name: 'type', value: '2'}, {name: 'color', value: 'yellow'}],
						}, { 
							extId: [{id: 252, p: 40}],
							v: {buyPrice: 1, sellPrice: 101},
							vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
						}]
					}]);

					await utils.process([{
						id: 40,
						name: 'zzzz',
						type: 'variable',
						variations: [
							{id: 250, regular_price: '1.00', attributes: [{name: 'type', option: '1'}, {name: 'color', option: 'blue'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({
							groupData: {name: 'zzzz', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 100, variants: ea([eo({name: 'type', value: '1'}), eo({name: 'color', value: 'blue'})])})}),
							]),
						}),
					]));
					
				});

				it('adds a variable', async () => {
					await utils.controller.save([{
						gd: {name: 'sddd'}, ms: [{
							extId: [{id: 10, p: 1}],
							v: {sellPrice: 15}, vv: [{name: 'size', value: '16'}],
						}, {
							extId: [{id: 15, p: 1}],
							v: {sellPrice: 10}, vv: [{name: 'size', value: '32'}],
						}]
					}, {
						gd: {name: 'abc'}, ms: [{
							extId: [{id: 252, p: 40}],
							v: {sellPrice: 101}, vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
						}]
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({groupData: eo({name: 'sddd'})}),
						eo({
							groupData: {name: 'abc', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 101, variants: ea([eo({name: 'type', value: '3'}), eo({name: 'color', value: 'gray'})])})}),
							]),
						}),
					]));

					await utils.process([{
						id: 40,
						name: 'zzzz',
						type: 'variable',
						variations: [
							{id: 250, regular_price: '1.00', attributes: [{name: 'type', option: '1'}, {name: 'color', option: 'blue'}]},
							{id: 251, regular_price: '99.10', attributes: [{name: 'type', option: '2'}, {name: 'color', option: 'yellow'}]},
							{id: 252, regular_price: '150.21', attributes: [{name: 'type', option: '3'}, {name: 'color', option: 'gray'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({groupData: eo({name: 'sddd'})}),
						eo({
							groupData: {name: 'zzzz', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 100, variants: ea([eo({name: 'type', value: '1'}), eo({name: 'color', value: 'blue'})])})}),
								eo({variationData: eo({sellPrice: 9910, variants: ea([eo({name: 'type', value: '2'}), eo({name: 'color', value: 'yellow'})])})}),
								eo({variationData: eo({sellPrice: 15021, variants: ea([eo({name: 'type', value: '3'}), eo({name: 'color', value: 'gray'})])})}),
							]),
						}),
					]));
		
				});

				it('update a variable AND adds/deletes another', async () => {
					await utils.controller.save([{
						gd: {name: 'sddd'}, ms: [{
							extId: [{id: 10, p: 1}],
							v: {sellPrice: 15}, vv: [{name: 'size', value: '16'}],
						}, {
							extId: [{id: 15, p: 1}],
							v: {sellPrice: 10}, vv: [{name: 'size', value: '32'}],
						}]
					}, {
						gd: {name: 'abc'}, ms: [{
							extId: [{id: 252, p: 40}],
							v: {sellPrice: 101}, vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
						}]
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({groupData: eo({name: 'sddd'})}),
						eo({
							groupData: {name: 'abc', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 101, variants: ea([eo({name: 'type', value: '3'}), eo({name: 'color', value: 'gray'})])})}),
							]),
						}),
					]));

					await utils.process([{
						id: 40,
						name: 'zzzz',
						type: 'variable',
						variations: [
							{id: 250, regular_price: '1.00', attributes: [{name: 'type', option: '1'}, {name: 'color', option: 'blue'}]},
							{id: 251, regular_price: '99.10', attributes: [{name: 'type', option: '2'}, {name: 'color', option: 'yellow'}]},
							{id: 252, regular_price: '150.21', attributes: [{name: 'type', option: '3'}, {name: 'color', option: 'gray'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({groupData: eo({name: 'sddd'})}),
						eo({
							groupData: {name: 'zzzz', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 100, variants: ea([eo({name: 'type', value: '1'}), eo({name: 'color', value: 'blue'})])})}),
								eo({variationData: eo({sellPrice: 9910, variants: ea([eo({name: 'type', value: '2'}), eo({name: 'color', value: 'yellow'})])})}),
								eo({variationData: eo({sellPrice: 15021, variants: ea([eo({name: 'type', value: '3'}), eo({name: 'color', value: 'gray'})])})}),
							]),
						}),
					]));

					await utils.process([{
						id: 40,
						name: 'ye',
						type: 'variable',
						variations: [
							{id: 250, regular_price: '2020.20', attributes: [{name: 'type', option: '1'}, {name: 'color', option: 'blue'}]},
						],
					}]);

					expect(await utils.controller.find()).toEqual(ea([
						eo({groupData: eo({name: 'sddd'})}),
						eo({
							groupData: {name: 'ye', type: ProductType.product},
							models: ea([
								eo({variationData: eo({sellPrice: 202020, variants: ea([eo({name: 'type', value: '1'}), eo({name: 'color', value: 'blue'})])})}),
							]),
						}),
					]));
				});

			});

		});
		
		describe('delete', () => {
			
			const fn = (ids: number[], reference: {[id: string]: WooProductSimple}) => {
				return WooSyncProductsService.receiveFromRemote(utils.extConfig, utils.getReqObj(), ids, reference);
			};

			it('deletes the product if the product type switches to an unspupported one', async () => {
				await utils.process([{
					id: 10,
					name: 'simple',
					type: 'simple',
					regular_price: '25.00',
				}]);

				expect(await utils.controller.find()).toEqual(ea([
					eo({
						groupData: {name: 'simple', type: ProductType.product},
						models: [eo({variationData: eo({sellPrice: 2500})})],
					}),
				]));

				await utils.process([{
					id: 10,
					name: 'simple',
					type: 'grouped',
				}]);

				expect(await utils.controller.find()).toEqual([]);
			});

			it('deletes item if not found in the response object or status is trashed', async () => {
				await utils.controller.save([{
					gd: {name: 'hello'}, 
					ms: [{extId: [10], variationData: {sellPrice: 400}}],
				}, {
					gd: {name: 'second_hello'}, 
					ms: [{extId: [16], variationData: {sellPrice: 300}}],
				}, {
					gd: {name: 'abc'}, ms: [{
						extId: [{id: 250, p: 40}],
						v: {buyPrice: 1, sellPrice: 15},
						vv: [{name: 'type', value: '1'}, {name: 'color', value: 'blue'}],
					}, {
						extId: [{id: 251, p: 40}],
						v: {buyPrice: 1, sellPrice: 10},
						vv: [{name: 'type', value: '2'}, {name: 'color', value: 'yellow'}],
					}, { 
						extId: [{id: 252, p: 40}],
						v: {buyPrice: 1, sellPrice: 101},
						vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
					}]
				}]);

				expect(await utils.controller.find()).toEqual(ea([
					eo({groupData: eo({name: 'hello'})}),
					eo({groupData: eo({name: 'second_hello'})}),
					eo({groupData: eo({name: 'abc'})}),
				]));
				
				// update one and delete another
				await fn([10, 16], {[10]: {id: 10, name: 'helloooooooooo', type: 'simple', regular_price: '10.10'}});

				expect(await utils.controller.find()).toEqual(ea([
					eo({groupData: eo({name: 'helloooooooooo'})}),
					eo({groupData: eo({name: 'abc'})}),
				]));

				await fn([40], {[40]: {id: 40, type: 'variable', status: 'trash'}});
				expect(await utils.controller.find()).toEqual(ea([
					eo({groupData: eo({name: 'helloooooooooo'})}),
				]));
			});

		});

		describe('restore', () => {

			it('restores the trashed items ensuring that there is no conflict in barcodes', async () => {
				// here we create a deleted item that uses a specified barcode
				await utils.controller.save([{
					gd: {name: 'second_hello'},
					ms: [{extId: [16], infoData: {barcode: ['1']}, variationData: {buyPrice: 10101010, sellPrice: 300}}],
				}]);
				await utils.controller.delete({}, {deleteMulti: true});

				// and here we create another item that uses the barcode specified above
				await utils.controller.save([{
					gd: {name: 'hello'}, 
					ms: [{extId: [10], infoData: {barcode: ['1']}, variationData: {buyPrice: 10101010, sellPrice: 400}}],
				}, {
					gd: {name: 'abc'}, ms: [{
						extId: [{id: 250, p: 40}],
						v: {buyPrice: 1, sellPrice: 15},
						vv: [{name: 'type', value: '1'}, {name: 'color', value: 'blue'}],
					}, {
						extId: [{id: 252, p: 40}],
						v: {buyPrice: 1, sellPrice: 101},
						vv: [{name: 'type', value: '3'}, {name: 'color', value: 'gray'}],
					}]
				}]);
				
				await utils.controller.delete({}, {deleteMulti: true});
				expect(await utils.controller.find()).toEqual([]);
				expect(await utils.controller.find({}, {skipFilterControl: true})).toHaveLength(3);
				expect(await utils.controller.find({_groupDeleted: {$exists: true}}, {skipFilterControl: true})).toHaveLength(3);
				
				// as we delted every object there will be no problem in restoring the first item with the barcode
				await utils.process([
					{id: 10, name: 'oh yeah', type: 'simple', regular_price: '19.99'},
				]);
				expect(await utils.controller.find()).toEqual([eo({groupData: eo({name: 'oh yeah'})})]);
				expect(await utils.controller.find({}, {skipFilterControl: true})).toHaveLength(3);
				expect(await utils.controller.find({_groupDeleted: {$exists: true}}, {skipFilterControl: true})).toHaveLength(2);

				// now that the first item has been restored, if we restore this one that has a conflicting barcode,
				// it should not error, as the barcode should be deleted
				await utils.process([
					{id: 16, name: 'oh no', type: 'simple', regular_price: '20.20'},
				]);
				expect(await utils.controller.find()).toEqual(ea([
					eo({groupData: eo({name: 'oh yeah'})}),
					eo({groupData: eo({name: 'oh no'})}),
				]));
				expect(await utils.controller.find({}, {skipFilterControl: true})).toHaveLength(3);
				expect(await utils.controller.find({_groupDeleted: {$exists: true}}, {skipFilterControl: true})).toHaveLength(1);

			});

		});

	});

	describe('from LOCAL to REMOTE', () => {

		it.todo('stock_amount is not the _totalAmount but the _amountData[location_id_of_connection]');

		it.todo('doesnt create a new remote product when changing a simple product variationData');

		describe('translates the item correctly', () => {
			
			const fn = utils.processForRemote;

			it('converts simple and variable with correct metadata', async () => {

				const metaPrefix = getMetaDataPrefix(tt.testSlug);
				
				const res = await fn([{
					gd: {name: "simple"},
					ms: [{variationData: {sellPrice: 100}}],
				}, {
					gd: {name: "variable"},
					ms: [
						{variationData: {sellPrice: 500}, vv: [{name: 'size', value: '1'}, {name: 'color', value: 'blu'}]},
						{variationData: {sellPrice: 120}, vv: [{name: 'size', value: '2'}, {name: 'color', value: 'red'}]},
						{variationData: {sellPrice: 1100}, vv: [{name: 'size', value: '3'}, {name: 'color', value: 'yel'}]},
					],
				}]);
				
				const saved = await utils.controller.find();
				const simple = saved.find(s => s.models.length === 1);
				const variable = saved.find(s => s.models.length !== 1);
				const ids = {
					simple: {gid: simple._trackableGroupId, pid: simple.models[0]._id.toString()},
					variable: {gid: variable._trackableGroupId, pids: variable.models.map(m => m._id.toString())},
				}

				expect(res).toEqual(ea([ 
					eo({
						name: 'simple',
						status: 'publish',
						type: 'simple',
						regular_price: '1.00',
						manage_stock: true,
						stock_quantity: 0,
						stock_status: 'outofstock',
						meta_data: ea([
							{key: metaPrefix + 'product_group_id', value: ids.simple.gid},
							{key: metaPrefix + 'product_id', value: ids.simple.pid.toString()},
						]),
					}),
					eo({
						name: 'variable',
						status: 'publish',
						type: 'variable',
						attributes: [{
							name: 'size',
							options: ea(['1', '2', '3']),
						}, {
							name: 'color',
							options: ea(['blu', 'red', 'yel'])
						}],
						variations: ea([
							eo({
								regular_price: '5.00', 
								attributes: ea([{name: 'size', option: '1'}, {name: 'color', option: 'blu'}]),
								meta_data: ea([{key: metaPrefix + 'product_group_id', value: ids.variable.gid}, {key: metaPrefix + 'product_id', value: ids.variable.pids[0].toString()}]),
								manage_stock: true, 
								stock_quantity: 0, 
								stock_status: 'outofstock',
							}),
							eo({
								regular_price: '1.20', 
								attributes: ea([{name: 'size', option: '2'}, {name: 'color', option: 'red'}]),
								meta_data: ea([{key: metaPrefix + 'product_group_id', value: ids.variable.gid}, {key: metaPrefix + 'product_id', value: ids.variable.pids[1].toString()}]),
								manage_stock: true, 
								stock_quantity: 0, 
								stock_status: 'outofstock',
							}),
							eo({
								regular_price: '11.00', 
								attributes: ea([{name: 'size', option: '3'}, {name: 'color', option: 'yel'}]),
								meta_data: ea([{key: metaPrefix + 'product_group_id', value: ids.variable.gid}, {key: metaPrefix + 'product_id', value: ids.variable.pids[2].toString()}]),
								manage_stock: true, 
								stock_quantity: 0, 
								stock_status: 'outofstock',
							}),
						]),
						meta_data: ea([
							{key: metaPrefix + 'product_group_id', value: ids.variable.gid},
						]),
					}),
				]))
			});

			// just some edgecases
			// because we can have "errors" where there are multiple models withouth variants
			// and a single productGroup with 1 model and variants
			it('creates a variable type if a model has variants and creates a simple product with most _totalAmount from array', async () => {

				expect(await fn([
					{
						// edge case where multple variations but no variants
						// we take the first element that has most amount only
						gd: {name: "prodocto"},
						ms: [
							{variationData: {sellPrice: 100}},
							{variationData: {sellPrice: 400}, _totalAmount: 20},
							{variationData: {sellPrice: 700}, _totalAmount: 10},
						]
					},
					{
						gd: {name: "variable 1 model"},
						ms: [
							{variationData: {sellPrice: 100}, vv: ['1', '4']},
						]
					},
				])).toEqual(ea([
					eo({
						type: 'simple',
						name: 'prodocto',
						stock_quantity: 20,
					}),
					eo({
						name:'variable 1 model',
						type: 'variable',
						attributes: ea([eo({options: ['1']}), eo({options: ['4']})]),
						variations: ea([
							eo({regular_price: '1.00', attributes: ea([eo({option: '1'}), eo({option: '4'})])}),
						])
					}),
				]));

			});

			it('filters away the _deleted products EVEN with amount left', async () => {
				
				expect(await fn([{
					gd: {name: "prodocto"},
					ms: [
						{variationData: {sellPrice: 100}, _totalAmount: 10, _deleted: {} as any},
						{variationData: {sellPrice: 200}},
						{variationData: {sellPrice: 50}, _totalAmount: 200, _deleted: {} as any},
					]
				}])).toEqual([
					eo({
						type: 'simple',
						regular_price: '2.00',
						stock_quantity: 0,
					})
				]);

				// ensure that the actual amounts have been saved in db
				expect(await utils.controller.find()).toEqual([
					eo({
						models: ea([
							eo({variationData: eo({sellPrice: 100}), _totalAmount: 10, _deleted: eo({})}),
							eo({variationData: eo({sellPrice: 200}), _totalAmount: 0}),
							eo({variationData: eo({sellPrice: 50}), _totalAmount: 200, _deleted: eo({})}),
						])
					})
				])
			});

			it('re-adds remote object id if present in _metadata', async () => {
				expect(await fn([{
						gd: {name: "prodocto"},
						ms: [
							{variationData: {sellPrice: 100}, extId: [10]},
						]
					}, {
						gd: {name: "variable"},
						ms: [
							{variationData: {sellPrice: 100}, vv: ['5'], extId: [{id: 110, p: 40}]},
							{variationData: {sellPrice: 200}, vv: ['4'], extId: [{id: 200, p: 40}]},
						]
				}])).toEqual(ea([
					eo({
						id: 10,
						name: 'prodocto',
					}),
					eo({
						id: 40,
						name: 'variable',
						variations: ea([
							eo({regular_price: '1.00', id: 110}),
							eo({regular_price: '2.00', id: 200}),
						])
					})
				]));
			});

			describe('multiple endpoints', () => {

				it('ignores products not enabled for a specified cnnection', async () => {

					let res: any = await fn([{
						
					}], [{_id: '1', locationId: '1'}, {_id: '2', locationId: '2'}])
					expect(res).toHaveLength(2);

					res = await fn([{
						externalSync: {disabled: [{id: '2'}]}
					}], [{_id: '1', locationId: '1'}, {_id: '2', locationId: '2'}])
					expect(res).toHaveLength(1);
					expect(res[0].ec._id).toBe('1');
				});

				it('they are equal withouth metadata', async () => {
					const res: any = await fn([{}], [{_id: '1', locationId: '1'}, {_id: '2', locationId: '2'}]);
					expect(res[0].remote).toEqual(res[1].remote);
				});

				it('uses correct remote ids if present', async () => {
					const res = await fn([{
						gd: {name: "prodocto"},
						ms: [
							{variationData: {sellPrice: 100}, extId: [{id: 10, ext: '1'}]},
						]
					}, {
						gd: {name: "variable"},
						ms: [
							{variationData: {sellPrice: 100}, vv: ['5'], extId: [{id: 110, p: 40, ext: '2'}]},
							{variationData: {sellPrice: 200}, vv: ['4']},
						]
					}], [{_id: '1', locationId: '1'}, {_id: '2', locationId: '2'}]);

					const first: WooProductSimple[] = (res as any).find(r => r.ec._id === '1').remote;
					const second: WooProductSimple[] = (res as any).find(r => r.ec._id === '2').remote;
					
					expect(first.find(p => p.name === 'prodocto').id).toBe(10);
					expect(second.find(p => p.name === 'prodocto').id).toBe(undefined);

					expect(first.find(p => p.name === 'variable').id).toBe(undefined);
					expect(second.find(p => p.name === 'variable').id).toBe(40);

					expect(first.find(p => p.name === 'variable').variations.find(v => v.regular_price === '1.00').id).toBe(undefined);
					expect(second.find(p => p.name === 'variable').variations.find(v => v.regular_price === '1.00').id).toBe(110);

					expect(first.find(p => p.name === 'variable').variations.find(v => v.regular_price === '2.00').id).toBe(undefined);
					expect(second.find(p => p.name === 'variable').variations.find(v => v.regular_price === '2.00').id).toBe(undefined);
				});

				describe('omittin origin urls', () => {
					
					it('skips generating bulk op if we say to omit the originUrl', async () => {

						const generate = async (omit: boolean) => {
							const res = await fn(
								[{
									gd: {name: "prodocto"},
									ms: [
										{variationData: {sellPrice: 100}, extId: [{id: 10, ext: '1'}]},
									]
								}, {
									gd: {name: "variable"},
									ms: [
										{variationData: {sellPrice: 100}, vv: ['5'], extId: [{id: 110, p: 40, ext: '2'}]},
										{variationData: {sellPrice: 200}, vv: ['4']},
									]
								}], 
								[{_id: '1', locationId: '1', originUrl: 'aaaaaaaaa'}, {_id: '2', locationId: '2', originUrl: 'hello'}],
								(ms) => {
									const toR: AddedIdInfo = {};
									for (const m of ms) {
										toR[m._id.toString()] = {addedMs: 0};
										if (omit && m.groupData.name === 'prodocto') {
											toR[m._id.toString()] = {omitOriginUrls: ['hello'], addedMs: 1};
										}
									}
									return toR;
								}
							);
							return res;
						}

						let res: any[] = await generate(false);
						expect(res.find(r => r.ec._id === '1').remote).toHaveLength(2);
						expect(res.find(r => r.ec._id === '2').remote).toHaveLength(2);
						
						
						res = await generate(true);
						// expect for prodocto to not be present
						expect(res.find(r => r.ec._id === '1').remote).toHaveLength(2);
						expect(res.find(r => r.ec._id === '2').remote).toHaveLength(1);
						expect(res).toEqual(ea([
							eo({}),
							eo({
								ec: eo({_id: '2'}),
								remote: ea([
									eo({name: 'variable'}),
								])
							})
						]))

					});

					// as the crud notifiaction contains the _id and not the _trackableGroupId
					// we need to use the latest added model _id to check if we should ignore the whole _trackableGroupId for that originUrl
					it('skips the latest origin url by taking the last addedMs of a modified model of a group', async () => {
						const res: any[] = await fn(
							[{
								gd: {name: "prodocto"},
								ms: [
									{variationData: {sellPrice: 100}, extId: [{id: 10, ext: '1'}]},
								]
							}, {
								gd: {name: "variable"},
								ms: [
									{variationData: {sellPrice: 100}, vv: ['5'], extId: [{id: 110, p: 40, ext: '2'}]},
									{variationData: {sellPrice: 200}, vv: ['4']},
								]
							}], 
							[{_id: '1', locationId: '1', originUrl: 'asd'}, {_id: '2', locationId: '2', originUrl: 'hello'}],
							(ms) => {
								const toR: AddedIdInfo = {};
								let i = 0;
								for (const m of ms) {
									toR[m._id.toString()] = {addedMs: 0};
									if (m.groupData.name === 'variable') {
										toR[m._id.toString()] = i++ === 0 ? {omitOriginUrls: ['hello'], addedMs: 1} : {omitOriginUrls: ['asd'], addedMs: 2};
									}
								}
								return toR;
							}
						);

						// expect variable not to be present only on the first location
						// as the last addedMs is associated to the second originUrl
						expect(res.find(r => r.ec._id === '2').remote).toHaveLength(2);
						expect(res.find(r => r.ec._id === '1').remote).toHaveLength(1);
						expect(res).toEqual(ea([
							eo({
								ec: eo({_id: '2'}),
								remote: ea([
									eo({name: 'prodocto'}),
									eo({name: 'variable'}),
								])
							}),
							eo({
								ec: eo({_id: '1'}),
								remote: ea([
									eo({name: 'prodocto'}),
								])
							})
						]))

					});


				});

			});

		});

		describe('sending data to endpoint', () => {

			const fn = async (responseObject: {[localId: string]: {pid: number, gid?: number}}) => {

				const prods = await utils.controller.controller.getCollToUse(utils.getReqObj())
					.find({_id: {$in: Object.keys(responseObject).map(p => new ObjectId(p))}}).toArray();
				const idToGIdHm: {[pid: string]: string} = {};
				for (const p of prods) {
					idToGIdHm[p._id.toString()] = p._trackableGroupId;
				}

				// create response object
				const retObj: WooSavedProductResponse['items'] = {};
				const ad: AddedIdInfo = {};
				for (const localId in responseObject) {

					ad[localId] = {addedMs: 1, omitOriginUrls: []};

					const v = responseObject[localId];
					if (!v) 
						continue;
					// variants
					if (v.gid) {
						if (!retObj[v.gid]) {
							retObj[v.gid] = { variations: {}, meta_data: [{
								key: getMetaDataPrefix(tt.testSlug) + 'product_group_id',
								value: idToGIdHm[localId],
							}] };
						}
						retObj[v.gid].variations[v.pid] = {meta_data: [{
							key: getMetaDataPrefix(tt.testSlug) + 'product_group_id',
							value: idToGIdHm[localId],
						}, {
							key: getMetaDataPrefix(tt.testSlug) + 'product_id',
							value: localId,
						}]}
					}
					// simple
					else {
						retObj[v.pid] = {meta_data: [{
							key: getMetaDataPrefix(tt.testSlug) + 'product_group_id',
							value: idToGIdHm[localId],
						}, {
							key: getMetaDataPrefix(tt.testSlug) + 'product_id',
							value: localId,
						}]}
					}
				}

				// call
				utils.setHttpRequestReutnr({data: {items: retObj}});
				
				const gids = prods.map(p => p._trackableGroupId);

				const itesToPass = (await utils.controller.find({_id: {$in: gids}}));
				const remote = await utils.service['buildWooProducts']([utils.extConfig], utils.getReqObj(), tt.testSlug, ad, prods)
				const bulk = await utils.service['sendWooProducts'](tt.testSlug, {ec: utils.extConfig, local: itesToPass, remote: remote[0].remote});
				bulk.results && bulk.results.length && await new ProductTypeController().getCollToUse(utils.getReqObj()).bulkWrite(bulk.results);
				return remote;
			}

			it('adds the _metaData on product creationg', async () => {
				await utils.controller.save([
					{ms: [
						{_id: '6001e7959923a4cfb7e81062'},
						{_id: '6001e7959923a4cfb7e81061'},
						{_id: '6001e7959923a4cfb7e81060'},
					]}, {ms: [
						{_id: '6001e7959923a4cfb7e81065'},
					]}
				]);
				// expect metaData to be empty
				for (const p of await utils.controller.find())
					for (const m of p.models)
						expect(m._metaData).toBe(undefined);
				
				await fn({
					['6001e7959923a4cfb7e81062']: {pid: 12, gid: 1},
					['6001e7959923a4cfb7e81061']: {pid: 13, gid: 1},
					['6001e7959923a4cfb7e81060']: {pid: 11, gid: 1},
					
					['6001e7959923a4cfb7e81065']: {pid: 19},
				});
				expect(await utils.controller.find()).toEqual(ea([
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81065'), _metaData: eo({_externalIds: [{_id: 19, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 19}}]})}),
					])}),
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81062'), _metaData: eo({_externalIds: [{_id: 12, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81061'), _metaData: eo({_externalIds: [{_id: 13, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81060'), _metaData: eo({_externalIds: [{_id: 11, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
					])}),
				]));
			});

			// we keep it so when the user moves remaining stock to an active product, we have a remoteId ref on that remaining product
			// that refers to a remote product so we can correctly send the decrease stock
			it('keeps _metaData on product delete', async () => {
				await utils.controller.save([
					{ms: [
						{_id: '6001e7959923a4cfb7e81062'},
						{_id: '6001e7959923a4cfb7e81061'},
						{_id: '6001e7959923a4cfb7e81060'},
					]}, {ms: [
						{_id: '6001e7959923a4cfb7e81065'},
					]}
				]);
				// expect metaData to be empty
				for (const p of await utils.controller.find())
					for (const m of p.models)
						expect(m._metaData).toBe(undefined);
				
				await fn({
					['6001e7959923a4cfb7e81062']: {pid: 12, gid: 1},
					['6001e7959923a4cfb7e81061']: {pid: 13, gid: 1},
					['6001e7959923a4cfb7e81060']: {pid: 11, gid: 1},
					
					['6001e7959923a4cfb7e81065']: {pid: 19},
				});
				expect(await utils.controller.find()).toEqual(ea([
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81065'), _metaData: eo({_externalIds: [{_id: 19, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 19}}]})}),
					])}),
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81062'), _metaData: eo({_externalIds: [{_id: 12, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81061'), _metaData: eo({_externalIds: [{_id: 13, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81060'), _metaData: eo({_externalIds: [{_id: 11, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
					])}),
				]));


				// delete it
				await fn({
					['6001e7959923a4cfb7e81062']: undefined,
					['6001e7959923a4cfb7e81061']: undefined,
					['6001e7959923a4cfb7e81060']: undefined,
					['6001e7959923a4cfb7e81065']: undefined,
				});

				// expect for the meta data to still be there
				expect(await utils.controller.find()).toEqual(ea([
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81065'), _metaData: eo({_externalIds: [{_id: 19, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 19}}]})}),
					])}),
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81062'), _metaData: eo({_externalIds: [{_id: 12, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81061'), _metaData: eo({_externalIds: [{_id: 13, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81060'), _metaData: eo({_externalIds: [{_id: 11, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
					])}),
				]));

			});

			it('updates the metadata if partially correct', async () => {
				await utils.controller.save([
					{ms: [
						{_id: '6001e7959923a4cfb7e81062', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: utils.extConfig._id}]}},
						{_id: '6001e7959923a4cfb7e81061', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: utils.extConfig._id}]}},
						{_id: '6001e7959923a4cfb7e81060', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: utils.extConfig._id}]}},
					]}, {ms: [
						{_id: '6001e7959923a4cfb7e81065'},
					]}
				]);
			
				await fn({
					['6001e7959923a4cfb7e81062']: {pid: 12, gid: 1},
					['6001e7959923a4cfb7e81061']: {pid: 13, gid: 1},
					['6001e7959923a4cfb7e81060']: {pid: 11, gid: 1},
					
					['6001e7959923a4cfb7e81065']: {pid: 19},
				});
				// expect(await utils.controller.find()).toEqual(ea([eo({models: ea([eo({}), eo({}), eo({})])}), eo({})]));
				expect(await utils.controller.find()).toEqual(ea([
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81065'), _metaData: eo({_externalIds: [{_id: 19, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 19}}]})}),
					])}),
					eo({models: ea([
						eo({_id: new ObjectId('6001e7959923a4cfb7e81062'), _metaData: eo({_externalIds: [{_id: 12, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81061'), _metaData: eo({_externalIds: [{_id: 13, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
						eo({_id: new ObjectId('6001e7959923a4cfb7e81060'), _metaData: eo({_externalIds: [{_id: 11, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 1}}]})}),
					])}),
				]));
			});

			it.skip('doesnt call bulkwrite if there is nothign to change', async () => {
				let bulkCalled = 0;
				const TORESTORE = CrudCollection.overrideColl;
				CrudCollection.overrideColl = (coll) => {
					const bulkOld: any = coll.bulkWrite.bind(coll);
					coll.bulkWrite = (...args) => { bulkCalled++; return bulkOld(...args); };
					return coll;
				}

				await utils.controller.save([
					{ms: [
						{_id: '6001e7959923a4cfb7e81062', _metaData: {_externalIds: [{_id: 1, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 10}}]}},
						{_id: '6001e7959923a4cfb7e81063', _metaData: {_externalIds: [{_id: 2, _externalConnectionId: utils.extConfig._id, _additional: {_wooProductGroupId: 10}}]}},
					]}, 
					{ms: [
						{_id: '6001e7959923a4cfb7e81000'},
					]}, 
				]);
				await fn({
					['6001e7959923a4cfb7e81062']: {pid: 1, gid: 10},
					['6001e7959923a4cfb7e81063']: {pid: 2, gid: 10},
				});
				expect(bulkCalled).toBe(0);
				await fn({
					['6001e7959923a4cfb7e81062']: {pid: 1, gid: 10},
					['6001e7959923a4cfb7e81063']: {pid: 20, gid: 10},
				});
				expect(bulkCalled).toBe(1);
				await fn({
					['6001e7959923a4cfb7e81000']: {pid: 1},
				});
				expect(bulkCalled).toBe(2);
				
				// resotre
				CrudCollection.overrideColl = TORESTORE;
			});

			describe('images', () => {
				
				it('sends images in another request as to not get a 504', async () => {
					await utils.controller.save([
						{_id: '613fd801e3f8c28698265155', ms: [
							{_id: '6001e7959923a4cfb7e81062', vv: ['a'],  infoData: {images: [{name: 'asd', url: 'singlevar'}]}},
							{_id: '6001e7959923a4cfb7e81061', vv: ['b'], },
							{_id: '6001e7959923a4cfb7e81060', vv: ['c'], },
						]}, {_id: '613fd801e3f8c28698265156', ms: [
							{_id: '6001e7959923a4cfb7e81065', infoData: {images: [{name: 'asd', url: 'grouped'}]}},
						]}
					]);
					
					const mock = jest.spyOn(WooSyncProductsService, 'sendImagesToProduct' as any);
					const httpMock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
	
					const builtInfo = await fn({
						['6001e7959923a4cfb7e81062']: {pid: 12, gid: 1},
						['6001e7959923a4cfb7e81061']: {pid: 13, gid: 1},
						['6001e7959923a4cfb7e81060']: {pid: 11, gid: 1},
						
						['6001e7959923a4cfb7e81065']: {pid: 19, gid: 19},
					});
	
					// expect for the remote object to have all the images deleted
					// and also deleted in the object sent to remote
					for (const arrs of [httpMock.mock.calls[0][3].items, builtInfo[0].remote]) {
						for (const g of arrs) {
							expect(g.images).toBe(undefined);
							for (const v of g.variations || []) 
								expect(v.images).toBe(undefined);
						}
					}
					
	
					expect(mock).toHaveBeenLastCalledWith(
						utils.extConfig, 
						// built data
						{
							"613fd801e3f8c28698265155": {
								images: [{"name": "asd", "src": "singlevar"}], 
								variations: {"6001e7959923a4cfb7e81062": {images: [{"name": "asd", "src": "singlevar"}]}}
							}, 
							"613fd801e3f8c28698265156": {
								images: [{"name": "asd", "src": "grouped"}], 
								variations: {}
							}
						},
						// response data data
						{
							"613fd801e3f8c28698265155": {
								"6001e7959923a4cfb7e81060": {"gid": 1, "pid": 11}, 
								"6001e7959923a4cfb7e81061": {"gid": 1, "pid": 13}, 
								"6001e7959923a4cfb7e81062": {"gid": 1, "pid": 12}
							}, 
							"613fd801e3f8c28698265156": {
								"6001e7959923a4cfb7e81065": {"gid": 19, "pid": 19}
							} 
						}
					);
	
					// wait for the promises to catch up
					await tt.wait(100);
	
					// // expect the http calls to back end
					expect(httpMock).toHaveBeenCalledWith(utils.extConfig, "PUT", "/wp-json/sxmpes/woo/products", {items: [{id: 19, images: [{"name": "asd", "src": "grouped"  }]}]});
					expect(httpMock).toHaveBeenCalledWith(utils.extConfig, "PUT", "/wp-json/sxmpes/woo/products", {items: [{id: 1,  images: [{"name": "asd", "src": "singlevar"}]}]});
					expect(httpMock).toHaveBeenCalledWith(utils.extConfig, "PUT", "/wp-json/sxmpes/woo/products", {items: [{id: 12, images: [{"name": "asd", "src": "singlevar"}]}]});

					mock.mockRestore();
					httpMock.mockRestore();
				});

				it('sends images in order one by one', async () => {
					await utils.controller.save([
						{_id: '613fd801e3f8c28698265155', ms: [
							{_id: '6001e7959923a4cfb7e81062', vv: ['a'], infoData: {images: [{name: 'asd', url: 'singlevar1'}]}},
							{_id: '6001e7959923a4cfb7e81061', vv: ['b'], infoData: {images: [{name: 'asd', url: 'singlevar2'}]}},
							{_id: '6001e7959923a4cfb7e81060', vv: ['c'], infoData: {images: [{name: 'asd', url: 'singlevar3'}]}},
						]}, {_id: '613fd801e3f8c28698265156', ms: [
							{_id: '6001e7959923a4cfb7e81065', infoData: {images: [{name: 'asd', url: 'grouped'}]}},
						]}
					]);
					
					const calls = [];
					const old = ExternalSyncUtils.requestToWoo;
					const httpMock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
					httpMock.mockImplementation(async (...args) => {
						if (args[1] === 'POST')
							return old(...args);

						calls.push(new Date().getTime());
						await tt.wait(200);
						return {} as any;
					});

					await fn({
						['6001e7959923a4cfb7e81062']: {pid: 12, gid: 1},
						['6001e7959923a4cfb7e81061']: {pid: 13, gid: 1},
						['6001e7959923a4cfb7e81060']: {pid: 11, gid: 1},
						['6001e7959923a4cfb7e81065']: {pid: 19, gid: 19},
					});
					
					await tt.wait(200 * 6);

					// ensure the difference is ~200 ms in order
					for (let i = 0; i < calls.length; i++)
						if (calls[i + 1])
							// we account for ~10ms of margin as to handle the calls in between different modelclasses
							if (calls[i + 1] > calls[i] + 220 || calls[i + 1] < calls[i] + 180)
								throw new Error('Difference not between limit');

					httpMock.mockRestore();
				});

				it('calls sync once again after the end if there are some items left', async () => {
					const old = WooSyncProductsService['startImageQueue'];
					const mock = jest.spyOn(WooSyncProductsService, 'startImageQueue' as any);
					const reqMock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');

					// prevent function from throwing to not polluto logs
					mock.mockImplementation(() => new Promise(r => old().then(r).catch(r)))

					//
					// no errror in call
					//

					await WooSyncProductsService['startImageQueue']();
					expect(mock).toHaveBeenCalledTimes(1);
					expect(reqMock).toHaveBeenCalledTimes(0);

					WooSyncProductsService['imagesQueue'] = {
						[utils.extConfig._id]: {
							ext: utils.extConfig,
							items: [{gid: 1, images: [{}]}],
						}
					}
					
					//
					// error on first call
					//

					let called = 0;
					reqMock.mockImplementation(async () => { if (!called++) throw 3; else return {} });

					await WooSyncProductsService['startImageQueue']();
					// called twice as the first time has errored
					await tt.wait(100);
					expect(mock).toHaveBeenCalledTimes(3);
					expect(reqMock).toHaveBeenCalledTimes(2);

					// ensure no other calls are sent
					await tt.wait(500);
					expect(mock).toHaveBeenCalledTimes(3);


					//
					// infinite error (max limit)
					//

					const max = WooSyncProductsService['MAX_IMAGES_QUEUE_RETRY'];

					WooSyncProductsService['imagesQueue'] = {
						[utils.extConfig._id]: {
							ext: utils.extConfig,
							items: [{gid: 1, images: [{}]}],
						}
					}
					reqMock.mockImplementation(async () => { throw 3 });
					
					await WooSyncProductsService['startImageQueue']();

						// ensure no other calls are sent
					await tt.wait(500);
					expect(mock).toHaveBeenCalledTimes(3 + max);

					reqMock.mockRestore();
					mock.mockRestore();
				});

				it.todo('has a sync ongnoing flag to prevent firing multiple fn times');

			});


		});

	});

	describe('mapping', () => {

		describe('creates correct mapping data', () => {

			const fn = (): Promise<NameMappingReturn> => {
				return WooSyncProductsService.createIdAssociatesByNames(tt.testSlug, utils.extConfig, {}) as Promise<NameMappingReturn>;
			};

			it('maps correctly the names, and it does not map two different product to the same element', async () => {
				const mock = jest.spyOn(ExternalSyncUtils, 'requestToWoo');
				mock.mockImplementation(async (e, m, ...args) => {
					if (m === 'GET') return {[WooTypes.product]: [1, 2, 3]};

					return {[WooTypes.product]: {
						[1]: {id: 1, name: '1'},
						[2]: {id: 2, name: '2'},
					}}
				});

				expect(await fn()).toEqual(undefined);
				
				await utils.controller.save([{gd: {name: '5'}}]);
				expect(await fn()).toEqual(undefined);
				
				let noExt = await utils.controller.save([{gd: {name: '2'}}]);
				expect(await fn()).toEqual(tt.eo({
					localRemote: tt.eo({[noExt[0]._trackableGroupId]: 2}),
					remoteLocal: tt.eo({['2']: noExt[0]._trackableGroupId}),
				}));

				// create another equal prod name, but now with the external id present
				let withExt = await utils.controller.save([{gd: {name: '2'}, ms: [{extId: [{id: 321323, p: 2}]}]}]);
				expect(await fn()).toEqual(undefined);
				
				// delete the exteid product and expect for the sync to be ok now
				await utils.controller.delete({_trackableGroupId: withExt[0]._trackableGroupId});
				expect(await fn()).toEqual(tt.eo({
					localRemote: tt.eo({[noExt[0]._trackableGroupId]: 2}),
					remoteLocal: tt.eo({['2']: noExt[0]._trackableGroupId}),
				}));

				mock.mockRestore();
			});

			it.todo('skips local product that have externalSync.disabled');

		});

		describe('forces product ids', () => {

			const build = async (pgs: ProductGroup[], maps?: ItemsBuildOpts['forceProductMapping']) => {
				
				const ids: string[] = [];
				const models: Product[] = [];
				for (const pg of pgs) {
					for (const m of pg.models) {
						models.push(m);
						ids.push(m._id.toString());
					}
				}
				
				const data = ids.reduce((car, i) => (car[i] = {}, car), {});

				const transalted = await utils.service.buildWooProducts([utils.extConfig], utils.getReqObj(), tt.testSlug, data, models, {forceProductMapping: maps});
				return transalted[0].remote;
			}

			it('local -> remote', async () => {

				const saved = await utils.controller.save([{}, {}]);
				expect((await utils.controller.find()).map(i => i.models[0]._metaData)).toEqual(tt.ea([undefined, undefined]));

				await utils.process([{
					id: 10,
					name: 'test',
					regular_price: '12.2',
				}, {
					id: 12, 
					name: 'second',
					regular_price: '10.00',
				}], {
					localRemote: {[saved[0]._trackableGroupId]: 10, [saved[1]._trackableGroupId]: 12},
					remoteLocal: {10: saved[0]._trackableGroupId, 12: saved[1]._trackableGroupId},
				});

				// expect there to be still two items, but now with the modified ids
				expect((await utils.controller.find()).map(i => ({remoteId: i.models[0]._metaData?._externalIds[0]._id, localId: i._trackableGroupId}))).toEqual(tt.ea([
					tt.eo({remoteId: 10, localId: saved[0]._trackableGroupId}),
					tt.eo({remoteId: 12, localId: saved[1]._trackableGroupId}),
				]));

				await utils.process([{
					id: 1250,
					name: 'asdasdasas',
					regular_price: '122.2',
				}, {
					id: 5882, 
					name: 'seco123123nd',
					regular_price: '1110.00',
				}], {
					localRemote: {[saved[0]._trackableGroupId]: 1250, [saved[1]._trackableGroupId]: 5882},
					remoteLocal: {1250: saved[0]._trackableGroupId, 5882: saved[1]._trackableGroupId},
				});

				// expect there to be still two items, but now with the modified ids
				expect((await utils.controller.find()).map(i => ({remoteId: i.models[0]._metaData?._externalIds[0]._id, localId: i._trackableGroupId}))).toEqual(tt.ea([
					tt.eo({remoteId: 1250, localId: saved[0]._trackableGroupId}),
					tt.eo({remoteId: 5882, localId: saved[1]._trackableGroupId}),
				]));

			});

			it('remote -> local', async () => {
				const pgs = await utils.controller.save([{groupData: {name: 'first'}}, {groupData: {name: 'some_other'}}]);

				const built = await build(pgs);
				expect(built).toHaveLength(2);
				expect(built[0].id).toBe(undefined);
				expect(built[1].id).toBe(undefined);

				expect(await build(pgs, {
					localRemote: {[pgs[0]._trackableGroupId]: 10, [pgs[1]._trackableGroupId]: 55},
					remoteLocal: {10: pgs[0]._trackableGroupId, 55: pgs[1]._trackableGroupId},
				}))
				.toEqual(tt.ea([
					tt.eo({id: 10, meta_data: expect.arrayContaining([tt.eo({key: getMetaDataPrefix(tt.testSlug) + 'product_group_id', value: pgs[0]._trackableGroupId})])}),
					tt.eo({id: 55, meta_data: expect.arrayContaining([tt.eo({key: getMetaDataPrefix(tt.testSlug) + 'product_group_id', value: pgs[1]._trackableGroupId})])}),
				]));
				
			});
			

		});

	});

	// just a test to create a prod in remote and then modify it in local
	// and expect remote to be updated
	// and viceversa
	describe('LOCAL/REMOTE REMOTE/LOCAL', () => {

		it.todo('local -> remote -> local');

		it.todo('remote -> local -> remote');

	});

});

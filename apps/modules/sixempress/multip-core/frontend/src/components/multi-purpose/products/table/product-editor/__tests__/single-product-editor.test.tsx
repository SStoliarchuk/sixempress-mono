import { screen, within } from '@testing-library/dom';
import Close from '@material-ui/icons/Close';
import Delete from '@material-ui/icons/Delete';
import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { ProductGroup } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/ProductGroup';
import { FetchableField, LoadingOverlay, ModalService,  ObjectUtils, RequestService } from '@sixempress/main-fe-lib';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import React from 'react';
import { Subject, Observable } from 'rxjs';
import { SingleProductEditor } from '../single/single-product.editor';
import { ProductVariantsTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/productvariants.table';
import { ProductVariant, ProductVarTypes } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/ProductVariant';
import { FormControl } from 'react-reactive-form';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';

// import mock_product_groups from './data.json';
const mock_product_groups = {};

const ProductType = {product: 1};

declare type PartialProduct = Partial<Omit<Product, 'infoData'>> & {v?: Partial<Product['variationData']> & {discount?: number}, vv?: string[], bar?: string[]};
declare type PartialGroup = (Partial<Omit<ProductGroup, 'models'>> & {gd?: ProductGroup['groupData'], ms?: PartialProduct[]}) & {models?: PartialProduct[]};

let lastSaveObj = undefined;
const og = RequestService.client;
RequestService.client = async (method, path, params) => {
	if (method === 'get') {
		return {data: {models: []}} as any;
	}
	else if (method === 'post' || method === 'put') {
		lastSaveObj = params.data;
		return {data: {_id: '0'}} as any;
	}

	return undefined;
};

// mock modalservice for barcodes error
ModalService.open = ((c, p, mp) => mp && mp.onClosed && mp.onClosed({mode: 'automatic'})) as any;
// disable loading overlay
(LoadingOverlay as any).loadingAsync = () => Promise.resolve();
(LoadingOverlay as any).jsxInstance = {updateProcesses: () => {}};

const utils = (() => {

	MultipService.config = {externalConnections: []} as any;
	
	// remove '''''useless''''' warnings
	console.error = ((old) => (...args) => {
		if (typeof args[0] === 'string' && args[0].includes('Warning')) {
			return;
		}
		return old(...args);
	})(console.error);

	// crate the isntance to test
	const ref = { instance: undefined as INST, edit: {}, initialDataSub: new Subject(), };
	class INST extends SingleProductEditor {
		getEditorRelativeItem(id?) {
			return new Observable<any>((obs) => {
				if (id) { obs.next(ref.edit); }
				else { obs.next(); }
			});
		}
		setInitialData() {
			return new Observable<void>(obs => {
				super.setInitialData().subscribe(r => {
					obs.next();
					obs.complete();
					ref.initialDataSub.next((this.props as any)._initialDataSubId);
				})
			});
		}
		constructor(p) { super(p); ref.instance = this; }
	}

	// internal functions
	const _internal = {
		counter: 0,
		getUniqueNumber: () => ++_internal.counter,
		
		partialGroupToFull: (pgs: (Partial<ProductGroup> & PartialGroup)[]) => {
			for (const pg of pgs) {
				pg._id = pg._id || pg._trackableGroupId || '_id';
				pg.groupData = pg.groupData || pg.gd as any;
				pg.models = pg.models || pg.ms as any;
				delete pg.gd;
				delete pg.ms;
	
				pg.groupData = { name: 'name', type: ProductType.product, ...(pg.groupData || {}) };
				pg.models = pg.models || [{} as any];
				pg.documentLocationsFilter = pg.documentLocationsFilter || ['1'];
				
				pg.models = pg.models || [{}] as any;
				for (const p of pg.models) {
					p.infoData = p.infoData || {
						barcode: [Math.random().toString().substr(5)],
					} as any;
	
					const pp =(p as any as PartialGroup['ms'][0]);
					const vv = pp.vv;
					p.variationData = pp.v as any|| p.variationData;
					if (pp.bar) 
						p.infoData.barcode = pp.bar; 
						
					delete pp.bar;
					delete pp.vv;
	
					p.variationData = { 
						sellPrice: _internal.getUniqueNumber(),
						buyPrice: 1,
						variants: vv ? vv.map((v, idx) => ({name: (idx + 1).toString(), value: v})) : [],
						...(p.variationData || {})
					};

					// add dicount
					if (typeof pp.v?.discount === 'number') {
						p.infoData.refSellPrice = p.variationData.sellPrice;
						p.variationData.sellPrice = pp.v.discount;
					}

					delete pp.v;
				}
			}
			return pgs;
		},
		
	}

	// exposed utilities
	return {
		getInstance: () => {
			return ref.instance;
		},
		restoreJsx: () => {
			tc.render(<INST/>);
		},
		openInEditMode: (pg: PartialGroup, opts: {skipPartialToFull?: boolean} = {}) => {
			return new Promise<void>((r, j) => {
				// return the actual moment when the editor is ready
				const subId = Math.random();
				ref.initialDataSub.subscribe(d => {
					if (d === subId) { r(); }
				});

				ref.edit = opts.skipPartialToFull !== true ? _internal.partialGroupToFull([pg as any])[0] : pg;
				tc.render(<INST editorComponentId={pg._id} {...{_initialDataSubId: subId}}/>)
			});
		},
		setFormToMinimumValid: () => {
			utils.restoreJsx();
			tc.getMuiField('Nome Prodotto').type('_name');
			// tc.getMuiField('Visibilita\' elemento').muiSelectMulti([0]);
			utils.getBuyPriceField()[0].type(1);
			utils.getSellPriceField()[0].type(2);
		},
		getFinalSaveElement: () => {
			return new Promise<ProductGroup>((r, j) => {
				utils.getInstance()['send']().subscribe(
					() => {
						r(lastSaveObj);
					}
				);
			});
		},
		getBuyPriceField: () => {
			return Array.from(document.querySelectorAll('table td:nth-child(3) input')).map(e => tc.wrap(e));
		},
		getSellPriceField: () => {
			return Array.from(document.querySelectorAll('table td:nth-child(4) input')).filter((v, i) => i % 2 === 0).map(e => tc.wrap(e));
		},
		getDiscountSellPriceField: () => {
			return Array.from(document.querySelectorAll('table td:nth-child(4) input')).filter((v, i) => i % 2 !== 0).map(e => tc.wrap(e));
		},
		getSupplierField: () => {
			return Array.from(document.querySelectorAll('table td:nth-child(5) input')).map(e => tc.wrap(e));
		},
		setCategory: (model: any) => {
			// we cant use choseAmts as it's not a true amts field
			// tc.getMuiField('Categoria').choseAmts(model);
			tc.getMuiField('Categoria').getReactInstance(11).getProps().onChange(model);
		},
		toggleVariationFieldOvr: (bodyTrIdx: number, fieldName: 'supplier' | 'buyPrice' | 'sellPrice') => {
			// close modal
			tc.focusBody();
			// +1 as the nth-child starts at 1 and idx starts at 0
			tc.wrap(document.querySelector('tbody tr:nth-child(' + (bodyTrIdx + 1) + ') td:last-child button:first-child')).click();
			
			let uiName = '';
			switch (fieldName) {
				case 'buyPrice': uiName = 'Prezzo d\'acquisto'; break;
				case 'sellPrice': uiName = 'Prezzo di vendita'; break;
				case 'supplier': uiName = 'Fornitore'; break;
			}
			tc.wrap(screen.getByText(uiName, {selector: 'li'})).click();
			// close modal
			tc.focusBody();
		},
		toggleVariants: () => {
			tc.wrap(screen.getByText('Varianti')).click();
		},
		toggleManualVariations: () => {
			tc.wrap(screen.getByText('Modalità semplice')).click();
		},
		loadVariantsPreset: (p: ProductVariant['data']) => {
			return new Promise<void>((r, j) => {
				ProductVariantsTable.openSelectModal = (cb) => cb({data: p, name: 'var'}) as any;
				const all = screen.getAllByText('Carica');
				tc.wrap(all[all.length - 1]).click();
				setTimeout(() => r(), 5);
			});
		}
	};
})();

beforeEach(() => {
	lastSaveObj = undefined;
	utils.setFormToMinimumValid();
});

describe('single product editor logic', () => {

	it('doesnt trhow after fetched fields deletion', async () => {
		// ensure that when you click save, the fields like supplier or category doesnt throw error because the 'fetched' field was deleted
		// this is to ensure that the cloned formGroup.value is used
		
		utils.setCategory({_id: '_category_id', name: '_cat_name'});
		tc.getMuiField('Fornitore').choseAmts({_id: '_supplier_id', _progCode: 1, name: '_supp_name'});
		
		// save and verify twice so that we are sure the info has not been altered
		for (let i = 0; i < 2; i++) {
			expect(tc.getMuiField('Categoria').element).toHaveValue('_cat_name');
			// TODO change to 'value.contains' ?
			expect(tc.getMuiField('Fornitore').element).toHaveValue('1 | _supp_name');
			let e = await utils.getFinalSaveElement();
			expect(e.groupData.category.id).toBe('_category_id');
			expect(e.models[0].variationData.supplier.id).toBe('_supplier_id');
		}
	});

	describe('optional discounted price', () => {

		it('adds to single', async () => {
			expect((await utils.getFinalSaveElement()).models[0].infoData.refSellPrice).toBe(undefined);
			expect((await utils.getFinalSaveElement()).models[0].variationData.sellPrice).toBe(200);
			
			utils.getDiscountSellPriceField()[0].type('.5');
			expect((await utils.getFinalSaveElement()).models[0].infoData.refSellPrice).toBe(200);
			expect((await utils.getFinalSaveElement()).models[0].variationData.sellPrice).toBe(50);
		});

		it('adds to variation', async () => {

			await utils.openInEditMode({ms: [
				{vv: ['1'], v: {sellPrice: 200}},
				{vv: ['2'], v: {sellPrice: 200}},
				{vv: ['3'], v: {sellPrice: 200}},
			]});
			const models = async () => (await utils.getFinalSaveElement()).models;
			const refPrice = async () => (await models()).map(m => m.infoData.refSellPrice);
			const sellPrice = async () => (await models()).map(m => m.variationData.sellPrice);

			expect(await refPrice()).toEqual([undefined, undefined, undefined]);
			expect(await sellPrice()).toEqual([200, 200, 200]);
			
			// change to whole group
			utils.getDiscountSellPriceField()[0].type('.5');
			expect(await refPrice()).toEqual([200, 200, 200]);
			expect(await sellPrice()).toEqual([50, 50, 50,]);

			// restore
			utils.getDiscountSellPriceField()[0].clear();
			expect(await refPrice()).toEqual([undefined, undefined, undefined]);
			expect(await sellPrice()).toEqual([200, 200, 200]);


			// change to only 1 model
			utils.toggleVariationFieldOvr(0, 'sellPrice');
			utils.getDiscountSellPriceField()[1].type('.2');
			expect(await refPrice()).toEqual([200, undefined, undefined]);
			expect(await sellPrice()).toEqual([20, 200, 200]);

			// change to anoterh model with diff sellprice
			utils.toggleVariationFieldOvr(2, 'sellPrice');
			utils.getSellPriceField()[2].type('5');
			utils.getDiscountSellPriceField()[2].type('.1');
			expect(await refPrice()).toEqual([200, undefined, 500]);
			expect(await sellPrice()).toEqual([20, 200, 10]);
		});

	});

	it('preserve groupData.type', async () => {
		await utils.openInEditMode({ gd: {name: 'prodi', type: ProductType.replacement} });
		expect((await utils.getFinalSaveElement()).groupData.type).toBe(ProductType.replacement);

		await utils.openInEditMode({ gd: {name: 'prodi', type: ProductType.product} });
		expect((await utils.getFinalSaveElement()).groupData.type).toBe(ProductType.product);
	});

	describe('variants', () => {

		const addVariantsAutoValues = (idx: number, items: string[]) => {
			const field = tc.getAllMuiField('Valori')[idx];
			for (const i of items) { field.type(i).type('{enter}'); }
		};

		const addVariantType = () => {
			tc.wrap(screen.getByText('+ Aggiungi Variante')).click();
		};

		it('keeps the names when switching variants', async () => {
			utils.toggleVariants();
			addVariantType();
			addVariantType();

			tc.getAllMuiField('Tipologia')[0].clear().type('_var_name1');
			tc.getAllMuiField('Tipologia')[1].clear().type('_var_name2');
			tc.getAllMuiField('Tipologia')[2].clear().type('_var_name3');

			utils.toggleManualVariations();
			expect(tc.getAllMuiField('Tipologia')[0].element).toHaveValue('_var_name1');
			expect(tc.getAllMuiField('Tipologia')[1].element).toHaveValue('_var_name2');
			expect(tc.getAllMuiField('Tipologia')[2].element).toHaveValue('_var_name3');
		});

		it('adds an empty variations when enabling manual variants', async () => {
			utils.toggleVariants();
			utils.toggleManualVariations();
			expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
		});

		describe('presets', () => {

			it('replaces current items', async () => {
				utils.toggleVariants();
				addVariantsAutoValues(0, ['a', 'b']);
				tc.getAllMuiField('Tipologia')[0].clear().type('_var_name1');

				let res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['a'], ['b']]);
				expect(res.models.map(m => m.variationData.variants.map(v => v.name))).toEqual([['_var_name1'], ['_var_name1']]);

				// load manual
				await utils.loadVariantsPreset({type: ProductVarTypes.manual, value: ['loadA', 'loadB', 'loadC']});
				tc.getMuiField('loadA').type('1');
				tc.getMuiField('loadB').type('2');
				tc.getMuiField('loadC').type('3');
				res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['1', '2', '3']]);
				expect(res.models.map(m => m.variationData.variants.map(v => v.name))).toEqual([['loadA', 'loadB', 'loadC']]);

				// load automatic
				await utils.loadVariantsPreset({type: ProductVarTypes.automatic, value: [{name: '_a1', values: ['000', '11', '2']}, {name: '_a2', values: ['22']}]});
				// with deleted
				tc.getAllByIcon(Delete, screen.getByRole('table'))[0].click();
				res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['11', '22'], ['2', '22']]);
				expect(res.models.map(m => m.variationData.variants.map(v => v.name))).toEqual([['_a1', '_a2'], ['_a1', '_a2']]);


				// load automatic after a deleted item
				await utils.loadVariantsPreset({type: ProductVarTypes.automatic, value: [{name: '_a1', values: ['000', '11', '2']}, {name: '_a2', values: ['22']}]});
				res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['000', '22'], ['11', '22'], ['2', '22']]);
				expect(res.models.map(m => m.variationData.variants.map(v => v.name))).toEqual([['_a1', '_a2'], ['_a1', '_a2'], ['_a1', '_a2']]);
			});

			it.todo('saves the preset');

		});

		describe('auto', () => {

			it('generates a matrix with the values and names', async () => {
				utils.toggleVariants();
				addVariantsAutoValues(0, ['a', 'b']);
				tc.getAllMuiField('Tipologia')[0].clear().type('_var_name1');

				let res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['a'], ['b']]);
				expect(res.models.map(m => m.variationData.variants.map(v => v.name))).toEqual([['_var_name1'], ['_var_name1']]);

				addVariantType();
				addVariantsAutoValues(1, ['a', 'b']);
				tc.getAllMuiField('Tipologia')[1].clear().type('_var_name2');

				res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['a', 'a'], ['b', 'a'], ['a', 'b'], ['b', 'b']]);
				expect(res.models.map(m => m.variationData.variants.map(v => v.name))).toEqual([['_var_name1', '_var_name2'], ['_var_name1', '_var_name2'], ['_var_name1', '_var_name2'], ['_var_name1', '_var_name2']]);
			});

			it('can delete restore auto variants', async () => {
				utils.toggleVariants();
				addVariantsAutoValues(0, ['a', 'b', 'c']);

				let res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['a'], ['b'], ['c']]);

				// remove 'b'
				tc.getAllByIcon(Delete)[1].click();
				res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['a'], ['c']]);

				// restore 'b'
				tc.wrap(screen.getByText('Annulla')).click();;
				res = await utils.getFinalSaveElement();
				expect(res.models.map(m => m.variationData.variants.map(v => v.value))).toEqual([['b'], ['a'], ['c']]);
			});

		});

	});

	describe('variations', () => {

		const clickSave = () => {
			return new Promise<void>((r, j) => {
				if (!utils.getInstance().state.formGroup.valid) {
					return j('FormGroup State NOT VALID');
				}

				tc.wrap(screen.getAllByText('Salva')[0]).click();
				setTimeout(() => r(), 5);
			});
		}

		describe('baseVariation', () => {
		
			// base variations here are
			// buyPrice: 100, sellPrice: 500,
			// 
			// but a product variation with these values do not exists
			const getPg = (): PartialGroup => ({
				ms: [
					{ v: {buyPrice: 100, sellPrice: 300, variants: [{name: '1', value: '1'}]} },
					{ v: {buyPrice: 100, sellPrice: 400, variants: [{name: '1', value: '2'}]} },
					{ v: {buyPrice: 110, sellPrice: 500, variants: [{name: '1', value: '3'}]} },
					{ v: {buyPrice: 110, sellPrice: 500, variants: [{name: '1', value: '4'}]} },
				],
			});
	
			it('adds discounted price', async () => {

				await utils.openInEditMode({ms: [
					{v: {buyPrice: 100, sellPrice: 200, discount: 300}},
					{v: {buyPrice: 100, sellPrice: 200, discount: 300}},
					{v: {buyPrice: 100, sellPrice: 200, discount: 300}},
				]});

				expect(utils.getBuyPriceField()[0].element).toHaveValue('1.00');
				expect(utils.getSellPriceField()[0].element).toHaveValue('2.00');
				expect(utils.getDiscountSellPriceField()[0].element).toHaveValue('3.00');

				await utils.openInEditMode({ms: [
					{v: {buyPrice: 100, sellPrice: 200, discount: 300}},
					{v: {buyPrice: 100, sellPrice: 200, discount: 200}},
					{v: {buyPrice: 100, sellPrice: 200, discount: 200}},
				]});

				expect(utils.getBuyPriceField()[0].element).toHaveValue('1.00');
				expect(utils.getSellPriceField()[0].element).toHaveValue('2.00');
				expect(utils.getDiscountSellPriceField()[0].element).toHaveValue('2.00');

			});

			it('generates with most used voices in the variations (with variants)', async () => {
				// when we generate the base variation for models with variants, for each variation field we chose the most picked
				
				await utils.openInEditMode(getPg());
				expect(utils.getBuyPriceField()[0].element).toHaveValue('1.00');
				expect(utils.getSellPriceField()[0].element).toHaveValue('5.00');
			});
	
			it('generates with most used voices in the variations (without variants)', async () => {
				// when we generate the base variation for models with variants, for each variation field we chose the most picked
				// and then we need to select a variation that has as much posisible variation in common with the most useed
				//
				// this is because the base variation is treated and saved like a regular model
				
				// remove variants
				const pg = getPg();
				for (const m of pg.ms) { m.v.variants = []; }
	
				await utils.openInEditMode(pg);
				expect(utils.getBuyPriceField()[0].element).toHaveValue('1.00');
				expect(utils.getSellPriceField()[0].element).toHaveValue('3.00');
			});
	

			it('calculates withouth _deleted models', async () => {

				await utils.openInEditMode({ms: [
					{v: {sellPrice: 200}},
					{v: {sellPrice: 200}},

					{v: {sellPrice: 100}, _deleted: {_author: new FetchableField("", ModelClass.Customer), _timestamp: 0}},
					{v: {sellPrice: 100}, _deleted: {_author: new FetchableField("", ModelClass.Customer), _timestamp: 0}},
					{v: {sellPrice: 100}, _deleted: {_author: new FetchableField("", ModelClass.Customer), _timestamp: 0}},
				]});
				expect(utils.getSellPriceField()[0].element).toHaveValue('2.00');
			});

		});

		it('can add variations only when manual variants are enabled', async () => {
			expect(screen.queryByText('+ Aggiungi Variazione')).toBeNull();
			
			utils.toggleVariants();
			expect(screen.queryByText('+ Aggiungi Variazione')).toBeNull();
			
			utils.toggleManualVariations();
			expect(screen.queryByText('+ Aggiungi Variazione')).not.toBeNull();
		});

		it('doesnt save when there are equal variants', async () => {
			await clickSave();
			expect(screen.queryByText('Sono presenti alcune variazioni prodotto uguali', {exact: false})).toBeNull();

			utils.toggleVariants();
			utils.toggleManualVariations();
			tc.getMuiField('Tipologia').clear().type('var1');

			// add same variation values
			tc.wrap(screen.getByText('+ Aggiungi Variazione')).click();
			tc.getAllMuiField('var1').forEach(c => c.type('same_value'));
			await clickSave();
			expect(screen.queryByText('Sono presenti alcune variazioni prodotto uguali', {exact: false})).not.toBeNull();

			// add a change to added variation, to esnsure that to save we need different variant and not only different variation
			utils.toggleVariationFieldOvr(1, 'buyPrice');
			utils.getBuyPriceField()[1].type('200');
			expect(utils.getBuyPriceField()[0].element).not.toHaveValue((utils.getBuyPriceField()[1].element as HTMLInputElement).value);
			await clickSave();
			expect(screen.queryByText('Sono presenti alcune variazioni prodotto uguali', {exact: false})).not.toBeNull();

			// change one variation value
			tc.getAllMuiField('var1')[0].type('_changed')
			await clickSave();
			expect(screen.queryByText('Sono presenti alcune variazioni prodotto uguali', {exact: false})).toBeNull();
		});

	});

	describe('barcode', () => {

		it('adds barcode', async () => {
			let res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([[]]);

			tc.wrap(screen.getAllByText('Automatico')[0]).click();
			tt.scanBarcode('bar01');
			res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([['bar01']]);

			// add variants
			utils.toggleVariants();
			await utils.loadVariantsPreset({type: ProductVarTypes.automatic, value: [{name: '1', values: ['1', '2', '3']}]});
			res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([[], [], []]);

			tc.wrap(screen.getAllByText('Automatico')[1]).click();
			tt.scanBarcode('bar01');
			res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([[], ['bar01'], []]);

			// add multiple
			tc.wrap(screen.getAllByText('Automatico')[1]).click();
			tt.scanBarcode('bar02');
			tc.wrap(screen.getAllByText('Aggiungi +')[1]).click();
			tt.scanBarcode('bar0201');
			tt.scanBarcode('bar0202');
			tt.scanBarcode('bar0203');
			tc.focusBody();
			res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([[], ['bar01'], ['bar02', 'bar0201', 'bar0202', 'bar0203']]);

			// remove all
			tc.getAllByIcon(Close).forEach(c => c.click());
			res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([[], [], []]);

			tc.wrap(screen.getAllByText('Automatico')[1]).click();
			tt.scanBarcode('bar0101');
			res = await utils.getFinalSaveElement();
			expect(res.models.map(m => m.infoData.barcode)).toEqual([[], ['bar0101'], []]);
		});

	});

	it('doesnt edit _deleted models', async () => {
		await utils.openInEditMode({ms: [
			{vv: ['a']},
			{vv: ['a']},
			{vv: ['a'], _deleted: {_author: new FetchableField("", ModelClass.Customer), _timestamp: 0}},
		]});

		expect(document.querySelectorAll('table tbody tr')).toHaveLength(2);
	});

	describe('external sync', () => {

		it.todo('allows you to choose the external connections to sync to');

	});

	// this test is no longer possible as it relied on the presence of variations
	// which now are disabled.
	//
	// thus to reimplement this test we need new mock data.json
	it.skip('opens in edit, and saves withouth modifying anything', async () => {
		// we ensure that there is no weird stuff going on by simply opening/closing a bunch of products

		const fixFetched = (obj) => {
			for (const k in obj) {
				if (obj[k] && typeof obj[k] === 'object') {
					if (obj[k] instanceof FetchableField || (obj[k].id && obj[k].modelClass)) {
						obj[k] = expect.objectContaining(new FetchableField(obj[k].id, obj[k].modelClass));
					} else {
						fixFetched(obj[k]);
					}
				}
			}
		}
		const fixExpected = (pg: ProductGroup) => {
			delete pg.groupData.description;
			delete pg.infoData;
			delete pg._totalAmount;
			delete pg._approximateTotalAmount;
			delete pg.variationData;
			pg.models = pg.models.map(m => {
				const toR: Partial<Product> = {
					variationData: m.variationData,
					infoData: m.infoData,
					_id: m._id,
				}
				return toR as any;
			});
			fixFetched(pg);
		}

		const fixPg = (pg: ProductGroup) => {
			fixFetched(pg);
		}

		// const items = [mock_product_groups.barcode_error_productgroup];
		const items = Object.values(mock_product_groups);
		for (const i of items) {
			await utils.openInEditMode(i as any, {skipPartialToFull: true});
			
			const res = await utils.getFinalSaveElement();
			const clonedExpected = ObjectUtils.cloneDeep(i);
			
			fixPg(res);
			fixExpected(clonedExpected as any)
			expect(res).toEqual(clonedExpected);
		}


	});

});

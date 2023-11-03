import { screen } from '@testing-library/dom';
import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { SaleController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sales/sale.controller';
import { CodeScannerService,GetMultiReponse } from '@sixempress/main-fe-lib';
import React from 'react';
import { FormArray, FormGroup } from 'react-reactive-form';
import { Observable } from 'rxjs';
import { PartialGroup } from 'types/globals';
import { PricedRowsModel as _PricedRowsModel } from '../priced-rows.dtd';
import { PricedRowsEditor } from '../priced-rows.editor';

type PricedRowsModel = _PricedRowsModel<any>


const utils = (() => {
	const addByTableReturn = { services: [] as any, products: [] as any };
	ProductController.prototype.openSelectDt = (t, b, m) => (b as any)(addByTableReturn.products.map(p => p._id));
	ProductController.prototype.getMulti = async (t) => ({data: addByTableReturn.products as Product[], matchCount: addByTableReturn.products.length});

	const _internal = {
		currentInstance: undefined as PricedRowsEditor<any>,
		getClass: (opts: {beObj?: any} = {}) => {
			class TestEditor extends PricedRowsEditor<any> {
				controller = new SaleController();
				constructor(p) {
					super(p);
					_internal.currentInstance = this;
				}
				controllerUrl = '';
				enabledItems = { products: true, services: true, manual: true};
				fieldsToFetch = [];
				getEditorRelativeItem() { return new Observable(o => o.next(opts.beObj)); }
				generateEditorSettings() { return []; }
			}
			return TestEditor;
		}
	}

	const obj = {
		getItemTr: (type: 'products' | 'manual', rowIdx: number, itemIdx: number) => {
			const row = document.body.querySelectorAll('.priced-rows-single-row')[rowIdx];
			const table = row.querySelector('.priced-rows-dt-' + type)
			return table.querySelector('tbody tr:nth-child(' + (itemIdx + 1) + ')');
		},
		remove: async (type: 'products' | 'manual', rowIdx: number, itemIdx: number) => {
			const btn = utils.getItemTr(type, rowIdx, itemIdx).querySelector('td:first-child button');
			tc.wrap(btn).click();
			await tt.wait(1);
		},
		clear: (rowIdx?: number) => {
			const fa = (_internal.currentInstance.state.formGroup.get('list') as FormArray);
			const clear = typeof rowIdx === 'number' ? [fa.at(rowIdx)] : fa.controls;
			for (let i = clear.length - 1; i > -1; i--) {
				const fg = (fa.at(i) as FormGroup)
				fg.removeControl('products');
				fg.removeControl('apps/modules/sixempress/multip-core/frontend/src/services');
				fg.removeControl('manual');
			}
		},
		add: async (type: 'products' | 'manual', rowIdx: number) => {
			let title: string;
			switch (type) {
				case 'products': title = '+ Prodotti'; break;
				case 'manual': title = '+ Manuale'; break;
			}
			screen.getAllByText(title)[rowIdx].click();
			await tt.wait(1);
		},
		addModel: async (type: 'products', rowIdx: number, partials: {_id: string}[], amount?: number) => {
			const models = utils.setProductsSelect([{ms: partials}]);
			await utils.add(type, rowIdx);
			
			// add amount
			if (typeof amount === 'number') {
				const prodIdxs = [];
				for (const m of models) {
					const ps = utils.value.list[rowIdx].products;
					for (let i = 0; i < ps.length; i++) {
						if (ps[i].item.id === m._id) {
							prodIdxs.push(i);
						}
					}
				}

				for (const idx of prodIdxs)
					utils.setModelAmount(type, rowIdx, idx, amount);
			}
		},
		setModelAmount: (type: 'products', rowIdx: number, itemIdx: number, amount: number) => {
			const tr = utils.getItemTr(type, rowIdx, itemIdx);
			const inputs = tr.querySelectorAll('input');
			const input = inputs[inputs.length - 1];
			tc.wrap(input).type(amount, {clear: true});
		},
		setProductsSelect: (ps: PartialGroup | PartialGroup[]): Product[] => {
			const pgs = tt.prodPartialToFull(ps);
			const models: Product[] = [];
			for (const pg of pgs) 
				models.push(...pg.models);
			addByTableReturn.products = models;
			return addByTableReturn.products;
		},
		render: (opts: {beObj?: any} = {}) => {
			const Instance = _internal.getClass(opts);
			return tc.render(<Instance/>);
		},
		isDefaultBarcode: () => {
			return !_internal.currentInstance || CodeScannerService['onScanActions'][0] !== _internal.currentInstance['_onBarcodeScan'];
		},
		addRow: () => {
			tc.wrap(screen.getByText('+ Nuova riga')).click();
		},
		value: undefined as PricedRowsModel,
	};
	
	Object.defineProperty(obj, 'value', {
		get: () => _internal.currentInstance.state.formGroup.value,
	});

	return obj;
})();

beforeAll(() => {
	console.error = () => {};
});

describe('Priced Rows Editor', () => {

	it.todo('shows saved date/user if the item is in db, else only current date');

	it.todo('shows only the permitted props groups');

	describe('barcode', () => {

		it('enables/disables the default events on mount/unmount', () => {
			expect(utils.isDefaultBarcode()).toBe(true);
			const e = utils.render();
			expect(utils.isDefaultBarcode()).toBe(false);
			e.unmount();
			expect(utils.isDefaultBarcode()).toBe(true);
		});

		it('enables/disables the default events on active/deactive listen barcode switch', () => {
			expect(utils.isDefaultBarcode()).toBe(true);
			const e = utils.render();
			expect(utils.isDefaultBarcode()).toBe(false);
			tc.wrap(screen.getByText('Barcode')).click();
			expect(utils.isDefaultBarcode()).toBe(true);
			e.unmount();
			expect(utils.isDefaultBarcode()).toBe(true);
		});

		describe('changes which row listens to barcode', () => {

			it('doesnt activate events, when switching row', () => {
				expect(utils.isDefaultBarcode()).toBe(true);
				const e = utils.render();
				expect(utils.isDefaultBarcode()).toBe(false);

				utils.addRow();
				expect(utils.isDefaultBarcode()).toBe(false);
				tc.wrap(screen.getAllByText('Barcode')[0]).click();
				expect(utils.isDefaultBarcode()).toBe(false);
				tc.wrap(screen.getAllByText('Barcode')[1]).click();
				expect(utils.isDefaultBarcode()).toBe(false);
				
				tc.wrap(screen.getAllByText('Barcode')[0]).click();
				expect(utils.isDefaultBarcode()).toBe(false);
				tc.wrap(screen.getAllByText('Barcode')[0]).click();
				expect(utils.isDefaultBarcode()).toBe(true);
				
				e.unmount();
				expect(utils.isDefaultBarcode()).toBe(true);
			});

		});

		describe('adding products', () => {

			it.todo('adds product and their amounts by barcode scan');

			it.todo('adds to currently enabled barcode row');

			it.todo('adds amount to product already added manualy');

		});

	});

	describe('products/services', () => {

		it('adds/removes', async () => {
			utils.render();
			for (const f of ['products'] as ['products']) {
				utils.clear();

				expect(utils.value.list).toHaveLength(1);
				expect(utils.value.list[0]).toEqual({});
				
				await utils.addModel(f, 0, [{_id: '1'}]);
				expect(utils.value.list).toHaveLength(1);
				expect(utils.value.list[0]).toEqual({[f]: [tt.eo({amount: 1, item: tt.eo({id: '1'})})]});
	
				await utils.remove(f, 0, 0);
				expect(utils.value.list).toHaveLength(1);
				expect(utils.value.list[0]).toEqual({});
	
				await utils.addModel(f, 0, [{_id: '1'}, {_id: '2'}]);
				expect(utils.value.list[0]).toEqual({[f]: [
					tt.eo({amount: 1, item: tt.eo({id: '1'})}),
					tt.eo({amount: 1, item: tt.eo({id: '2'})}),
				]});
	
				await utils.remove(f, 0, 0);
				expect(utils.value.list[0]).toEqual({[f]: [
					tt.eo({amount: 1, item: tt.eo({id: '2'})}),
				]});
				
				await utils.addModel(f, 0, [{_id: '1'}, {_id: '2'}]);
				expect(utils.value.list[0]).toEqual({[f]: [
					tt.eo({amount: 1, item: tt.eo({id: '2'})}),
					tt.eo({amount: 1, item: tt.eo({id: '1'})}),
				]});
				
				await utils.remove(f, 0, 1);
				expect(utils.value.list[0]).toEqual({[f]: [
					tt.eo({amount: 1, item: tt.eo({id: '2'})}),
				]});
	
				await utils.remove(f, 0, 0);
				expect(utils.value.list[0]).toEqual({});
			}
		});

		it('changes amount', async () => {
			utils.render();
			for (const f of ['products'] as ['products']) {
				utils.clear();

				await utils.addModel(f, 0, [{_id: '1'}]);
				expect(utils.value.list[0][f][0].amount).toEqual(1);

				utils.setModelAmount(f, 0, 0, 10);
				expect(utils.value.list[0][f][0].amount).toEqual(10);

				utils.setModelAmount(f, 0, 0, 5);
				expect(utils.value.list[0][f][0].amount).toEqual(5);
			}
		});

	});

	describe('manual', () => {

		it('adds/removes', async () => {
			utils.render();

			expect(utils.value.list).toHaveLength(1);
			expect(utils.value.list[0]).toEqual({});
			
			await utils.add('manual', 0);
			expect(utils.value.list).toHaveLength(1);
			expect(utils.value.list[0]).toEqual({manual: [tt.eo({})]});

			await utils.remove('manual', 0, 0);
			expect(utils.value.list).toHaveLength(1);
			expect(utils.value.list[0]).toEqual({});

			await utils.add('manual', 0);
			await utils.add('manual', 0);
			tc.wrap(utils.getItemTr('manual', 0, 0).querySelector('textarea')).type('hello');
			tc.wrap(utils.getItemTr('manual', 0, 1).querySelector('textarea')).type('h2t');
			expect(utils.value.list[0]).toEqual({manual: [tt.eo({description: 'hello'}), tt.eo({description: 'h2t'})]});

			await utils.remove('manual', 0, 0);
			expect(utils.value.list[0]).toEqual({manual: [tt.eo({description: 'h2t'})]});
			
			await utils.add('manual', 0);
			expect(utils.value.list[0]).toEqual({manual: [tt.eo({description: 'h2t'}), tt.eo({description: undefined})]});
			
			await utils.remove('manual', 0, 1);
			expect(utils.value.list[0]).toEqual({manual: [tt.eo({description: 'h2t'})]});

			await utils.remove('manual', 0, 0);
			expect(utils.value.list[0]).toEqual({});
		});

	});

});

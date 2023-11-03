import { FormGroup, FormArray, FormControl, Validators } from 'react-reactive-form';
import { AbstractEditor, SmallUtils, CodeScannerService, CodeScannerOutput, AbstractEditorState, IBaseModel, ComponentCommunicationService, AbstractEditorProps, LibSmallUtils } from '@sixempress/main-fe-lib';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';
import { PricedRow, PricedRowsModel, PricedRowsModelForm } from './priced-rows.dtd';
import { Observable } from 'rxjs';
import { PricedRowsController } from './priced-rows.controller';
import { ProductGroupController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product-group.controller';
import { productCommunicationObject, productCommunicationServiceKey } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/list/product-amount-list.dtd';

type PREState<T extends PricedRowsModel<any>> = AbstractEditorState<T> & {
	listenBarcodeIdx: number
}

export abstract class PricedRowsEditorLogic<T extends PricedRowsModelForm<any>> extends AbstractEditor<T, {}, PREState<T>> {

	private pgController = new ProductGroupController();

	requirePhysicalLocation = true;

	/**
	 * Which items are enabled to be added to the rows
	 */
	protected enabledItems = {
		products: true,
		manual: true,
	};

	/**
	 * If it can create new product variants
	 */
	canEditVariants = false;

	protected FCLogic = {
		// creates the form array if not present and returns it
		getFA: (rowOrIdx: FormGroup | number, f: 'products' | 'manual'): FormArray => {
			const row = (typeof rowOrIdx === 'number' ? this.getFgListControlObject().at(rowOrIdx) : rowOrIdx) as FormGroup;

			if (!row.get(f))
				row.setControl(f, new FormArray([]));

			return row.get(f) as FormArray;
		},
		// manual row of the list
		manualFG: (m: Partial<PricedRow['manual'][0]> = {}) => {
			return new FormGroup({
				description: new FormControl(m.description, Validators.required),
				sellPrice: this.FCLogic.price(m.sellPrice),
				buyPrice: this.FCLogic.price(m.buyPrice),
			});
		},
		addProductFG: (m: {id: Product, amount?: number}) => {
			const id = typeof m.id === 'string' ? m.id : (m.id as IBaseModel)._id;
			const fetched = typeof m.id === 'object' ? m.id : null;

			return new FormGroup({
				item: new FormControl({id: id, fetched: fetched, modelClass: ModelClass.Product}),
				amount: new FormControl(m.amount || 0, Validators.required),
				newVariation: new FormGroup({
					supplier: new FormControl((fetched as Product).variationData.supplier),
					variants: new FormControl((fetched as Product).variationData.variants),
					sellPrice: this.FCLogic.price(fetched.variationData.sellPrice),
					buyPrice: this.FCLogic.price(fetched.variationData.buyPrice),
				})
			});
		},
		// price field
		price: (val: any, required?: boolean) =>  {
			return required 
				? new FormControl(val, [Validators.pattern(SmallUtils.fullPriceRegex), Validators.required])
				: new FormControl(val, Validators.pattern(SmallUtils.fullPriceRegex));
		},
	}

	// add always a new row
	setInitialData() {
		return new Observable<void>(obs => {
			super.setInitialData().subscribe(
				r => {
					obs.next(r);
					obs.complete();
					this.addRow();

					// add selected products from the products table, legacy mode
					const data: productCommunicationObject = ComponentCommunicationService.getData(productCommunicationServiceKey);
					if (data) {
						const row = this.getFgListControlObject().length - 1;
						this.addProductModelToList(row, data.map(i => ({id: i.productId, setAmount: Object.values(i.amounts || {}).reduce((car, cur) => car += cur, 0)})));
					}
				},
				e => {
					obs.error(e);
				}
			);
		});
	}

	componentWillUnmount() {
		this.setListenBarcode(-1);
	}

	protected getEditorConfiguration(): AbstractEditorProps<T> {
		return {
			...super.getEditorConfiguration(),
			onSaveError: (error: any) => {
				this.onSaveError(error);
			},
		}
	}

	protected onSaveError(error: any) {
		throw error;
	}

	/**
	 * Gets the calculatead total of the list
	 */
	protected getCalculatedTotal(i: T) {
		return PricedRowsController.getTotal(i, 'calculated');
	}

	/**
	 * Adds a new row and sets the barcode listener to it
	 */
	protected addRow() {
		const fa = this.getFgListControlObject();
		const targetBarcode = fa.length;
		fa.push(new FormGroup({}));
		this.setListenBarcode(targetBarcode);
	}

	/**
	 * Returns the FormArray object that controls the list field
	 */
	protected getFgListControlObject(): FormArray {
		return this.state.formGroup.get('list') as FormArray;
	}


	/**
	 * Adds the products selected to the given row idx
	 */
	protected async addProductModelToList(rowIdx: number, items: {id: string | Product, setAmount?: number, changeAmount?: number}[]) {
		// ensure row is present
		if (!this.state.formGroup.value.list[rowIdx])
			return;
		
		// generate the add data
		const ids: string[] = [];
		const valuesMap: {[id: string]: {set?: number, change?: number}} = {};
		for (const i of items) {
			const id = (i.id as IBaseModel)._id || i.id as string;
			ids.push(id)
			valuesMap[id] = {set: i.setAmount, change: i.changeAmount};
		}

		// get all the products data
		const c = new ProductController();
		const fetched = await c.getMulti({params: {
			filter: {_id: {$in: ids}, _deleted: null}, 
			fetch: c.getFullFetch(),
		}});

		// prepare the form array to add/update products
		const fa = this.FCLogic.getFA(rowIdx, 'products');
		const idHm: {[id: string]: FormGroup} = {}
		for (const p of fa.controls)
			idHm[p.value.item.id] = p as FormGroup;
		

		// add all products to array
		for (const s of fetched.data) {
			const pg = idHm[s._id] || this.FCLogic.addProductFG({id: s, amount: 0});

			const setNumber = typeof valuesMap[s._id].change === 'number'
				? pg.value.amount + valuesMap[s._id].change
				: typeof valuesMap[s._id].set === 'number' 
					? valuesMap[s._id].set 
					: 1

			// update the value
			pg.get('amount').setValue(setNumber);

			// add to the formArray if not already present
			if (!idHm[s._id])
				fa.push(pg);
		}
	}

	/**
	 * listens for barcodes and then adds the relative item to the correct list
	 * @param idx number | -1 to disable
	 */
	protected setListenBarcode(idx: number | -1) {
		if (!this.enabledItems.products)
			return;

		// if the passed idx is the same as the active then disable it
		if (this.state.listenBarcodeIdx === idx)
			idx = -1;


		// disable all
		if (idx === -1)
			CodeScannerService.restoreDefaultAction();
		// if the state currently is disable, we re-add the action listener
		else if (this.state.listenBarcodeIdx === undefined || this.state.listenBarcodeIdx === -1)
			CodeScannerService.setAction(this._onBarcodeScan);


		this.setState({listenBarcodeIdx: idx});
		this.fullFormGroupValidation(this.getFgListControlObject());
	}

	// just to bind the function and be also able to test it
	private _onBarcodeScan = (code: CodeScannerOutput) => this.onBarcodeScan(code);

	/**
	 * Callback triggered when the barcode is scanned
	 */
	private async onBarcodeScan(code: CodeScannerOutput) {
		const t = CodeScannerEventsService.getTypeFromCodeScan(code.value);

		if (t.prefix === ScannedItemType.product) {
			const res = await this.pgController.getMulti({params: {filter: {'infoData.barcode': t.fixedCode}}});
			const pg = res.data[0];
			
			if (!pg)
				return LibSmallUtils.notify('Codice non trovato', 'error');
		
			ProductGroupController.onMultipleBarcodeProducts(pg.models, (p) => {
				this.addProductModelToList(this.state.listenBarcodeIdx, [{id: p._id, changeAmount: 1}]);
			});
		}
	}

	/**
	 * gnereates the formarray for the saved model
	 */
	protected listToFormArray(model: T): FormArray {
		return new FormArray((model.list || []).map(r => new FormGroup({
			_meta: new FormControl(r._meta),
			date: new FormControl(r.date),
			manual: new FormArray((r.manual || []).map(m => this.FCLogic.manualFG({description: m.description, additional: m.additional, buyPrice: m.buyPrice, sellPrice: m.sellPrice}))),
			products: new FormArray((r.products || []).map(m => this.FCLogic.addProductFG({id: m.item.fetched, amount: m.amount}))),
		})));
	}

	/**
	 * Returns the discounted price when the % value is active
	 */
	protected getPercentageTotal(percentage: number) {
		const discount = percentage;
		const curr = this.getCalculatedTotal(this.state.formGroup.value);
		const toRemove = curr * discount / 100;
		return curr - toRemove;
	}

	// remove totalPrcie
	protected getObjectToSave(): Observable<T> {
	 return new Observable(obs => {
		 super.getObjectToSave().subscribe(toSave => {

			// override price
			if (toSave._totalPriceControl?.percentageMode) {
				if (toSave._totalPriceControl.percentage)
					toSave.totalPrice = this.getPercentageTotal(toSave._totalPriceControl.percentage);
			}
			else if (typeof toSave._totalPriceControl?.manual === 'number' && !isNaN(toSave._totalPriceControl.manual))
				toSave.totalPrice = toSave._totalPriceControl.manual;

			if (typeof toSave.totalPrice !== 'number' || isNaN(toSave.totalPrice))
				delete toSave.totalPrice;

			delete toSave._totalPriceControl;

			obs.next(toSave);
		 });
	 });
 }

}

import { Component } from 'react';
import { PTEState } from './dtd';
import { FormGroup, FormControl, FormArray, Validators } from 'react-reactive-form';
import { ProductGroup } from '../../../ProductGroup';
import { CFormArray, CFormGroup } from './custom-form-group.dtd';
import { ObjectUtils, RouterService, BusinessLocationsService, FetchableField } from '@sixempress/main-fe-lib';
import { Product } from '../../../Product';
import { ProductGroupController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product-group.controller';

export class ProductTableEditorLogic extends Component<{}, PTEState> {

	controller = new ProductGroupController();

	state: PTEState = {
		products: [],
		productsHm: {},
		canSave: false,
	};

	/**
	 * Get the visibility values
	 * // TODO if this table editor will be put in modify mode too, then this will need to be asked each row..
	 * ONLY if the row has a value tho
	 */
	protected docVisVals = BusinessLocationsService.getDocVisSelectValues();

	/**
	 * Updates the values of the global fields (the fields in the TH)
	 * based on the selected rows
	 */
	protected updateMultiSelectValues(s: this['state']) {

		const firstSelected = s.products.find(p => p.selected);

		if (!firstSelected) {
			s.multiSelectValues = undefined;
		}
		else {

			s.multiSelectValues = {
				name: firstSelected.form.value.groupData.name || '',
				category: firstSelected.form.value.groupData.category || '',
				
				supplier: firstSelected.form.value.models[0].variationData.supplier || '',
				buyPrice: (firstSelected.form.value.models[0].variationData.buyPrice || firstSelected.form.value.models[0].variationData.buyPrice === 0) 
					? firstSelected.form.value.models[0].variationData.buyPrice 
					: '',
				sellPrice: (firstSelected.form.value.models[0].variationData.sellPrice || firstSelected.form.value.models[0].variationData.sellPrice === 0) 
					? firstSelected.form.value.models[0].variationData.sellPrice 
					: '',

				visibility: firstSelected.form.value.documentLocationsFilter,
			};

			// remove the values that are not equal to all field
			for (const p of s.products) {
				if (!p.selected) { continue; }

				if (s.multiSelectValues.name && s.multiSelectValues.name !== p.form.value.groupData.name)  {
					s.multiSelectValues.name = '';
				}

				if ((s.multiSelectValues.category || {id: 1}).id !== (p.form.value.groupData.category || {id: 2}).id) {
					s.multiSelectValues.category = '';
				}

				if (s.multiSelectValues.buyPrice !== '' && s.multiSelectValues.buyPrice !== p.form.value.models[0].variationData.buyPrice) {
					s.multiSelectValues.buyPrice = '';
				}

				if (s.multiSelectValues.sellPrice !== '' && s.multiSelectValues.sellPrice !== p.form.value.models[0].variationData.sellPrice) {
					s.multiSelectValues.sellPrice = '';
				}

				if ((s.multiSelectValues.supplier || {id: 1}).id !== (p.form.value.models[0].variationData.supplier || {id: 2}).id) {
					s.multiSelectValues.supplier = '';
				}

				if (s.multiSelectValues.visibility.length !== 0 && !ObjectUtils.areArraysEqual(s.multiSelectValues.visibility, p.form.value.documentLocationsFilter)) {
					s.multiSelectValues.visibility = [];
				}

			}

		}
	}


	/**
	 * When information inside a form control is changed, only that <FieldGroup/> tag and it's child are updated
	 * This function is here to be triggered after the top level formGroup has it's valueChanged, and it's updates
	 * flags and other info for the jsx.elements outside the <FieldGroup/> scope
	 */
	private onFormGroupChange() {
		this.setState(s => {
			const isValid = this.isInValidState(s.products);
			if (isValid === s.canSave) { return; }
			return {canSave: isValid};
		});
	}

	private isInValidState(products: this['state']['products']): boolean {
		const oneInvalid = Boolean(products.find(p => p.form.invalid));
		return !oneInvalid;
	}

	/**
	 * Removes the product from the array, and if the product group is empty (no product models left)
	 * then it removes the product group too
	 */
	protected removeProduct(gId: string, pId: string) {
		this.setState(s => {

			// get initial data
			const formGroup = s.productsHm[gId];
			const models: {controls: Array<CFormGroup<ProductGroup['models'][0]>>} = formGroup.get('models') as any;
			
			// get the idx of the product model
			const prodGroupIdx = ObjectUtils.indexOfByField(models.controls, 'value._id', pId);
			if (prodGroupIdx === -1) { return; }
			
			// if it's the last model then remove the group completely
			if (models.controls.length === 1) {

				const prodsHm = {...s.productsHm};
				const prods = [...s.products];

				// remove from HM
				delete prodsHm[gId];
				// remove from array
				for (let i = 0; i < prods.length; i++) {
					if (prods[i].form === formGroup) {
						prods.splice(i, 1);
						break;
					}
				}
				// update the state
				return {products: prods, productsHm: prodsHm, canSave: this.isInValidState(prods)};
			} 
			// ELSE remove just the variation
			else {
				(models as unknown as FormArray).removeAt(prodGroupIdx);
				// TODO check if this line is necessary
				this.onFormGroupChange();
			}

		});
	}

	/**
	 * Adds a new product to the array of the products
	 */
	protected addNewProduct() {
		this.setState(s => {
			const fg = this.getProductFormGroup();
			
			// update magic stuff
			fg.valueChanges.subscribe(() => this.onFormGroupChange());


			const prodsHm = {...s.productsHm};
			const prods = [...s.products];

			prodsHm[fg.value._id] = fg;
			prods.push({ selected: false, form: fg });
			return {productsHm: prodsHm, products: prods, canSave: this.isInValidState(s.products)};
		});
	}

	
	/**
	 * Creates an empty ProductGroup to add to the state
	 */
	protected getProductFormGroup(): FormGroup {
		const rand = Math.random().toString();

		return new CFormGroup<ProductGroup>({
			// essential dtd data
			_id: new FormControl(rand),
			_trackableGroupId: new FormControl(rand),
			_totalAmount: new FormControl(null),

			// var data
			groupData: new CFormGroup<ProductGroup['groupData']>({
				name: new FormControl("", Validators.required),
				category: new FormControl(null),
			}),

			models: new CFormArray<ProductGroup['models'][0]>([
				new CFormGroup<ProductGroup['models'][0]>({
					_id: new FormControl(rand + 0),

					infoData: new CFormGroup<ProductGroup['models'][0]['infoData']>({ 
						barcode: new CFormArray<ProductGroup['models'][0]['infoData']['barcode'][0]>([]),
					}),
					groupData: new CFormGroup<ProductGroup['models'][0]['groupData']>({ 
						name: new FormControl(''),
						category: new FormControl(null),
					}),
					variationData: new CFormGroup<ProductGroup['models'][0]['variationData']>({
						buyPrice: new FormControl(null, [Validators.required, Validators.pattern(/^[0-9]+$/)]),
						sellPrice: new FormControl(null, [Validators.required, Validators.pattern(/^[0-9]+$/)]),
						supplier: new FormControl(null),
						variants: new CFormArray([]),
					}),

					documentLocationsFilter: new FormControl([BusinessLocationsService.chosenLocationId || this.docVisVals[1].value], [Validators.required, Validators.min(1)]),
				})
			]),
			// chosen location or the first not global result
			documentLocationsFilter: new FormControl([BusinessLocationsService.chosenLocationId || this.docVisVals[1].value], [Validators.required, Validators.min(1)]),
		});
	}


	/**
	 * builds the table and sends the data to the BE
	 */
	protected save() {
		const products: Product[][] = [];

		this.state.products.forEach(pg => {
			// clone the value so when you delete the fields, they are not deleted from the state
			const formValue: this['state']['products'][0]['form']['value'] = ObjectUtils.cloneDeep(pg.form.value);

			formValue.models.forEach(p => {
				p.groupData = formValue.groupData;
				p.documentLocationsFilter = formValue.documentLocationsFilter;
				delete p._id;

				this.clearFields(p);
			});

			products.push(formValue.models);
		});

		this.sendProducts(products).then(
			() => {
				// no fail go back
				if (this.state.savingProgress.fails.length === 0) {
					RouterService.back();
				} 
				// fail, remove the overlay
				else {
					this.setState({showSavingFailsOnly: true});
				}
			},
		);

	}

	/**
	 * Pass the "builded" groups in the same order as the ones in the state
	 * because this function will remove the sent products from the state
	 */
	private async sendProducts(productsGroup: Product[][]) {
		// show the saving progress
		this.setState({savingProgress: {done: 0, fails: [], total: this.state.products.length}});
		
		for (let i = 0; i < productsGroup.length; i++) {
			
			// await new Observable(obs => {
			// 	this.controller.post(productsGroup[i]).then(
			// 		done => {
			// 			this.setState(
			// 				s => {
			// 					const offsetIdx = i - s.savingProgress.done + s.savingProgress.fails.length;
							
			// 					const prodsHm = {...s.productsHm};
			// 					const prods = [...s.products];
			// 					delete prodsHm[s.products[offsetIdx].form.value._id];
			// 					prods.splice(offsetIdx, 1);

			// 					return {products: prods, productsHm: prodsHm, savingProgress: {...s.savingProgress, done: s.savingProgress.done + 1}};
			// 				}, 
			// 				() => obs.complete(),
			// 			);
			// 		}, 
			// 		error => this.setState(
			// 			s => ({savingProgress: {...s.savingProgress, fails: [...s.savingProgress.fails, error]}}), 
			// 			() => obs.complete()
			// 		)
			// 	);
			// }).toPromise();

		}
	}

	/**
	 * Removes null or undefined recursevily from an object
	 */
	private clearFields(obj: any) {
		if ((obj as FetchableField<any>).fetched && (obj as FetchableField<any>).id && (obj as FetchableField<any>).modelClass) {
			delete (obj as FetchableField<any>).fetched;
		}
		
		for (const k in obj) {

			if (obj[k] === null || obj[k] === undefined) {
				delete obj[k];
			}


			if (typeof obj[k] === 'object') {
				this.clearFields(obj[k]);
			}
		}
	}

}

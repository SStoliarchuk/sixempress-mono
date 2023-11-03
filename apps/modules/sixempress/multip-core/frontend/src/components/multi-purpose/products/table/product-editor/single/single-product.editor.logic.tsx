import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { AbstractEditor, AbstractEditorProps, FetchableField, IMongoDBFetch, ModalService,  ObjectUtils, SmallUtils } from '@sixempress/main-fe-lib';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from 'react-reactive-form';
import { SPEState, IFormGroupValue } from '../product-editor.dtd';
import { Observable, Subscriber } from 'rxjs';
import { ProductGroup } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/ProductGroup';
import { Supplier } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/Supplier';
import { AutoBarcodes, AutoBarcodesDialogResponse } from './dialogs/auto-barcodes.dialog';
import { ErrorCodes } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';
import { openConflictsModal } from './dialogs/barcode-conflicts.dialog';
import { openEditRemaindersDialog } from './dialogs/edit-remainders.dialog';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { ProductGroupController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product-group.controller';


export abstract class SingleProductEditorLogic extends AbstractEditor<ProductGroup, {}, SPEState> {

	controller = new ProductGroupController();

	// protected static barcodePattern = /^[a-z0-9-_]*$/i;

	/**
	 * Contains varius form control/array/group generator function
	 */
	public static FCFactory = {

		images(images: Product['infoData']['images']): FormControl {
			return new FormControl(images || []);
		},

		barcodeArray(barcodes: string[]): FormArray {
			return new FormArray(barcodes.map(this.barcode));
		},
	
		barcode(val?: string) { 
			return new FormControl(val, [Validators.required]); 
			// return new FormControl(val, [Validators.required, Validators.pattern(SingleProductEditorLogic.barcodePattern)]); 
		},

		price(val: any, required: boolean) {
			return new FormControl(val, required
				? [Validators.required, Validators.pattern(SmallUtils.fullPriceRegex)]
				: Validators.pattern(SmallUtils.fullPriceRegex)
			);
		},

		// can't be 0 as woocommerce errors... what...
		variant_Name(v?: string | string[]) {
			return new FormControl(v, [Validators.required, Validators.pattern(/^(?!0$)/i)]);
		},

		variant_Value_Values(v?: string | string[]) {
			return new FormControl(v, Validators.required);
		},

		autoVar(name: string, values: string[] = []) {
			return new FormGroup({
				name: this.variant_Name(name),
				values: this.variant_Value_Values(values),
			});
		},

		productVar(name: string, value: string) {
			return new FormGroup({
				name: this.variant_Name(name),
				value: this.variant_Value_Values(value),
			});
		},

	}

	/**
	 * QOL, just cause i wanna do this.FCFactory
	 */
	protected FCFactory = SingleProductEditorLogic.FCFactory;


	/**
	 * Compares two products to check if their VARIANTS not Variations are the same
	 */
	public static twoVariantsAreSame(prod1: Product, prod2: Product): boolean {
		return ProductController.twoVariantsAreSame(prod1.variationData.variants, prod2.variationData.variants);
	}


	fieldsToFetch: IMongoDBFetch<ProductGroup>[] = [
		{field: 'groupData.category', projection: {name: 1}},
		{field: 'groupData.additionalCategories.*', projection: {name: 1}},
		{field: 'models.*.variationData.supplier', projection: {name: 1, _progCode: 1}},
	]

	protected getEditorConfiguration(): AbstractEditorProps<ProductGroup> {
		return {
			usePut: true,
			saveActionArea: false,
			onSaveSuccess: () => {
				// ensure that there are no remainder
				// if there are, then prompt the user to fix them
				if (this.objFromBe) {
					// project _totalAmount too as to not remove the product variations remainders
					this.controller.getSingle(this.objFromBe._id, {params: {projection: {'models._deleted': 1, 'models._id': 1, 'models._totalAmount': 1}}})
					.then(group => {
						if (group.models.some(o => Boolean(o._deleted))) {
							openEditRemaindersDialog(group.models);
						}
					});
				}
			},
			onSaveError: (error: any) => {
				const err = error && error.data;
				if (err && err.code === ErrorCodes.barcodeConflict) {
					openConflictsModal('barcode', err.data);
				} 
				else if (err && err.code === ErrorCodes.tagsConflict) {
					openConflictsModal('tags', err.data);
				}
				else {
					throw error;
				}
			},
		}
	}


	/**
	 * Generates the main data used for the edtiro
	 * @param pg The product to edit if in edit mode
	 */
	protected generateFormControls(pg?: Partial<ProductGroup>): {[A in keyof IFormGroupValue]?: AbstractControl} {

		// the products of the product group
		const prodsModelsArr = pg?.models ? pg.models.filter(m => !m._deleted) : [];

		// invert ref price and sell price
		// for easier logic down the line
		for (const m of prodsModelsArr) {
			if (typeof m.infoData.refSellPrice !== 'undefined') {
				let price = m.variationData.sellPrice;
				m.variationData.sellPrice = m.infoData.refSellPrice;
				m.infoData.refSellPrice = price;
			}
		}

		let mostUsed: Partial<ReturnType<SingleProductEditorLogic['getMostUsedInVariations']>> = prodsModelsArr.length 
			? this.getMostUsedInVariations(prodsModelsArr) 
			: {};
		let prodVariationsArray: FormGroup[];

		// variants info
		const manualVariants: string[] = [];
		const automaticVariants: {name: string, values: string[]}[] = [];

		// creation mode
		if (prodsModelsArr.length === 0) {
			prodVariationsArray = [this.generateProductVariantionFormGroup()];
		}
		// edit mode
		else {
			
			// when we have no variants we treat the base variation as a model to save
			// thus in edit mode, we need to tensure to take an existing model
			if (prodsModelsArr[0].variationData.variants.length === 0) {
				const prod = this.getProductThatHasMostUsedData(prodsModelsArr, mostUsed);
				mostUsed = { ...prod.variationData, refSellPrice: prod.infoData.refSellPrice };
			}
		
			// map the items
			prodVariationsArray = prodsModelsArr.map(p => this.generateProductVariantionFormGroup(null, {
				_id: p._id,
				infoData: p.infoData,
				variationData: p.variationData,
			}, mostUsed));

			// create tha variants info
			if (prodsModelsArr[0].variationData.variants.length !== 0) {
				const variantsHm: {[variantName: string]: string[]} = {};
				
				for (const p of prodsModelsArr) {
					for (const v of p.variationData.variants) {
						if (!variantsHm[v.name]) { variantsHm[v.name] = []; }
						variantsHm[v.name].push(v.value);
					}
				}
				
				for (const k in variantsHm) {
					automaticVariants.push({name: k, values: variantsHm[k]});
					manualVariants.push(k);
				}
			}
		}

		const disabledPgConnections = pg?.externalSync?.disabled?.map(p => p.id) || [];

		// return the state to set
		return {
			
			variants: new FormGroup({
				enabled: new FormControl(automaticVariants.length !== 0),
				simple: new FormControl(!Boolean(pg)),
				manual: new FormArray(manualVariants.map(v => this.FCFactory.variant_Name(v))),
				automatic: new FormArray(automaticVariants.map(v => this.FCFactory.autoVar(v.name, v.values))),
				autoNotGeneratedCombinations: new FormControl([]),
			}),

			externalSync: new FormArray((MultipService.exts.externalConnections || []).filter(ec => ec.useFor.crudFromLocal || ec.useFor.crudFromRemote).map(e => new FormGroup({
				enabled: new FormControl(pg ? !disabledPgConnections.includes(e._id) : true),
				name: new FormControl(e.name),
				id: new FormControl(e._id),
			}))),

			baseVariation: new FormGroup({
				refSellPrice: this.FCFactory.price(mostUsed.refSellPrice, false),
				sellPrice: this.FCFactory.price(mostUsed.sellPrice, true),
				buyPrice: this.FCFactory.price(mostUsed.buyPrice, true),
				supplier: new FormControl(mostUsed.supplier),
			}),

			productVariations: new FormArray(prodVariationsArray, (c) => c.value.length < 1 ? {minProdcuctVariationError: true} : null)
		};

	}

	/**
	 * Generates a product product variation 
	 * @param variantsToUse Force the variants of the current item
	 * @param productValues the values to copy
	 * @param mostUsed the base variation of the group, as to create separateVariation info
	 */
	public generateProductVariantionFormGroup(
		variantsToUse?: {name: string, value: string}[],
		productValues: Partial<IFormGroupValue['productVariations'][0]> = {},
		mostUsed: { sellPrice?: number, buyPrice?: number, supplier?: FetchableField<Supplier>, refSellPrice?: number } = {}
	): FormGroup {

		// the variation data of the product
		const variationData: Partial<Product['variationData']> = productValues.variationData || {};
		const infoData: Partial<Product['infoData']> = productValues.infoData || {}
		

		const barcodeToUse: string[] = infoData.barcode || [];
		
		// start with empty vals
		let diffBuyPrice: boolean = false;
		let diffSellPrice: boolean = false;
		let diffSupp: boolean = false;
		
		// if copy all field (when cloning or in modify mode)
		if (productValues.variationData) {
			// set buy price
			if (variationData.buyPrice !== mostUsed.buyPrice) { 
				diffBuyPrice = true; 
			}
			// sell price
			if (variationData.sellPrice !== mostUsed.sellPrice || infoData.refSellPrice !== mostUsed.refSellPrice) { 
				diffSellPrice = true; 
			}
			// supplier
			if (
				Boolean(variationData.supplier) !== Boolean(mostUsed.supplier) ||
				variationData.supplier?.id !== mostUsed.supplier?.id
			) {
				diffSupp = true;
			}
		}

		return new FormGroup({
			_id: new FormControl(productValues._id),
			__jsx_id: new FormControl(productValues.__jsx_id || Math.random().toString()),
			separatedVariations: new FormGroup({
				supplier: new FormControl(diffSupp),
				sellPrice: new FormControl(diffSellPrice),
				buyPrice: new FormControl(diffBuyPrice),
			}),
			infoData: new FormGroup({
				barcode: this.FCFactory.barcodeArray(barcodeToUse),
				refSellPrice: this.FCFactory.price(infoData.refSellPrice, false),
				images: this.FCFactory.images(infoData.images),
			}),
			variationData: new FormGroup({
				buyPrice: this.FCFactory.price(variationData.buyPrice, false),
				sellPrice: this.FCFactory.price(variationData.sellPrice, false),
				supplier: new FormControl(variationData.supplier),
	
				variants: new FormArray(
					(variationData.variants || variantsToUse || []).map(i => this.FCFactory.productVar(i.name, i.value))
				),
			}),
		});
	}

	/**
	 * Gets the most used values in the product variations
	 * @param prodsModelsArr Array of product variants
	 */
	private getMostUsedInVariations(prodsModelsArr: Product[]): {refSellPrice: number, supplier: FetchableField<Supplier>, buyPrice: number, sellPrice: number} {
		
		// create a list of how time each stuff gets refered
		// the most refered will be used as baseVariation
		// the rest will be used for product variations
		const referedAmountList: { 
			refSellPrice: {[price: number]: {value: number, amount: number}}, 
			supplier: {[id: string]: {value: FetchableField<Supplier>, amount: number}}, 
			buyPrice: {[price: number]: {value: number, amount: number}}, 
			sellPrice: {[price: number]: {value: number, amount: number}},
		} = { 
			refSellPrice: {},
			supplier: {}, 
			buyPrice: {}, 
			sellPrice: {} 
		};

		for (const prod of prodsModelsArr) {
			
			// supplier
			if (prod.variationData.supplier) {
				if (!referedAmountList.supplier[prod.variationData.supplier.id]) { 
					referedAmountList.supplier[prod.variationData.supplier.id] = { value: prod.variationData.supplier, amount: 0 }; 
				}
				referedAmountList.supplier[prod.variationData.supplier.id].amount++;
			} 
			// mark how many products dont have the supplier too as it's a possible value
			else {
				if (!referedAmountList.supplier['undefined']) { 
					referedAmountList.supplier['undefined'] = { value: undefined, amount: 0 }; 
				}
				referedAmountList.supplier['undefined'].amount++;
			}


			// buyPrice
			if (!referedAmountList.buyPrice[prod.variationData.buyPrice]) { 
				referedAmountList.buyPrice[prod.variationData.buyPrice] = { value: prod.variationData.buyPrice, amount: 0 };  
			}
			referedAmountList.buyPrice[prod.variationData.buyPrice].amount++;

			// sell price
			if (!referedAmountList.sellPrice[prod.variationData.sellPrice]) { 
				referedAmountList.sellPrice[prod.variationData.sellPrice] = { value: prod.variationData.sellPrice, amount: 0 };  
			}
			referedAmountList.sellPrice[prod.variationData.sellPrice].amount++;

			// ref sell price
			if (!referedAmountList.refSellPrice[prod.infoData.refSellPrice]) { 
				referedAmountList.refSellPrice[prod.infoData.refSellPrice] = { value: prod.infoData.refSellPrice, amount: 0 };  
			}
			referedAmountList.refSellPrice[prod.infoData.refSellPrice].amount++;
		}

		// sort for the amount called and return the most called value
		return {
			buyPrice: Object.values(referedAmountList.buyPrice).sort((a, b) => b.amount - a.amount)[0].value,
			sellPrice: Object.values(referedAmountList.sellPrice).sort((a, b) => b.amount - a.amount)[0].value,
			refSellPrice: Object.values(referedAmountList.refSellPrice).sort((a, b) => b.amount - a.amount)[0].value,
			supplier: Object.values(referedAmountList.supplier).sort((a, b) => b.amount - a.amount)[0].value,
		};
		
	}


	/**
	 * Finds the product that matches as much as mostUsed data as possibile
	 */
	private getProductThatHasMostUsedData(prods: Product[], mostUsed: {refSellPrice?: number, buyPrice?: number, sellPrice?: number, supplier?: FetchableField<Supplier>}): Product {
		// filter each item thoruh the stages

		const buyPrice_F = typeof mostUsed.buyPrice === 'undefined' ? prods : prods.filter(p => p.variationData.buyPrice === mostUsed.buyPrice);
		if (buyPrice_F.length === 0) {
			return prods[0];
		}

		const sellPrice_F = typeof mostUsed.sellPrice === 'undefined' ? prods : buyPrice_F.filter(p => p.variationData.sellPrice === mostUsed.sellPrice);
		if (sellPrice_F.length === 0) {
			return buyPrice_F[0];
		}

		const refSellPrice_F = sellPrice_F.filter(p => p.infoData.refSellPrice === mostUsed.refSellPrice);
		if (refSellPrice_F.length === 0) {
			return sellPrice_F[0];
		}

		const supplier_F = refSellPrice_F.filter(p => p.variationData.supplier?.id === mostUsed.supplier?.id);
		if (supplier_F.length === 0) {
			return refSellPrice_F[0];
		}
		
		return supplier_F[0];
	}


	/**
	 * Adds a product variation row to the available variations
	 * @param ovrVariants Variants to set in the new product variation
	 */
	protected addProductVariation(ovrVariants: { name: string; value: any; }[]) {
		(this.state.formGroup.get('productVariations') as FormArray).insert(
			// insert at 1 as the prod at [0] is used in the baseVariation
			this.state.formGroup.value.variants.enabled ? 0 : 1,
			this.generateProductVariantionFormGroup(ovrVariants)
		);
	}


	/**
	 * Removes all variants and variations
	 */
	protected clearVariantAndVariations() {
		this.clearFormArray(this.state.formGroup.get('variants').get('automatic') as FormArray);
		this.clearFormArray(this.state.formGroup.get('variants').get('manual') as FormArray);
		this.clearFormArray(this.state.formGroup.get('productVariations') as FormArray);
		this.state.formGroup.get('variants').patchValue({enabled: false, simple: true, autoNotGeneratedCombinations: []});
		
		// add 1 starting element
		(this.state.formGroup.get('productVariations') as FormArray).push(this.generateProductVariantionFormGroup());
	}


	/**
	 * Trigger this function whenever you add/remove variant or variant value
	 * It rebuilds the available product variations in auto mode\
	 * and adds the missing variant names in manual mode
	 * @param simple if the variants logic is simple or complex\
	 * it is present as a parameter so it can be executed before the formControl simple value changes
	 */
	protected rebuildProductForVariationChange(simple: boolean = this.state.formGroup.value.variants.simple) {

		// rebuild the whole combination
		if (simple) {
			// add prods
			const combinations = this.createCombinations(this.state.formGroup.value.variants.automatic);

			// we try to optimize this as much as possible cause it's slow
			// so we try to conserve the old formgroups
			// 
			// and instead of pushing we replace the whole formarray
			const formGroups = combinations.map((c, idx) => {
				return ObjectUtils.areVarsEqual(this.state.formGroup.value.productVariations[idx]?.variationData.variants, c)
					? this.state.formGroup.get('productVariations').get(idx.toString())
					: this.generateProductVariantionFormGroup(c);
			});

			this.state.formGroup.setControl('productVariations', new FormArray(formGroups));
		}

		// ensure the variant names and order is the same
		else {
			// the current array of variants to have
			const variantsNames = this.state.formGroup.value.variants.manual;
	
			for (const pv of (this.state.formGroup.get('productVariations') as FormArray).controls) {
				const fa = pv.get('variationData').get('variants') as FormArray;
				
				// remove excess
				if (fa.controls.length > variantsNames.length) {
					for (let i = fa.controls.length - 1; fa.controls.length > variantsNames.length; i--) {
						fa.removeAt(i);
					}
				}

				// remap the variant names in the same order and names
				for (let i = 0; i < variantsNames.length; i++) {
					// add if not present
					if (!fa.controls[i]) {
						fa.insert(i, this.FCFactory.productVar(variantsNames[i], null));
					}
					// remove if not the same name
					else if (fa.controls[i].value.name !== variantsNames[i]) {
						fa.removeAt(i);
						fa.insert(i, this.FCFactory.productVar(variantsNames[i], null));
					}
				}
			}
		}
	}

	
	/**
	 * Removes every control from formArray
	 */
	protected clearFormArray(fa: FormArray) {
		for (let i = fa.controls.length - 1; i !== -1; i--) {
			fa.removeAt(i);
		}
	}

	/**
	 * Creates the variant combination to use when generating a new products
	 */
	private createCombinations(vars: Array<{name: string, values: string[]}>): Array<Array<{name: string, value: string}>> {
		const combs = this.allPossibleCases(vars.map(v => v.values));
		const varsToR: Array<Array<{name: string, value: string}>> = [];

		for (let i = 0; i < combs.length; i++) {
			varsToR.push(combs[i].map((variantVal, valIdx) => ({
				name: vars[valIdx].name, 
				value: variantVal
			})));
		}

		return varsToR;
	}

	/**
	 * Combine recursively the possible values
	 */
	private allPossibleCases(arr: (string[])[]): (string[])[] {
		if (arr.length === 1) { 
			return arr[0].map(v => [v]); 
		}
		else {
			const result = [];
			const allCasesOfRest = this.allPossibleCases(arr.slice(1));
			for (let i = 0; i < allCasesOfRest.length; i++) {
				for (let j = 0; j < arr[0].length; j++) {
					result.push([arr[0][j], ...allCasesOfRest[i]]);
				}
			}
			return result;
		}
	}

	
	/**
	 * We replace the original send() function as we need to pass the barcode query parameter
	 * but instead of replacing the whole send() function we could just replace the getSendAction() function that returns Patch/Put/Post and instead of directly returning the request
	 * we can return an observable that internally opens the modal for the barcode choice and then after call the post/put
	 * 
	 * meawhile for the "same variation" error, we can do it on the save() function click
	 * 
	 * and for the formGroup value to product group conversion we do it in the appropriate function generateToSaveObjectByFormGroup()
	 * 
	 * but for now this is a good function cya
	 */
	protected send() {
		return new Observable<string>(obs => {

			// continues only if formgroup is valid
			this.fullFormGroupValidation();
			if (!this.state.formGroup.valid) {
				return;
			}

			// generates the object to save or the patch operations to give
			this.getObjectToSave().subscribe(toSave => {

				const processed = this.generateProductGroup(toSave as any as IFormGroupValue);

				// assign the newly generated product group
				if (processed) {
					toSave = processed
					this.setState({sameVariationsError: false});
				}
				// show an error that some variations are equal
				else {
					// we use fullFormGroupValidation() as forceUpdate();
					this.setState({sameVariationsError: true});
					this.fullFormGroupValidation();
					setTimeout(() => {
						this.setState({sameVariationsError: false});
						this.fullFormGroupValidation();
					}, 5000);

					return;
				}

				this.fixObjBeforeSend(toSave);

				// check if at least 1 item doesnt have manual barcode
				let barcodeAbsent = false;
				for (const prod of toSave.models) {
					if (!prod.infoData.barcode.length) {
						barcodeAbsent = true;
						break;
					}
				}

				// no barcode problems, save directly
				if (!barcodeAbsent || (barcodeAbsent && toSave.models.length === 1)) {
					this.getSendActionPG(obs, toSave);
					return;
				}
				// resolve the barcode problem
				else {
					ModalService.open({title: 'Barcode automatici', content: AutoBarcodes}, {}, {maxWidth: 'md', fullWidth: true, removePaper: true, onClosed: (data?: AutoBarcodesDialogResponse) => {
						if (!data)
							return;

						// submit with the value
						if (data.mode === 'automatic') {
							this.getSendActionPG(obs, toSave, data.differentBarcodes);
						} 
						// if manual value to set
						// then set the barcode
						else { 
							if (data.barcodeValueToUse) {
								for (const prod of toSave.models) {
									if (!prod.infoData.barcode.length) {
										prod.infoData.barcode = data.barcodeValueToUse;
									}
								}
							}
							this.getSendActionPG(obs, toSave);
						}
					}})
							
				}
			});
		});
	}

	/**
	 * sends this to the backend
	 */
	private getSendActionPG(obs: Subscriber<string>, processed: ProductGroup, allDifferentAutomaticBarcode?: string) {
		const action =  this.objFromBe
			? this.controller.put(this.objFromBe._id, processed, {params: {variantsDifferentBarcode: allDifferentAutomaticBarcode}})
			: this.controller.post(processed, {params: {variantsDifferentBarcode: allDifferentAutomaticBarcode}})

		action
		.then(d => {
			obs.next((this.objFromBe || d)._id.toString());
			obs.complete();
			this.config.onSaveSuccess(d, (this.objFromBe || d)._id.toString())
		})
		.catch(err => {
			this.config.onSaveError(err)
		});
	}

	/**
	 * Returns an array of products to send to the BE. If found some duplicates returns false
	 * @param formGroupData The formgroup.value already cloned
	 */
	private generateProductGroup(formGroupData: IFormGroupValue): false | ProductGroup {
		const toSave = this.createModels(formGroupData);
		// check that there is no duplicant products
		if (!this.checkNoDuplicates(toSave)) 
			return false;

		
		const toR: ProductGroup = {
			models: toSave,
			groupData: formGroupData.groupData,
			documentLocationsFilter: formGroupData.documentLocationsFilter,
		}
		
		if (formGroupData.documentLocation)
			toR.documentLocation = formGroupData.documentLocation;
		
		if (toR.groupData.additionalCategories && toR.groupData.additionalCategories.length)
			toR.groupData.additionalCategories = toR.groupData.additionalCategories.filter(c => c && c.id);

		// add disabled ext sync
		toR.externalSync = {
			disabled: formGroupData.externalSync.filter(e => !e.enabled).map(e => ({id: e.id})),
		}

		if (this.objFromBe) {
			toR._id = this.objFromBe._id;
			toR._trackableGroupId = this.objFromBe._trackableGroupId;
		}

		return toR;
	}


	/**
	 * Creats the models of the product group
	 */
	private createModels(formGroupData: IFormGroupValue): Product[] {
		return formGroupData.productVariations.map((pv: IFormGroupValue['productVariations'][0] = {} as any): Product => {
			
			// base data
			const toR: Product = {
				infoData: {
					barcode: pv.infoData.barcode.filter(b => b),
				},
				variationData: {
					buyPrice: pv.separatedVariations.buyPrice && typeof pv.variationData.buyPrice === 'number'
						? pv.variationData.buyPrice
						: formGroupData.baseVariation.buyPrice,

					sellPrice: pv.separatedVariations.sellPrice && typeof pv.variationData.sellPrice === 'number'
						? pv.variationData.sellPrice
						: formGroupData.baseVariation.sellPrice,

					variants: pv.variationData.variants 
						? pv.variationData.variants.map((v, idx) => ({
								name: formGroupData.variants.simple 
									? formGroupData.variants.automatic[idx].name.trim()
									: formGroupData.variants.manual[idx].trim(),
								value: v.value.trim()
							})) 
						: [],
				}
				
			} as Product as any as Product;
			
			// fields present if in edit mode
			if (pv._id) 
				toR._id = pv._id;

			if (pv.infoData.images.length)
				toR.infoData.images = pv.infoData.images;

			if (pv.separatedVariations.supplier) {
				if (pv.variationData.supplier && pv.variationData.supplier.id) {
					toR.variationData.supplier = new FetchableField<Supplier>(pv.variationData.supplier.id, ModelClass.Supplier);
				}
			}
			else if (formGroupData.baseVariation.supplier && formGroupData.baseVariation.supplier.id) {
				toR.variationData.supplier = new FetchableField<Supplier>(formGroupData.baseVariation.supplier.id, ModelClass.Supplier); 
			}

			// ref sell price
			// invert back ref price and sell price;
			if (pv.separatedVariations.sellPrice) {
				if (typeof pv.infoData.refSellPrice === 'number') {
					toR.infoData.refSellPrice = toR.variationData.sellPrice;
					toR.variationData.sellPrice = pv.infoData.refSellPrice;
				}
			}
			else if (typeof formGroupData.baseVariation.refSellPrice === 'number') {
				toR.infoData.refSellPrice = toR.variationData.sellPrice;
				toR.variationData.sellPrice = formGroupData.baseVariation.refSellPrice;
			}

			return toR;
		});
	}



	/**
	 * @param products The products array to control
	 */
	private checkNoDuplicates(productsToCheck: Product[]): boolean {
		
		// THIS IS THE OLD VERSION THAT ALLOWS ALL VARIATIONS
		// 
		// const toDiff: Product['variationData'][] = productsToCheck.map(prod1 => ({
		// 	...prod1.variationData,
		// 	variants: prod1.variationData.variants.map(v => ({name: v.name.toLowerCase(), value: v.value.toLowerCase()}))
		// }));
			
		// copy the array
		// and ensure all the variants are lower case for the check
		const toDiff: Product['variationData']['variants'][] = productsToCheck.map(prod1 => 
			prod1.variationData.variants.map(v => ({
				name: v.name.toLowerCase().trim(), 
				value: v.value.toLowerCase().trim()
			}))
		);
 
		// remove the duplicates
		const diffed = ObjectUtils.removeDuplicates(toDiff);
		return diffed.length === productsToCheck.length;
	}


}
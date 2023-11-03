import './single-product.editor.css';
import React from 'react';
import { getProductType, getProducttypeSelectValues, Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { RouterService, CodeScannerService, FetchableField, FieldsFactory, LoadingOverlay, ModalService,  ObjectUtils, SmallUtils, TopLevelEditorPart, LibSmallUtils } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import { AbstractControl, FieldArray, FieldControl, FieldGroup, FormArray, FormControl } from 'react-reactive-form';
import { Subscription } from 'rxjs';
import { SingleProductEditorLogic } from './single-product.editor.logic';
import Delete from '@material-ui/icons/Delete';
import Close from '@material-ui/icons/Close';
import Add from '@material-ui/icons/Add';
import ClearAll from '@material-ui/icons/ClearAll';
import Queue from '@material-ui/icons/Queue';
import ChipInput from 'material-ui-chip-input';
import { Supplier } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/Supplier';
import { SupplierEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.editor';
import TableContainer from '@material-ui/core/TableContainer';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Popover from '@material-ui/core/Popover';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { IFormGroupValue } from '../product-editor.dtd';
import { ProductVariant, ProductVarTypes } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/ProductVariant';
import { ProductVariantsTable, VariantName } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/productvariants.table';
import { CodeScannerEventsActiveStatus } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-active-status';
import { ProductGroup } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/ProductGroup';
import { InventoryCategoryController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/inventory-categories/InventoryCategory.controller';
import { RawFilesFormControl } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/external-connections/raw-files/raw-files.utils';
import { OutlinedTextFieldProps } from '@material-ui/core/TextField';
import { addQuickSettingToLastUsed, QuickCachedSettings, removeQuickSettingToLastUsed } from './quick-product-vars';
import { InventoryCategory } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/inventory-categories/InventoryCategories';
import { SupplierController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.controller';
import { ProductVariantController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/product-variants/prouctvariant.controller';

export class SingleProductEditor extends SingleProductEditorLogic {

	private variantController = new ProductVariantController();

	requirePhysicalLocation = false;
	requireDocumentLocation = undefined;
	controllerUrl = BePaths.products;

	private loadSavedVar = AuthService.isAttributePresent(Attribute.viewProductVariants);
	private saveNewVars = AuthService.isAttributePresent(Attribute.addProductVariants);

	/**
	 * Various click handlers
	 */
	private handlers = {
		manualBarcodeInputForm: (e: React.FormEvent<any>) => {
			e.preventDefault();
			const inp = e.currentTarget.querySelector('input');
			const v = (inp.value || '').trim();
			inp.value = '';
			
			if (!v) 
				return;

			const idx = this.state.barcodePopover.prodIdx;
			const mode = this.state.barcodePopover.mode;

			const control = this.state.formGroup.get('productVariations').get(idx.toString()).get('infoData').get('barcode') as FormArray;
			control.push(this.FCFactory.barcode(v));
			if (mode === 'set') 
				this.handlers.CloseBarcodePopover();
		},
		SaveAndCreateAgain: () => {
			this.send().subscribe(d => {
				LibSmallUtils.notify('Prodotto creato', 'success');
				RouterService.reloadPage();
			});
		},
		Save: () => {
			this.send().subscribe(d => {
				if (this.props.modalRef) {
					this.props.modalRef.close();
				} else {
					RouterService.back()
				}
			});
		},
		SeparateVariationField: (e: React.MouseEvent<any>) => {

			const controlKey: string = e.currentTarget.dataset.controlKey;
			const idx = parseInt(e.currentTarget.dataset.idx);
			const c = (this.state.formGroup.get('productVariations') as FormArray).controls[idx];
	
			c.get('separatedVariations').patchValue({[controlKey]: !c.value.separatedVariations[controlKey]});
			// reset the value each time just to be safe
			c.get('variationData').patchValue({[controlKey]: null});
	
			// close the menu
			if (this.state.productVariantFieldControlMenu) {
				this.setState({productVariantFieldControlMenu: null});
			}
		},
		AddVariantType: () => {
			if (this.state.formGroup.value.variants.simple) {
				(this.state.formGroup.get('variants').get('automatic') as FormArray).push(
					this.FCFactory.autoVar((this.state.formGroup.value.variants.automatic.length + 1).toString())
				);
			} else {
				(this.state.formGroup.get('variants').get('manual') as FormArray).push(
					this.FCFactory.variant_Name((this.state.formGroup.value.variants.manual.length + 1).toString())
				);
			}

			this.rebuildProductForVariationChange();
		},
		RemoveVariantType: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);
	
			const mode = this.state.formGroup.value.variants.simple ? 'automatic' : 'manual';
			(this.state.formGroup.get('variants').get(mode) as FormArray).removeAt(idx);
			this.rebuildProductForVariationChange();
		},
		/**
		 * When in auto variant mode we delete a variation, we can restore that variation here
		 */
		RestoreAutoVar: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);
			const all = [...this.state.formGroup.value.variants.autoNotGeneratedCombinations];

			const removed = all.splice(idx, 1)[0].variations;
			this.state.formGroup.get('variants').get('autoNotGeneratedCombinations').setValue(all);

			this.addProductVariation(removed);
		},
		AddVariation: () => {
			this.addProductVariation(this.state.formGroup.value.variants.manual.map(n => ({name: n, value: null})));
		},
		CloseSeparateVarMenu: () => {
			this.setState({productVariantFieldControlMenu: {...this.state.productVariantFieldControlMenu, open: false}});
		},
		OpenSeparateVarMenu: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);
			this.setState({productVariantFieldControlMenu: {open: true, anchor: e.currentTarget, prodIdx: idx}});
		},
		RemoveProductVariation: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);

			if (this.state.formGroup.value.variants.enabled) {
				// if removing the last variation, then restore to normal value
				if (this.state.formGroup.value.productVariations.length === 1) {
					this.clearVariantAndVariations();
					return;
				}
				// check if last variant in simple mode
				// and if so add it to the notGeneratedArray info
				else if (this.state.formGroup.value.variants.simple) {
					const variants = this.state.formGroup.value.productVariations[idx].variationData.variants;
					const pVars = variants.map(v => v.value.toLowerCase()).join('');
		
					let lastVariant = true;
					for (let i = 0; i !== this.state.formGroup.value.productVariations.length; i++) {
						if (i === idx) { continue; }
						if (this.state.formGroup.value.productVariations[i].variationData.variants.map(v => v.value.toLowerCase()).join('') === pVars) {
							lastVariant = false;
						}
					}
		
					if (lastVariant) {
						this.state.formGroup.get('variants').get("autoNotGeneratedCombinations").setValue([
							...this.state.formGroup.value.variants.autoNotGeneratedCombinations,
							{ variations: variants },
						]);
					}
				}
			}

			// remove the prod
			(this.state.formGroup.get('productVariations') as FormArray).removeAt(idx);
		},
		DuplicateProductVariation: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);
			
			const prod = ObjectUtils.cloneDeep(this.state.formGroup.value.productVariations[idx]);
			delete prod._id;
			delete prod.__jsx_id;
	
			// insert just before the original item
			(this.state.formGroup.get('productVariations') as FormArray)
			.insert(idx, this.generateProductVariantionFormGroup(null, prod));
		},
		
		SaveVariantsPreset: () => {
			ModalService.open(
				VariantName,
				{ callback: (name) => {
					const pvar: ProductVariant = {
						name,
						data: this.state.formGroup.value.variants.simple ? {
							type: ProductVarTypes.automatic,
							value: this.state.formGroup.value.variants.automatic,
						} : {
							type: ProductVarTypes.manual,
							value: this.state.formGroup.value.variants.manual,
						},
					};

					this.variantController.post(pvar).then(r => LibSmallUtils.notify("Varianti salvate", 'success'));
				} }
			);
		},
		SaveTags: () => {
			ModalService.open(
				VariantName,
				{ callback: (name) => {
					const pvar: ProductVariant = {
						name,
						data: {
							type: ProductVarTypes.tags,
							value: this.state.formGroup.value.groupData.tags,
						},
					};

					this.variantController.post(pvar).then(r => LibSmallUtils.notify("Tags salvati", 'success'));
				} }
			);
		},
		SaveCategories: (e: React.MouseEvent<any>) => {
			e.stopPropagation();
			e.preventDefault();
			ModalService.open(
				VariantName,
				{ callback: (name) => {

					const cats: InventoryCategory[] = [this.state.formGroup.value.groupData.category.fetched];
					if (this.state.formGroup.value.groupData.additionalCategories && this.state.formGroup.value.groupData.additionalCategories.length)
						for (const c of this.state.formGroup.value.groupData.additionalCategories)
							cats.push(c.fetched);

					const pvar: ProductVariant = {
						name,
						data: {
							type: ProductVarTypes.category,
							value: cats.map(c => ({name: c.name, id: c._id})),
						},
					};

					this.variantController.post(pvar).then(r => LibSmallUtils.notify("Tags salvati", 'success'));
				} }
			);
		},
		LoadVariantsPreset: () => {
			ProductVariantsTable.openSelectModal((i) => {
				addQuickSettingToLastUsed('variant', i);
				this.setVariationPv(i.data);
			}, [ProductVarTypes.automatic, ProductVarTypes.manual]);
		},
		LoadInternalTags: () => {
			ProductVariantsTable.openSelectModal((i) => {
				addQuickSettingToLastUsed('internal_tags', i);
				this.setInternalTags(i.data);
			}, [ProductVarTypes.tags]);
		},
		LoadTags: () => {
			ProductVariantsTable.openSelectModal((i) => {
				addQuickSettingToLastUsed('tag', i);
				this.setTags(i.data);
			}, [ProductVarTypes.tags]);
		},
		RemoveMainCategory: (e: React.MouseEvent<any>) => {
			e.stopPropagation();
			e.preventDefault();
			this.clearCategories();
		},
		LoadCategories: (e: React.MouseEvent<any>) => {
			e.stopPropagation();
			e.preventDefault();
			ProductVariantsTable.openSelectModal((i) => {
				addQuickSettingToLastUsed('category', i);
				this.setCategories(i.data, i._id);
			}, [ProductVarTypes.category]);
		},

		OpenBarcodePopover: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);
			const mode: 'set' | 'add' = e.currentTarget.dataset.mode;

			// create sub for the barcode
			if (!this.props.modalRef) { CodeScannerEventsActiveStatus.isActive = false; }
			if (this.barcodeSub) { this.barcodeSub.unsubscribe(); }
			
			this.barcodeSub = CodeScannerService.emitter.subscribe(output => {
				const control = this.state.formGroup.get('productVariations').get(idx.toString()).get('infoData').get('barcode') as FormArray;
				control.push(this.FCFactory.barcode(output.value));
				if (mode === 'set') { this.handlers.CloseBarcodePopover(); }
			});


			this.setState({barcodePopover: {
				open: true,
				anchor: e.currentTarget,
				mode: mode,
				prodIdx: idx,
			}});
		},
		CloseBarcodePopover: () => {
			// restore barcode actions
			if (this.barcodeSub) { this.barcodeSub.unsubscribe(); }
			if (!this.props.modalRef) { CodeScannerEventsActiveStatus.isActive = true; }

			this.setState({barcodePopover: {...this.state.barcodePopover, open: false}});
		},
		ClearBarcodes: () => {
			const idx = this.state.barcodePopover.prodIdx;
			const fa = this.state.formGroup.get('productVariations').get(idx.toString()).get('infoData').get('barcode') as FormArray;
			this.clearFormArray(fa);
			this.handlers.CloseBarcodePopover();
		},
		RemoveBarcode: (e: React.MouseEvent<any>) => {
			const idx = parseInt(e.currentTarget.dataset.idx);
			const barcodeIdx = parseInt(e.currentTarget.dataset.barcodeIdx);
			const fa = this.state.formGroup.get('productVariations').get(idx.toString()).get('infoData').get('barcode') as FormArray;
			fa.removeAt(barcodeIdx);
		},
		/**
		 * Triggered after toggling simple mode on/off
		 * 
		 * if new state is off it removes all the product variations\
		 * if new state is on it adds a base variation
		 */
		onBeforeToggleVariantEnabled: () => {

			const futureValueEnabled = !this.state.formGroup.value.variants.enabled;
	
			// add a base variant
			if (futureValueEnabled) {
				this.handlers.AddVariantType();
			} 
			// restore the variants/variations if disabled
			else {
				this.clearVariantAndVariations();
			}
	
		},
		/**
		 * translates auto variant names to manual variant names
		 */
		onBeforeToggleVariantSimpleMode: () => {
		
			// remove the products
			this.clearFormArray(this.state.formGroup.get('productVariations') as FormArray);
			// clear auto vars
			this.state.formGroup.get('variants').patchValue({autoNotGeneratedCombinations: []});
	
			const futureValueSimple = !this.state.formGroup.value.variants.simple;
			if (futureValueSimple) {
				// invert the names
				const fa = this.state.formGroup.get('variants').get('automatic') as FormArray;
				this.clearFormArray(fa);
				this.state.formGroup.value.variants.manual.forEach(v => fa.push(this.FCFactory.autoVar(v, [])));
				
				// clear other for formGroup validity
				this.clearFormArray(this.state.formGroup.get('variants').get('manual') as FormArray);
			}
			else {
				const fa = this.state.formGroup.get('variants').get('manual') as FormArray;
				this.clearFormArray(fa);
				this.state.formGroup.value.variants.automatic.forEach(v => fa.push(this.FCFactory.variant_Name(v.name)));

				// clear other for formGroup validity
				this.clearFormArray(this.state.formGroup.get('variants').get('automatic') as FormArray);
		
				// add a simple product for the user to write
				this.addProductVariation((fa.value as string[]).map(v => ({name: v, value: null})));

			}
	
			this.rebuildProductForVariationChange(futureValueSimple);
		},
		/**
		 * Renames the labels in the variant names on the product variation rows
		 * after the name has changed in the manual variant name field
		 */
		onBlurVariantName: (e: React.FocusEvent<any>) => {
			// return if on simple mode
			if (this.state.formGroup.value.variants.simple) { return; }
	
			for (let varIdx = 0; varIdx < this.state.formGroup.value.variants.manual.length; varIdx++) {
				const vname = this.state.formGroup.value.variants.manual[varIdx];
				
				for (let pvIdx = 0; pvIdx < this.state.formGroup.value.productVariations.length; pvIdx++) {
					if (this.state.formGroup.value.productVariations[pvIdx].variationData.variants[varIdx].name !== vname) {
						this.state.formGroup.get('productVariations')
							.get(pvIdx.toString())
							.get('variationData')
							.get('variants')
							.get(varIdx.toString())
							.get('name')
							.setValue(vname);
					}
				}
			}
		},
		onChangeSimpleVariantsChips: () => {
			this.rebuildProductForVariationChange();
		}
	}

	/**
	 * Fields used in the app,
	 * it's an utility placeholder
	 */
	private jsxCache = {
		categoryField: InventoryCategoryController.getFormControl_AmtsField({}),
		variantType: FieldsFactory.getTextField_FormControl({
			label: 'Tipologia', 
			variant: 'outlined', 
			fullWidth: true,
			onBlur: this.handlers.onBlurVariantName,
		}),
		priceField: FieldsFactory.getPriceField_FormControl({
			margin: 'dense', 
			className: 'm-0', 
			label: '', 
			fullWidth: true, 
			variant: 'outlined', 
			InputProps: {startAdornment: <span>€&nbsp;</span>}
		}),
		refSellPrice: FieldsFactory.getPriceField_FormControl({
			margin: 'dense', 
			placeholder: 'Scontato',
			style: {margin: '4px 0 0 0'},
			label: '', 
			fullWidth: true, 
			variant: 'outlined', 
			InputProps: {startAdornment: <span>€&nbsp;</span>}
		}),
		supplier: FieldsFactory.getAmtsField_FormControl({
			canClearField: true,
			renderValue: SupplierController.formatName,
			onOpen: (e, c) => this.setState({targetSupplierFormControl: c}),
			amtsInput: {
				bePath: BePaths.suppliers,
				editor: AuthService.isAttributePresent(Attribute.addSuppliers) && SupplierEditor,
				choseFn: (supp: Supplier) => {
					if (this.state.targetSupplierFormControl) {
						if (supp) {
							this.state.targetSupplierFormControl.patchValue(new FetchableField(supp._id, ModelClass.Supplier, supp));
						} else {
							this.state.targetSupplierFormControl.patchValue(null);
						}
					}
				},
				infoConf: { columns: [{
					title: 'Cod.',
					data: '_progCode',
					searchOptions: { castToInt: true }
				}, {
					title: 'Nome',
					data: 'name',
				}] }
			},
			textFieldProps: {
				variant: 'outlined',
				fullWidth: true,
				label: 'Fornitore',
				margin: 'dense',
				style: {margin: 0}
			}
		}),
		barcode: (c: AbstractControl) => {
			// three parents up, this is because:
			// c = productVariations.[idx].infoData.barcode;
			//
			// we need to search the [idx] in productVariations
			const idx = (c.parent.parent.parent as FormArray).controls.indexOf(c.parent.parent);

			return (
				<div>
					{(c as FormArray).controls.length === 0 
						? (
							<Button fullWidth color='primary' data-mode='set' data-idx={idx} onClick={this.handlers.OpenBarcodePopover}>
								Automatico
							</Button>
						) 
						: (
							<>
								{(c as FormArray).controls.map((c, barIdx) => (
									<Box key={c.value || ('' + (c as FormArray).controls.length + barIdx)} display='flex' alignItems='center'>
										<IconButton size='small' data-idx={idx} data-barcode-idx={barIdx} onClick={this.handlers.RemoveBarcode}>
											<Close/>
										</IconButton>
										{c.value}
									</Box>
								))}
								<Button fullWidth size='small' color='primary' data-mode='add' data-idx={idx} onClick={this.handlers.OpenBarcodePopover}>
									Aggiungi +
								</Button>
							</>
						)
					}
				</div>
			)
		},
		// extra later added
		variantAutoValues: undefined as (fg: AbstractControl) => any,
		variantFgRender: undefined as (fg: AbstractControl) => any,
		variantSimpleToggle: undefined as (fg: AbstractControl) => any,
		variantToggle: undefined as (fg: AbstractControl) => any,
		variationTbody: undefined as (fg: AbstractControl) => any,
		variationTbodyRow: undefined as (fg: AbstractControl) => any,
		groupTags: undefined as (fg: AbstractControl) => any,
	}

	private barcodeSub: Subscription;
	componentWillUnmount() {
		if (this.barcodeSub) { this.barcodeSub.unsubscribe(); }
	}

	/**
	 * Updates the Product editor with the data from the chip pressed
	 */
	private setTags = (pv: ProductVariant['data']) => {
		this.state.formGroup.get('groupData').get('tags').patchValue(pv.value as string[]);
	}
	private setInternalTags = (pv: ProductVariant['data']) => {
		this.state.formGroup.get('groupData').get('internalTags').patchValue(pv.value as string[]);
	}

	/**
	 * Updates the Product editor with the data from the chip pressed
	 */
	private setVariationPv = (pv: ProductVariant['data']) => {

		this.clearVariantAndVariations();
		this.state.formGroup.get('variants').patchValue({enabled: true, simple: pv.type === ProductVarTypes.automatic});

		LoadingOverlay.loadingAsync(true).then(r => {

			if (pv.type === ProductVarTypes.automatic) {
				for (const v of pv.value) {
					(this.state.formGroup.get('variants').get('automatic') as FormArray).push(
						this.FCFactory.autoVar(v.name, v.values)
					);
				}
			}
			else if (pv.type === ProductVarTypes.manual) {
				for (const v of pv.value) {
					(this.state.formGroup.get('variants').get('manual') as FormArray).push(
						this.FCFactory.variant_Name(v)
					);
				}
			}

			this.rebuildProductForVariationChange();
			LoadingOverlay.loading = false;
		});
	}

	/**
	 * Updates the Product editor with the data from the chip pressed
	 */
	private setCategories = (pv: ProductVariant['data'], id: string) => {
		const ids = (pv.value as {id: string, name: string}[]).map(p => p.id);

		// remove old values
		this.clearCategories();

		// no ids so we delete it
		if (!ids[0]) {
			this.variantController.deleteSingle(id, {disableLoading: true}).then().catch(() => {});
			removeQuickSettingToLastUsed('category', id);
			return;
		}

		new InventoryCategoryController().getMulti({params: {filter: {_id: {$in: ids}}}})
		.then((is) => {

			const found: InventoryCategory[] = [];

			for (const i of ids) {
				const inv = is.data.find(inv => inv._id === i);
				if (inv)
					found.push(inv);
			}

			if (found[0])
				this.state.formGroup.get('groupData').get('category').patchValue(new FetchableField(found[0]._id, ModelClass.InventoryCategory, found[0]));

			// store the length as we later splice the array
			const foundLength = found.length;

			// add the additional ones
			if (found.length > 1)
				for (const f of found.splice(1))
					(this.state.formGroup.get('groupData').get('additionalCategories') as FormArray).push(new FormControl(new FetchableField(f._id, ModelClass.InventoryCategory, f)));

			// after all has been added if we have some not found items
			// we just update the given PV
			if (foundLength !== ids.length) {
				const newIds: ProductVariant['data']['value'] = found.map(f => ({id: f._id, name: f.name}));
				
				// if no items left we delete it
				// otherwise it's confusing seeing it there lol
				if (!newIds.length) {
					removeQuickSettingToLastUsed('category', id);
					this.variantController.deleteSingle(id, {disableLoading: true})
					.then().catch(() => {});
				}
				else {
					this.variantController.patch(id, [{op: 'set', path: 'data.value', value: newIds}], {disableLoading: true})
					.then().catch(() => {});
				}
			}

		});
		

	}
	

	private clearCategories() {
		// remove old values
		this.state.formGroup.get('groupData').get('category').patchValue(null);
		this.clearFormArray(this.state.formGroup.get('groupData').get('additionalCategories') as FormArray);
	}


	generateEditorSettings(p: ProductGroup): TopLevelEditorPart<ProductGroup>[] {

		// we assing an empty object after the generation
		// as the function to generate the additional form controls
		// requires no param in create mode
		// and requires an object in edit mode
		const addFC = this.generateFormControls(p);
		p = p || {} as any;

		return [
			// additional logic
			...(Object.keys(addFC).map(k => ({ 
				type: 'abstractControl', 
				logic: { key: k, control: addFC[k] }
			})) as TopLevelEditorPart<ProductGroup>[]),

			{
				type: 'jsx',
				component: () => <h2 className='m-0'>Informazioni Base</h2>,
			},
			{
				type: 'divider',
				gridProp: {className: 'p-0'},
			},
			{
				type: 'formGroup',
				logic: {
					key: 'groupData',
					parts: [
						{
							type: 'formControl',
							gridProp: {md: 4},
							logic: {
								required: true,
								component: 'TextField',
								label: 'Nome Prodotto',
								key: 'name'
							},
						},
						{
							type: 'formControl',
							gridProp: {md: 4},
							logic: {
								key: 'uniqueTags',
								component: (c: AbstractControl) => <ChipTextField label='Codici Prodotto Univoci' control={c as FormControl}/>,
							},
						},
						{
							type: 'formControl',
							gridProp: {md: 4},
							logic: {
								key: 'category',
								component: (c: AbstractControl) => {
									return (
										<>
											{InventoryCategoryController.getFormControl_AmtsField({InputProps: {
												endAdornment: (
													<div className='d-flex'>
														{c.value && (
															<IconButton onClick={this.handlers.RemoveMainCategory}><Close/></IconButton>
														)}
														{this.loadSavedVar && (
															<Button color='primary' onClick={this.handlers.LoadCategories}>Carica</Button>
														)}
														{c.value && this.saveNewVars && (
															<Button color='primary' onClick={this.handlers.SaveCategories} disabled={this.state.formGroup.get('variants').invalid}>Salva</Button>
														)}
													</div>
												)
											}})(c)}
											{!this.objFromBe && <QuickCachedSettings type='category' onChose={this.setCategories}/>}
										</>
									)
								},
							},
						},
						// add an empty spacer to offset the additional categories and get them in line with the main category
						{type: 'jsx', gridProp: {md: 8}, component: null},
						{
							type: 'formArray',
							gridProp: {md: 4},
							wrapRender: (r) => this.state.formGroup.value.groupData.category && r,
							logic: {
								key: 'additionalCategories',
								addBtn: '+ Categoria Aggiuntiva',
								parts: [{
									type: 'formControl',
									gridProp: {md: 12},
									logic: {
										key: '',
										component: this.jsxCache.categoryField,
									}
								}],
							},
						},
						{
							type: 'formControl',
							logic: {
								key: 'tags',
								component: (c: AbstractControl) => {
									return (
										<>
											<ChipTextField label='Tag Prodotto' control={c as FormControl} InputProps={{endAdornment: (
												<div>
													{this.loadSavedVar && (
														<Button color='primary' onClick={this.handlers.LoadTags}>Carica</Button>
													)}
													{c.value && c.value.length !== 0 && this.saveNewVars && (
														<Button color='primary' onClick={this.handlers.SaveTags} disabled={this.state.formGroup.get('variants').invalid}>Salva</Button>
													)}
												</div>
											)}}/>
											{!this.objFromBe && <QuickCachedSettings type='tag' onChose={this.setTags}/>}
										</>
									)
								},
							},
						},
						{
							type: 'formControl',
							logic: {
								key: 'type',
								component: 'SelectField',
								label: 'Tipologia',
								values: getProducttypeSelectValues(),
								value: p.groupData?.type || getProductType().product,
							}
						},
						{
							type: 'formControl',
							gridProp: {md: 12},
							logic: {
								key: 'description',
								label: 'Descrizione Breve',
								component: 'TextArea',
							}
						},
					],
				},
			},
			{type: 'divider',},
		];
	}
	
	/**
	 * Adds additional fieds after the locations fields
	 */
	protected addFields(editorSettings: TopLevelEditorPart<Product>[]) {
		super.addFields(editorSettings);

		editorSettings.push(
			{
				type: 'jsx',
				gridProp: {className: 'pt-0'},
				component: () => (
					<>
						{this.state.sameVariationsError && (
							<Box my={1} py={1} className='bg-error' textAlign='center' borderRadius='5px'>
								Sono presenti alcune variazioni prodotto uguali<br/>
								Per poter procedere, e' necessario rendere univoca ogni variazione
							</Box>
						)}
						<Box className='text-right'>
							<Button 
								variant={(this.props.modalRef || this.objFromBe) ? 'contained' : 'text'} 
								color='primary' 
								disabled={this.state.formGroup.invalid} 
								onClick={this.handlers.Save}
							>
								Salva
							</Button>

							{!this.props.modalRef && !this.objFromBe && (
								<Button 
									color='primary' 
									variant='contained' 
									disabled={this.state.formGroup.invalid} 
									onClick={this.handlers.SaveAndCreateAgain}
								>
									Salva e Crea Prossimo
								</Button>
							)}
						</Box>
					</>
				)
			},
			{ type: 'cut' },
			{
				type: 'jsx',
				component: () => (
					<FieldGroup
						control={this.state.formGroup.get('variants')}
						render={this.jsxCache.variantFgRender || (this.jsxCache.variantFgRender = (fg: AbstractControl) => (
							<>
								<Box display='flex' alignItems='center'>
									<FieldControl
										name='enabled'
										render={this.jsxCache.variantToggle || (this.jsxCache.variantToggle = 
											FieldsFactory.getSwitch_FormControl(
												{label: (<h2 className='m-0'>Varianti</h2>), onClick: this.handlers.onBeforeToggleVariantEnabled},
												{labelPlacement: 'start', className: 'm-0'},
											)
										)}
									/>

									<Box flexGrow={1}></Box>
									
									{this.loadSavedVar && (
										<Button color='primary' onClick={this.handlers.LoadVariantsPreset}>Carica</Button>
									)}
									{this.state.formGroup.value.variants.enabled && this.saveNewVars && (
										<Button color='primary' onClick={this.handlers.SaveVariantsPreset} disabled={this.state.formGroup.get('variants').invalid}>Salva</Button>
									)}
								</Box>
								
								{!this.objFromBe && <QuickCachedSettings containClassName='variant-container-quick-cache-selector' type='variant' onChose={this.setVariationPv}/>}

								{this.state.formGroup.value.variants.enabled && (
									<>
										<Divider/>
										<FieldControl
											name='simple'
											render={this.jsxCache.variantSimpleToggle || (this.jsxCache.variantSimpleToggle = 
												FieldsFactory.getSwitch_FormControl(
													{label: 'Modalità semplice', onClick: this.handlers.onBeforeToggleVariantSimpleMode},
													{labelPlacement: 'start', className: 'm-0'},
												)
											)}
										/>

										{this.state.formGroup.value.variants.simple 
											? (
												<Grid container spacing={2}>
													{(fg.get('automatic') as FormArray).controls.map((fc, idx) => (
														<React.Fragment key={'' + idx + (fg.get('automatic') as FormArray).controls.length}>
															<Grid item xs={12} md={4} className='d-flex'>
																{(fg.get('automatic') as FormArray).controls.length !== 1 && (
																	<Box mt={2} mr={1}>
																		<IconButton data-idx={idx} onClick={this.handlers.RemoveVariantType}>
																			<Delete/>
																		</IconButton>
																	</Box>
																)}
																<FieldControl
																	control={fc.get('name')}
																	render={this.jsxCache.variantType}
																/>
															</Grid>

															<Grid item xs={12} md={8}>
																<FieldControl
																	control={fc.get('values')}
																	render={this.jsxCache.variantAutoValues || (this.jsxCache.variantAutoValues = (c: AbstractControl) => 
																		<ChipTextField label='Valori' control={c as FormControl} onChange={this.handlers.onChangeSimpleVariantsChips}/>
																	)}
																/>
															</Grid>
														</React.Fragment>
													))}
												</Grid>
											) 
											: (
												<>
													{(fg.get('manual') as FormArray).controls.map((fc, idx) => (
														<Box key={'' + idx + (fg.get('manual') as FormArray).controls.length} className='d-flex'>
															{(fg.get('manual') as FormArray).controls.length !== 1 && (
																<Box mt={2} mr={1}>
																	<IconButton data-variant-idx={idx} onClick={this.handlers.RemoveVariantType}>
																		<Delete/>
																	</IconButton>
																</Box>
															)}
															<FieldControl
																control={fc}
																render={this.jsxCache.variantType}
															/>
														</Box>
													))}
												</>
											)
										}
										<div className='text-center'>
											<Button color='primary' onClick={this.handlers.AddVariantType}>+ Aggiungi Variante</Button>
										</div>
									</>
								)}
							</>
						))}
					/>
				)
			},
			{ type: 'cut' },
			{
				type: 'jsx',
				component: () => (
					<>
						<h2 className='m-0'>Configurazione Prodotto</h2>
						<Divider className='def-mui-divider'/>
						<TableContainer>
							<table className='spe-variations-table'>
								<thead>
									<tr>
										<th>Barcode</th>
										<th>{this.state.formGroup.value.variants.enabled && 'Variante'}</th>
										<th>Prezzo d'Acquisto</th>
										<th>Prezzo di Vendita</th>
										<th>Fornitore</th>
										<th>Immagine</th>
										<th>{/* Controls */}</th>
									</tr>

									{/* The first row contains the base variations */}
									<tr>
										<td>
											{!this.state.formGroup.value.variants.enabled && (
												<FieldArray
													control={this.state.formGroup.get('productVariations').get('0').get('infoData').get('barcode')}
													render={this.jsxCache.barcode}
												/>
											)}
										</td>
										<td>
											{/* Variants */}
										</td>
										<td>
											<FieldControl
												control={this.state.formGroup.get('baseVariation').get('buyPrice')}
												render={this.jsxCache.priceField}
											/>
										</td>
										<td>
											<FieldControl
												control={this.state.formGroup.get('baseVariation').get('sellPrice')}
												render={this.jsxCache.priceField}
											/>
											<br/>
											<FieldControl
												control={this.state.formGroup.get('baseVariation').get('refSellPrice')}
												render={this.jsxCache.refSellPrice}
											/>
										</td>
										<td>
											<FieldControl
												control={this.state.formGroup.get('baseVariation').get('supplier')}
												render={this.jsxCache.supplier}
											/>
										</td>
										<td>
											{!this.state.formGroup.value.variants.enabled && (
												<FieldControl
													control={this.state.formGroup.get('productVariations').get('0').get('infoData').get('images')}
													render={RawFilesFormControl}
												/>
											)}
										</td>
										<td>
											{/* Controls */}
										</td>
									</tr>

									{/* AUTOMATIC not generated values */}
									<tr>
										<td colSpan={7}>
											{this.state.formGroup.value.variants.autoNotGeneratedCombinations.map((v, idx) => (
												<Box my={1} key={v.variations.map(a => a.value).join(' / ')} display='flex' alignItems='center'>
													<span>La variante {v.variations.map(a => a.value).join(' / ')} non verra' generata.</span>
													<Button size='small' color='primary' data-idx={idx} onClick={this.handlers.RestoreAutoVar}>Annulla</Button>
												</Box>
											))}
										</td>
									</tr>

									{/* Add variation button for manual variations */}
									<tr>
										<td colSpan={7}>
											{(this.state.formGroup.value.variants.enabled && !this.state.formGroup.value.variants.simple) && (
												<Box textAlign='center' my={2}>
													<Button color='primary' onClick={this.handlers.AddVariation}>
														+ Aggiungi Variazione
													</Button>
												</Box>
											)}
										</td>
									</tr>

								</thead>

								<tbody>
									{/* 
										We use an IIFE here because we have some perfomance issues when there are a lot of automatic variants if we
										add the variants with FormArray.push()

										so instead we add them by replacing the whole FormArray at once\
										this.state.formGroup.setControl('productVariations', new FormArray(formGroups));

										but this deletes the original FormArray, thus we cannot use a <FieldArray control={this.state.formGroup.get('productVariations')}/>
										because that <FieldArray/> will point to the old FormArray

										so instead each render() we get the FormArray manually

										we could use <FieldArray name='productVariations'/> but idk why it's broken for the same reason we cant do this.state.formGroup.get('productVariations.0.variationData') 
									*/}
									{(() => {
										const fa = this.state.formGroup.get('productVariations');
										const controls = (fa as FormArray).controls;
										const toR = [];

										for (let idx = 0; idx < controls.length; idx++) {
											
											// the first item is already set as the base variation
											if (!this.state.formGroup.value.variants.enabled && idx === 0) { continue; }


											toR.push(
												<tr key={"" + controls[idx].value.__jsx_id + idx}>
													<FieldGroup
														control={controls[idx]}
														render={this.jsxCache.variationTbodyRow || (this.jsxCache.variationTbodyRow = (c: (Omit<AbstractControl, 'value'> & {value: IFormGroupValue['productVariations'][0]})) => {
															const cIdx = (c.parent as FormArray).controls.indexOf(c);
															return (
																<>
																	<td>
																		<FieldArray
																			control={c.get('infoData').get('barcode')}
																			render={this.jsxCache.barcode}
																		/>
																	</td>
																	
																	<td>
																		{
																			!this.state.formGroup.value.variants.enabled 
																			? (null) 

																			: this.state.formGroup.value.variants.simple
																			? (	
																				<Box mt={1} textAlign='center'>
																					{(c.value as IFormGroupValue['productVariations'][0]).variationData.variants.map(v => v.value).join(' / ')}
																				</Box>
																			)

																			: (
																				c.get('variationData').get('variants') as FormArray).controls.map((vc, idx) => (
																					<Box key={'' + idx + vc.value.name} mt={1} textAlign='center'>
																						<FieldControl
																							control={vc.get('value')}
																							render={FieldsFactory.getTextField_FormControl({
																								margin: 'none',
																								size: 'small',
																								variant: 'outlined',
																								fullWidth: true,
																								label: vc.value.name
																									? vc.value.name.length > 8 
																										? vc.value.name.substr(0, 6) + '...' 
																										: vc.value.name
																									: '',
																							})}
																						/>
																					</Box>
																				)
																			)
																		}
																	</td>

																	<td>
																		{c.value.separatedVariations.buyPrice 
																			? (
																				<FieldControl
																					name='variationData.buyPrice'
																					render={this.jsxCache.priceField}
																				/>
																			) 
																			: (
																				<div className='text-center'>
																					<Button data-idx={cIdx} data-control-key={'buyPrice'} onClick={this.handlers.SeparateVariationField}>
																						<Add/>
																					</Button>
																				</div>
																			)
																		}
																	</td>

																	<td>
																		{c.value.separatedVariations.sellPrice 
																			? (
																				<>
																					<FieldControl
																						name='variationData.sellPrice'
																						render={this.jsxCache.priceField}
																					/>
																					<br/>
																					<FieldControl
																						name='infoData.refSellPrice'
																						render={this.jsxCache.refSellPrice}
																					/>
																				</>
																			) 
																			: (
																				<div className='text-center'>
																					<Button data-idx={cIdx} data-control-key={'sellPrice'} onClick={this.handlers.SeparateVariationField}>
																						<Add/>
																					</Button>
																				</div>
																			)
																		}
																	</td>

																	<td>
																		{c.value.separatedVariations.supplier 
																			? (
																				<FieldControl
																					name='variationData.supplier'
																					render={this.jsxCache.supplier}
																				/>
																			) 
																			: (
																				<div className='text-center'>
																					<Button data-idx={cIdx} data-control-key={'supplier'} onClick={this.handlers.SeparateVariationField}>
																						<Add/>
																					</Button>
																				</div>
																			)
																		}
																	</td>

																	<td>
																		<FieldControl
																			name='infoData.images'
																			render={RawFilesFormControl}
																		/>
																	</td>
																</>
															)
														})}
													/>
													<td>
														<Tooltip title='Aggiungi o Rimuovi campi da sovrascrivere'>
															<IconButton size='small' data-idx={idx} onClick={this.handlers.OpenSeparateVarMenu}>
																<ClearAll/>
															</IconButton>
														</Tooltip>
														<Tooltip title='Duplica'>
															<IconButton size='small' data-idx={idx} onClick={this.handlers.DuplicateProductVariation}>
																<Queue/>
															</IconButton>
														</Tooltip>
														<Tooltip title='Rimuovi variazione prodotto'>
															<IconButton size='small' data-idx={idx} onClick={this.handlers.RemoveProductVariation}>
																<Delete/>
															</IconButton>
														</Tooltip>
													</td>
												</tr>
											);
										}
								
										return toR;
									})()}
								</tbody>
							</table>
						</TableContainer>
					</>
				),
			},
			{ type: 'cut' },
			{
				type: 'jsx',
				component: () => (
					<>
						<h2 className='m-0'>Sincronizzazione esterna</h2>
						<Divider className='def-mui-divider'/>
						{
							(this.state.formGroup.get('externalSync') as FormArray).controls.length === 0
							? "Non ci sono collegamenti esterni attivi. Per connettere un sito al sistema andare nell'aposita pagina di configurazione"

							: (
								<div>
									Seleziona i punti con i quali sincronizzare questo prodotto
									<br/>
									{(this.state.formGroup.get('externalSync') as FormArray).controls.map(ec => (
										<div key={ec.value.id}>
											{FieldsFactory.getSwitch_FormControl({label: ec.value.name}, {labelPlacement: 'start'})(ec.get('enabled'))}
										</div>
									))}
								</div>
							)
						}
					</>
				),
			}
		);

	}

	/**
	 * Add utility items
	 */
	render() {
		return (
			<>
				{/* barcodepopover */}
				<Popover
					open={this.state.barcodePopover?.open}
					anchorEl={this.state.barcodePopover?.anchor}
					onClose={this.handlers.CloseBarcodePopover}
					anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
					transformOrigin={{vertical: 'top', horizontal: 'center'}}
				>
					{this.state.barcodePopover && 
						this.state.barcodePopover.mode === 'set' 
						// set barcode mode
						? (
							<Box textAlign='center' p={2}>
								<Typography variant='h6'>
									Scannerizza il barcode
								</Typography>
								oppure<br/>
								<Button color='primary' onClick={this.handlers.ClearBarcodes}>
									Assegna automaticamente
								</Button>
								<br/>oppure<br/>
								<form onSubmit={this.handlers.manualBarcodeInputForm}>
									<FieldsFactory.TextField variant='outlined' label='Digita manualmente'/>
									<br/>
									<Button color='primary' type='submit'>
										Conferma
									</Button>
								</form>
							</Box>
						) 
						// add another barcode mode
						: (
							<Box p={2}>
								<Box textAlign='center' mb={1}>
									<Typography variant='h6'>
										Scannerizza il barcode da aggiungere
									</Typography>
									oppure<br/>
									<form onSubmit={this.handlers.manualBarcodeInputForm}>
										<FieldsFactory.TextField variant='outlined' label='Digita manualmente'/>
										<br/>
										<Button color='primary' type='submit'>
											Conferma
										</Button>
									</form>
								</Box>
								<Box textAlign='right'>
									<Button color='primary' onClick={this.handlers.CloseBarcodePopover}>
										Chiudi
									</Button>
								</Box>
							</Box>
						)
					}
				</Popover>


				<Menu
					open={this.state.productVariantFieldControlMenu?.open}
					anchorEl={this.state.productVariantFieldControlMenu?.anchor}
					onClose={this.handlers.CloseSeparateVarMenu}
				>
					<MenuItem data-idx={this.state.productVariantFieldControlMenu?.prodIdx} data-control-key={'buyPrice'} onClick={this.handlers.SeparateVariationField}>
						Prezzo d'acquisto
					</MenuItem>
					<MenuItem data-idx={this.state.productVariantFieldControlMenu?.prodIdx} data-control-key={'sellPrice'} onClick={this.handlers.SeparateVariationField}>
						Prezzo di vendita
					</MenuItem>
					<MenuItem data-idx={this.state.productVariantFieldControlMenu?.prodIdx} data-control-key={'supplier'} onClick={this.handlers.SeparateVariationField}>
						Fornitore
					</MenuItem>
				</Menu>

				
				{super.render()}
			</>
		)
	}
	
}


function ChipTextField(p: {control: FormControl, onChange?: (chips: string[]) => void} & (Pick<OutlinedTextFieldProps, 'label' | 'InputProps'>)) {
	
	const { control, onChange, label, ...others } = p;

	const emitChips = (chips: string[]) => {
		control.onChange(chips);
		
		if (onChange)
			onChange(chips);
	};

	const onAdd = (chip: string) => {
		emitChips([...(control.value || []), chip.trim()]);
	};

	const onDelete = (chip: string, idx: number) => {
		const arr = [...(control.value || [])];
		arr.splice(idx, 1);
		emitChips(arr);
	};

	return (
		<ChipInput
			value={(control.value || [])}
			fullWidth
			label={label}
			className='fix_chip_input'
			margin='normal'
			onAdd={onAdd}
			onDelete={onDelete}
			error={p.control.invalid}
			variant='outlined'
			{...others}
		/>
	)
}



import './priced-rows.css';
import { FormGroup, FormArray, FieldControl, AbstractControl, FormControl, Validators } from 'react-reactive-form';
import React from 'react';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import Delete from '@material-ui/icons/Delete';
import { TopLevelEditorPart, SmallUtils, FieldsFactory,  DataFormatterService, Datatable, IMongoDBFetch, DTProps, IEditorLogicPart, FetchableField, AmtsFieldProps } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import Paper from '@material-ui/core/Paper';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { PricedRow, PricedRowsModel, PricedRowsModelForm } from './priced-rows.dtd';
import { PricedRowsEditorLogic } from './priced-rows.editor.logic';
import { MovementMedium, MovementMediumLabel, MovementMediumMenuLabel } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/Movement';
import { ProductsJsxRender } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/products-render';
import { MultipUserController } from 'apps/modules/sixempress/multip-core/frontend/src/base-components/users/multip-user-controller';
import { SupplierController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.controller';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Supplier } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/Supplier';

export abstract class PricedRowsEditor<T extends PricedRowsModelForm<any>> extends PricedRowsEditorLogic<T> {

	// set this value to:
	// ...PricedRowsController.getSaleableModelFetchField(),
	abstract fieldsToFetch: IMongoDBFetch<T>[];

	protected allowPriceEdit = true;

	private jsxCache = {
		renderList: undefined as (fg: AbstractControl) => JSX.Element | JSX.Element[],
		numberField: FieldsFactory.getNumberField_FormControl({
			margin: 'dense', 
			className: 'm-0',
			label: '', 
			fullWidth: true, 
			variant: 'standard',
		}),
		priceField: FieldsFactory.getPriceField_FormControl({
			margin: 'dense', 
			className: 'm-0',
			label: '', 
			fullWidth: true, 
			variant: 'standard',
			InputProps: {startAdornment: <span>€&nbsp;</span>}
		}),
		// supplier: FieldsFactory.getAmtsField_FormControl<Supplier>(SupplierController.AmtsFieldProps(( ) => {})),
		autoSizeTextAreaManualRowDescription: undefined,
		canAddProducts: AuthService.isAttributePresent(Attribute.viewProducts),
	}

	private handlers = {
		// add row
		onClickAddNewRow: (e: React.MouseEvent<any>) => {
			this.addRow();
		},
		// remove row
		onClickRemoveRow: (e: React.MouseEvent<any>) => {
			const rowIdx = +e.currentTarget.dataset.rowIdx;
			this.getFgListControlObject().removeAt(rowIdx);
		},
		// enable barcode on the row
		onClickSetListenBarcode: (e: React.MouseEvent<any>) => {
			const rowIdx = +e.currentTarget.dataset.rowIdx;
			this.setListenBarcode(rowIdx);
		},
		// add manual to list
		onClickAddManual: (e: React.MouseEvent<any>) => {
			const rowIdx = +e.currentTarget.dataset.rowIdx;
			this.FCLogic.getFA(rowIdx, 'manual').push(this.FCLogic.manualFG());
		},
		// add products to list
		onClickAddProducts: (e: React.MouseEvent<any>) => {
			const rowIdx = +e.currentTarget.dataset.rowIdx;
	
			new ProductController().openSelectDt(
				'detailed', 
				(ids) => this.addProductModelToList(rowIdx, ids.map(i => ({id: i}))), 
			);
		},
		onClickRemoveItem: (e: React.MouseEvent<any>) => {
			const rowIdx = +e.currentTarget.dataset.rowIdx;
			const itemIdx = +e.currentTarget.dataset.itemIdx;
			const field = e.currentTarget.dataset.field;

			const list = this.getFgListControlObject().at(rowIdx) as FormGroup;
			const fa = list.get(field) as FormArray;
			
			// remove last or empty
			if (!fa || fa.controls.length < 2)
				list.removeControl(field)
			// remove the index
			else
				fa.removeAt(itemIdx);
		}
	}

	/**
	 * Adds the additional fields for the modal
	 */
	protected addFields(tor: TopLevelEditorPart<T>[]) {
		const val = this.objFromBe || {} as T;

		// add date
		if (!tor.some(p => (p as IEditorLogicPart<T>).logic?.key === 'date')) {
			tor.push({
				type: 'abstractControl',
				logic: {
					key: 'date',
					control: new FormControl(val.date || Math.floor(new Date().getTime() / 1000)),
				}
			});
		}

		// add end date
		if (!tor.some(p => (p as IEditorLogicPart<T>).logic?.key === 'endDate')) {
			tor.push({
				type: 'abstractControl',
				logic: {
					key: 'endDate',
					control: new FormControl(val.endDate),
				}
			});
		}

		// add whole list
		tor.push(
			{ type: 'cut' },
			{
				type: "formControl",
				gridProp: {md: 12},
				logic: {
					key: "list",
					control: this.listToFormArray(val),
					component: (c) => this.renderList(c as FormArray) as JSX.Element,
				}
			},
			{ type: 'cut', usePaperForBeforeCut: false, },
			{
				type: 'abstractControl',
				logic: {
					key: 'totalPrice',
					control: new FormControl(null),
				},
			},
			!this.allowPriceEdit ? null : {
				type: 'formGroup',
				wrapRender: (r) => (
					<>
						<h3 className='m-0'>Tot. Calcolato: {DataFormatterService.centsToBigNumber(this.getCalculatedTotal(this.state.formGroup.value))}</h3>
						{r}
					</>
				),
				logic: {
					key: '_totalPriceControl',
					parts: [
						{
							type: 'formControl',
							gridProp: {xs: 12, md: 12},
							wrapRender: (r) => !this.state.formGroup.value._totalPriceControl.percentageMode ? null : (
								<Box display='flex' alignItems='center'>
									<Box width='10em'>
										{r} 
									</Box>
									<Box pl={2} whiteSpace='nowrap'>
										Tot.: {DataFormatterService.centsToScreenPrice(this.getPercentageTotal(this.state.formGroup.value._totalPriceControl.percentage || 0))}
									</Box>
								</Box>
							),
							logic: {
								key: 'percentage',
								component: 'NumberField',
								label: 'Sconto %',
								min: 0,
								max: 100,
							}
						},
						{
							type: 'formControl',
							gridProp: {xs: 12, md: 12},
							wrapRender: (r) => this.state.formGroup.value._totalPriceControl.percentageMode ? null : r,
							logic: {
								key: 'manual',
								component: 'PriceField',
								label: 'Prezzo Manuale',
								control: new FormControl(val.totalPrice === this.getCalculatedTotal(val) ? undefined : val.totalPrice, Validators.pattern(SmallUtils.fullPriceRegex))
							},
						},
						{
							type: 'formControl',
							gridProp: {xs: 12, md: 12},
							logic: {
								key: 'percentageMode',
								component: 'Checkbox',
								label: 'Sconta in %',
							}
						},
					]
				}
			},
			{
				type: 'formArray',
				gridProp: {md: 6},
				wrapRender: (r) => (
					<>
						<h3 className='m-0'>Pagamenti</h3>
						{r}
					</>
				),
				logic: {
					key: 'payments',
					getRowValueForControl: (v) => v || {date: Math.floor(new Date().getTime() / 1000)},
					parts: [
						{
							type: 'formControl',
							gridProp: {md: 6},
							logic: {
								component: 'DateTimePicker', 
								key: 'date', 
								label: 'Data', 
								required: true,
							},
						},
						{
							type: 'formControl',
							gridProp: {md: 4, xs: 8},
							logic: {
								component: 'PriceField', 
								key: 'amount', 
								label: 'Eur', 
								required: true,
							},
						},
						{
							type: 'formControl',
							gridProp: {md: 2, xs: 4},
							logic: {
								controlFnFormArray: (v) => new FormControl(!v || typeof v.medium === 'undefined' ? MovementMedium.unspecified : v.medium, Validators.required),
								component: 'SelectField',
								key: 'medium',
								label: 'Modo',
								props: {className: 'select-field-icon'},
								required: true,
								values: Object.values(MovementMedium).filter(m => typeof m === 'number').map(m => ({
									value: m,
									label: MovementMediumMenuLabel[m],
									menuLabel: MovementMediumLabel[m],
								})), 
							},
						},
					]
				}
			}
		);

		super.addFields(tor);
	}

	private renderList(control: FormArray) {

		const Wrapper = this.props.modalRef ? Paper : React.Fragment;
		return (
			<>
				<Wrapper className='def-box'>
					<h2 className='mt-0 text-center text-main'>Lista Costi</h2>
				</Wrapper>
				{control.controls.map(this.renderSingleRow as (c: AbstractControl, idx: number) => JSX.Element)}
				<Wrapper>
					<div className='text-center'>
						<Button color='primary' onClick={this.handlers.onClickAddNewRow}>+ Nuova riga</Button>
					</div>
				</Wrapper>
			</>
		);
	}

	private renderSingleRow = (control: FormGroup, rowIdx: number) => {
		const val: PricedRow = control.value;
		// TODO parametrize this
		const editable = true;

		return (
			<React.Fragment key={'' + control.controls.length + rowIdx}>
				<Paper className='def-box square-bottom mb-0 bb-0'>
					<div className='priced-rows-single-row'>
						<div className='priced-row-header'>
							<div>
								{editable && this.enabledItems.products && (
									<FieldsFactory.Switch
										label="Barcode"
										data-row-idx={rowIdx}
										checked={rowIdx === this.state.listenBarcodeIdx}
										onClick={this.handlers.onClickSetListenBarcode}
									/>
								)}
							</div>
							<div>
								<span>
									{MultipUserController.formatName(val._meta ? val._meta._author : AuthService.currentUser)}
									<div>
										{DataFormatterService.formatUnixDate((val.date) || Math.floor(new Date().getTime() / 1000))}
									</div>
								</span>
								{editable && (<IconButton onClick={this.handlers.onClickRemoveRow} data-row-idx={rowIdx}><Delete/></IconButton>)}
							</div>
						</div>

						{this.renderProductsTable(rowIdx, editable, control.get('products') as FormArray)}
						{this.renderServicesTable(rowIdx, editable, control.get('apps/modules/sixempress/multip-core/frontend/src/services') as FormArray)}
						{this.renderManualTable(rowIdx, editable, control.get('manual') as FormArray)}
					</div>
				</Paper>
				<Paper className='def-box square-top mt-0 pt-0 pb-0'>
					{editable && (
						<div className='row-buttons-container'>
							{this.enabledItems.products && this.jsxCache.canAddProducts && (
								<Button color='primary' onClick={this.handlers.onClickAddProducts} data-row-idx={rowIdx}>+ Prodotti</Button>
							)}
							{this.enabledItems.manual && (
								<Button color='primary' onClick={this.handlers.onClickAddManual} data-row-idx={rowIdx}>+ Manuale</Button>
							)}
						</div>
					)}
				</Paper>
			</React.Fragment>
		);
	}

	protected renderServicesTable(rowIdx: number, editable: boolean, formArray?: FormArray): JSX.Element {
		return this.renderTable('apps/modules/sixempress/multip-core/frontend/src/services', formArray, [
			{
				title: '',
				data: '',
				orderable: false,
				search: false,
				className: 'w-1',
				render: !editable ? undefined : (d, m) => (
					<IconButton size='small' onClick={this.handlers.onClickRemoveItem} data-row-idx={rowIdx} data-item-idx={m.__idx} data-field={'apps/modules/sixempress/multip-core/frontend/src/services'}>
						<Close/>
					</IconButton>
				)
			},
			{
				title: 'Nome',
				data: 'item.fetched.groupData.name',
			},
			{
				title: '€ Costi Interni',
				data: 'item.fetched.variationData.buyPrice',
				render: d => typeof d === 'undefined' ? d : DataFormatterService.centsToScreenPrice(d)
			},
			{
				title: '€ Vendita',
				data: 'item.fetched.variationData.sellPrice',
				render: DataFormatterService.centsToScreenPrice
			},
			{
				title: 'Quantita\'',
				data: 'amount',
				render: !editable ? undefined : (d, m) => (
					<FieldControl
						control={formArray.at(m.__idx).get('amount')}
						render={this.jsxCache.numberField}
					/>
				)
			},
		]);
	}

	protected renderProductsTable(rowIdx: number, editable: boolean, formArray?: FormArray): JSX.Element {
		return this.renderTable('products', formArray, [
			{
				title: '',
				data: '',
				orderable: false,
				search: false,
				className: 'w-1',
				render: !editable ? undefined : (d, m) => (
					<IconButton size='small' onClick={this.handlers.onClickRemoveItem} data-row-idx={rowIdx} data-item-idx={m.__idx} data-field={'products'}>
						<Close/>
					</IconButton>
				)
			},
			{
				title: 'Nome',
				data: 'item.fetched.groupData.name',
				render: (n, m) => ProductsJsxRender.formatFullProductName(m.item.fetched),
			},
			{
				title: 'Fornitore',
				data: 'item.fetched.variationData.supplier.fetched._progCode',
				render: (!editable || !this.canEditVariants) ? (d, m: PricedRow['products'][0]) => SupplierController.formatName(m.item.fetched.variationData.supplier) : (d, m) => (
					<FieldControl
						control={formArray.at(m.__idx).get('newVariation').get('supplier')}
						render={FieldsFactory.getAmtsField_FormControl(SupplierController.AmtsFieldProps((supp) => {
							formArray.at(m.__idx).get('newVariation').get('supplier').patchValue(supp ? new FetchableField(supp._id, ModelClass.Supplier, supp) : null);
						}, {margin: 'dense', className: 'm-0'}) as AmtsFieldProps<Supplier>)}
					/>
				)
			},
			{
				title: '€ Acquisto',
				data: 'item.fetched.variationData.buyPrice',
				render: (!editable || !this.canEditVariants) ? DataFormatterService.centsToScreenPrice : (d, m) => (
					<FieldControl
						control={formArray.at(m.__idx).get('newVariation').get('buyPrice')}
						render={this.jsxCache.priceField}
					/>
				)
			},
			{
				title: '€ Vendita',
				data: 'item.fetched.variationData.sellPrice',
				render: (!editable || !this.canEditVariants) ? DataFormatterService.centsToScreenPrice : (d, m) => (
					<FieldControl
						control={formArray.at(m.__idx).get('newVariation').get('sellPrice')}
						render={this.jsxCache.priceField}
					/>
				)
			},
			{
				title: 'Quantita\'',
				data: 'amount',
				render: !editable ? undefined : (d, m) => (
					<FieldControl
						control={formArray.at(m.__idx).get('amount')}
						render={this.jsxCache.numberField}
					/>
				)
			},
		]);
	}

	protected renderManualTable(rowIdx: number, editable: boolean, formArray?: FormArray): JSX.Element {
		return this.renderTable('manual', formArray, [
			{
				title: '',
				data: '',
				orderable: false,
				search: false,
				className: 'w-1',
				render: !editable ? undefined : (d, m) => (
					<IconButton size='small' onClick={this.handlers.onClickRemoveItem} data-row-idx={rowIdx} data-item-idx={m.__idx} data-field={'manual'}>
						<Close/>
					</IconButton>
				)
			},
			{
				title: 'Descrizione',
				data: 'description',
				render: !editable ? undefined : (d, model) => <FieldControl
					control={formArray.at(model.__idx).get("description")}
					render={this.jsxCache.autoSizeTextAreaManualRowDescription || (this.jsxCache.autoSizeTextAreaManualRowDescription = 
						FieldsFactory.getTextArea_FormControl({margin: 'none', size: 'small', label: "", multiline: true, rows: undefined, fullWidth: true})
					)}
				/>
			},
			{
				className: 'w-1',
				title: '€ Costi Interni',
				data: 'buyPrice',
				render: !editable ? undefined : (d, model) => <FieldControl
					control={formArray.at(model.__idx).get("buyPrice")}
					render={this.jsxCache.priceField}
				/>
			},
			{
				className: 'w-1',
				title: '€ Vendita',
				data: 'sellPrice',
				render: !editable ? undefined : (d, model) => <FieldControl
					control={formArray.at(model.__idx).get("sellPrice")}
					render={this.jsxCache.priceField}
				/>
			},
		]);
	}

	private renderTable(tableKey: string, formArray: FormArray, columns: DTProps<any>['columns']) {
		if (!formArray?.length)
			return;

		const data = formArray.value as any[];
		for (let i = 0; i < data.length; i++)
			data[i].__idx = i;

		return (
			<div className={'def-box-expand priced-rows-dt priced-rows-dt-' + tableKey}  key={tableKey + data.length}>
				<Datatable data={data} columns={columns} sortAndProcessData disablePagination />
			</div>
		);
	}

}

import React from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import Popover from '@material-ui/core/Popover';
import Close from '@material-ui/icons/Close';
import Backdrop from '@material-ui/core/Backdrop';
import Typography from '@material-ui/core/Typography';
import { FormArray, FieldControl, FieldGroup, FormGroup, FieldArray, FormControl,} from 'react-reactive-form';
import {   FieldsFactory,  FetchableField, AmtsFieldProps, CodeScannerService, DataFormatterService, BusinessLocationsService } from '@sixempress/main-fe-lib';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { SupplierEditor } from '../../../../suppliers/supplier.editor';
import { Supplier } from '../../../../suppliers/Supplier';
import { ProductTableEditorLogic } from "./product-table-editor.logic";

import { Subscription } from 'rxjs';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { CodeScannerEventsActiveStatus } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-active-status';
import { InventoryCategoryController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/inventory-categories/InventoryCategory.controller';

export class ProductTableEditor extends ProductTableEditorLogic {

	private locations = BusinessLocationsService.getLocationsFilteredByUser(false);

	private addProductToListHandler = (e?: any) => this.addNewProduct();
	private removeProductFromListHandler = (gId: string, pId: string) => (e?: any) => this.removeProduct(gId, pId);

	private saveBtnHandler = (e?: any) => this.save();

	private toggleSelectedHandler = (idx: number) => (e?: any) => 
		this.setState(s => {
			s.products[idx].selected = !s.products[idx].selected;
			this.updateMultiSelectValues(s);
			return s;
		})

	private selectAllHandler = (e?: any) => 
		this.setState(s => {
			const newValue = this.state.products.filter(p => p.selected).length === this.state.products.length 
				? false
				: true;
			s.products.forEach(p => p.selected = newValue);
			
			this.updateMultiSelectValues(s);
			return s;
		})

	
	/**
	 * This is a function that updates the values on the selected rows when the global values changes
	 */
	private updateAllSelectedField(globalField: keyof this['state']['multiSelectValues'], formField: string, value: any) {
		
		// update global
		this.setState({multiSelectValues: {...this.state.multiSelectValues, [globalField]: (value || value === 0) ? value : ''}});

		// update for each product
		for (const p of this.state.products) {
			if (p.selected) {
				p.form.get(formField).setValue(value);
			}
		}
		
	}


	render() {

		const numSelected = this.state.products.filter(p => p.selected).length;
		const rowCount = this.state.products.length;
		
		return (
			<>


				{this.savingProgressOverlay()}
				{this.getBarcodePopover()}

				<Paper>
					<Box mb={2} p={2} display='flex' alignItems='center' flexWrap='wrap'>
						<Box flexGrow={1}>
							Tot.Elementi: {this.state.products.length}
						</Box>
						<Button variant='contained' color='primary' disabled={!this.state.canSave} onClick={this.saveBtnHandler}>
							Conferma
						</Button>
					</Box>
				</Paper>
				<Paper>
					<Box p={2}>

						<Table size='small' className='nowrap'>
							<TableHead>
								<TableRow style={{height: '51px'}}>
									<TableCell padding="checkbox" style={{position: 'relative'}}>
										{rowCount > 0 && (
											<Checkbox
												indeterminate={numSelected > 0 && numSelected < rowCount}
												checked={rowCount > 0 && numSelected === rowCount}
												onChange={this.selectAllHandler}
											/>
										)}
									</TableCell>
									{numSelected === 0 ? (
										<>
											<TableCell>Nome</TableCell>
											<TableCell>Categoria</TableCell>
											<TableCell>Fornitore</TableCell>
											<TableCell>€ Acquisto</TableCell>
											<TableCell>€ Vendita</TableCell>
											<TableCell>Barcode</TableCell>
											{this.locations.length !== 1 && (
												<TableCell>Visibilita'</TableCell>
											)}
										</>
									) : (
										<>
											<TableCell>
												<FieldsFactory.TextField
													label={"Nome"}
													size={'small'}
													margin={'none'}
													
													value={this.state.multiSelectValues.name}
													onChange={(e) => this.updateAllSelectedField('name', 'groupData.name', e.currentTarget.value)}
												/>
											</TableCell>
											<TableCell>
												<InventoryCategoryController.AmtsField
													onChange={c => this.updateAllSelectedField('category', 'groupData.category', c ? new FetchableField(c._id, ModelClass.InventoryCategory, c) : null)}
													value={this.state.multiSelectValues.category ? this.state.multiSelectValues.category.fetched.name : ''}
													size={'small'}
													margin={'none'}
												/>
											</TableCell>
											<TableCell>
												<FieldsFactory.AmtsField
													{...this.getSupplierAmtsConfig(
														(supplier) => this.updateAllSelectedField('supplier', 'models.0.variationData.supplier', supplier),
														{ label: "Fornitore", size: 'small', margin: 'none', value: this.state.multiSelectValues.supplier, }
													)}
												/>
											</TableCell>
											<TableCell>
												<FieldsFactory.PriceField
													label={"€ Acquisto"}
													size={'small'}
													margin={'none'}
													value={this.state.multiSelectValues.buyPrice}
													onChange={(e) => this.updateAllSelectedField('buyPrice', 'models.0.variationData.buyPrice', e.currentTarget.value)}
												/>
											</TableCell>
											<TableCell>
												<FieldsFactory.PriceField
													label={"€ Vendita"}
													size={'small'}
													margin={'none'}

													value={this.state.multiSelectValues.sellPrice}
													onChange={(e) => this.updateAllSelectedField('sellPrice', 'models.0.variationData.sellPrice', e.currentTarget.value)}
												/>
											</TableCell>
											<TableCell>Barcode</TableCell>
											{this.locations.length !== 1 && (
												<TableCell>
													<FieldsFactory.MultiSelectField
														values={this.docVisVals}
														label={"Visibilita'"}
														margin={'none'}
														SelectDisplayProps={{style: {padding: '0.5em 3em 0.5em 0.2em'}}}

														value={this.state.multiSelectValues.visibility}
														onChange={(e) => this.updateAllSelectedField('visibility', 'documentLocationsFilter', e.target.value)}
													/>
												</TableCell>
											)}
										</>
									)}
									
									<TableCell padding="checkbox"/>
								</TableRow>
							</TableHead>

							<TableBody>
								{this.state.products.map((gForm, idx) => (
									<TableRow key={gForm.form.value._id}>
										<TableCell padding="checkbox">
											<Checkbox checked={gForm.selected} onClick={this.toggleSelectedHandler(idx)}/>
										</TableCell>

										<FieldGroup
											control={gForm.form}
											render={this.renderRowFormGroup(gForm.form as FormGroup, idx)}
										/>

										<TableCell padding="checkbox">
											<IconButton size='small' onClick={this.removeProductFromListHandler(gForm.form.value._id, gForm.form.value.models[0]._id)}>
												<Close/>
											</IconButton>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						<Box mt={1}>
							<Button onClick={this.addProductToListHandler} color='primary' size='small' >+ Aggiungi modello</Button>
						</Box>

					</Box>
				</Paper>
			</>
		);
	}




	private renderRowFormGroup(p: FormGroup, idx: number) {
		const model = p.get('models.0');
		
		return () => (
			<>
				{/* NAME */}
				<TableCell>
					<FieldControl
						control={p.get('groupData.name')}
						render={FieldsFactory.getTextField_FormControl({variant: "standard", margin: 'none', placeholder: 'Nome'}) as any}
					/>
				</TableCell>
				
				{/* CATEGORY */}
				<TableCell>
					<FieldControl
						control={p.get('groupData.category')}
						render={InventoryCategoryController.getFormControl_AmtsField({})}
					/>
				</TableCell>

				{/* SUPPLIER */}
				<TableCell>
					<FieldControl
						control={model.get('variationData.supplier')}
						render={FieldsFactory.getAmtsField_FormControl(
							this.getSupplierAmtsConfig(
								(s) => model.get('variationData.supplier').setValue(s),
							)
						) as any}
					/>
				</TableCell>

				{/* BUYPRICE */}
				<TableCell>
					<FieldControl
						control={model.get('variationData.buyPrice')}
						render={FieldsFactory.getPriceField_FormControl({
							variant: 'standard', 
							margin: 'none', 
							placeholder: '€ Acquisto', 
						}) as any}
					/>
				</TableCell>

				{/* SELLPRICE */}
				<TableCell>
					<FieldControl
						control={model.get('variationData.sellPrice')}
						render={FieldsFactory.getPriceField_FormControl({
							variant: 'standard', 
							margin: 'none', 
							placeholder: '€ Vendita', 
						}) as any}
					/>
				</TableCell>

				{/* BARCODE */}
				<TableCell>
					<FieldArray
						control={model.get('barcode')}
						render={this.renderBarcodeFormArray as any}
					/>
				</TableCell>

				{/* VISIBILITY */}
				{this.locations.length !== 1 && (
					<TableCell>
						<FieldControl
							control={p.get('documentLocationsFilter')}
							render={FieldsFactory.getMultiSelectField_FormControl(
								this.docVisVals,
								{
									label: "", 
									margin: 'none',
									variant: 'standard',
									SelectDisplayProps: {style: {padding: '0.5em 3em 0.5em 0.2em'}},
								},
								{
									margin: 'none',
								}
							) as any}
						/>
					</TableCell>
				)}
			</>
		);
	}



	protected barcodeReaderSub: Subscription = new Subscription();

	private getOpenBarcodePopoverHandler = (fa: FormArray) => (e: React.MouseEvent<any>) => {
		
		CodeScannerEventsActiveStatus.isActive = false;

		this.barcodeReaderSub = CodeScannerService.emitter.subscribe(output => {
			if (!(fa.value as string[]).includes(output.value)) {
				fa.push(new FormControl(output.value));
			}
			// close only if only 1 present (added first time)
			if (fa.controls.length === 1) {
				this.closeBarcodePopoverHandler();
			}
		});

		this.setState({
			barcodePopover: {
				formArray: fa,
				anchor: e.currentTarget,
			}
		});
	}

	private closeBarcodePopoverHandler = (e?) => {
		CodeScannerEventsActiveStatus.isActive = true;
		this.barcodeReaderSub.unsubscribe();
		this.setState({barcodePopover: undefined});
	}

	private getRemoveAllBarcodesHandler = (fa: FormArray) => (e?) => {
		for (let i = fa.controls.length - 1; i > -1; i--) 
			fa.removeAt(i);

		this.closeBarcodePopoverHandler();
	}

	protected getRemoveBarcodeHandler = (fa: FormArray, idx: number) => (e?: any) => fa.removeAt(idx);

	private getBarcodePopover() {
		const barcodeState = this.state.barcodePopover;
		return (
			<Popover
				open={Boolean(barcodeState)}
				anchorEl={barcodeState && barcodeState.anchor}
				onClose={this.closeBarcodePopoverHandler}
				anchorOrigin={{vertical: 'top', horizontal: 'left'}}
				transformOrigin={{vertical: 'top', horizontal: 'right'}}
			>
				{!barcodeState ? (null) : 
				barcodeState.formArray.controls.length === 0 ? 
					// no barcodes yet
					(
						<Box textAlign='center' p={2}>
							<Typography variant='h6'>
								Scannerizza il barcode
							</Typography>

								oppure<br/>

							<Button color='primary' onClick={this.getRemoveAllBarcodesHandler(barcodeState.formArray)}>
								Assegna automaticamente
							</Button>
						</Box>
					) : 
					// multiple barcodes
					(
						<Box p={2}>
							<Box textAlign='center' mb={1}>
								<Typography variant='h6'>
									Scannerizza per aggiungere
								</Typography>
							</Box>
							<Box display='flex' flexDirection='row-reverse'>
								<Button color='primary' onClick={this.closeBarcodePopoverHandler}>
									Chiudi
								</Button>
							</Box>
						</Box>
					)
				}
			</Popover>
		);
	}

	private renderBarcodeFormArray = (fa: FormArray) => {
		return fa.controls.length === 0
			? (
				<Button size='small' color='primary' onClick={this.getOpenBarcodePopoverHandler(fa)}>
					Automatico
				</Button>
			)
			: (
			<Box>
				<Button size='small' color='primary' onClick={this.getOpenBarcodePopoverHandler(fa)}>
					Aggiungi +
				</Button>
				{fa.controls.map((fc, idx) => (
					<Box key={'' + fa.controls.length + idx}>
						<IconButton size='small' onClick={this.getRemoveBarcodeHandler(fa, idx)}>
							<Close/>
						</IconButton>
						{fc.value}
					</Box>
				))}
			</Box>
		);
	}





	private getSupplierAmtsConfig(choseFn: (supp?: FetchableField<Supplier>) => void, textFieldProps?: AmtsFieldProps<any>['textFieldProps']): AmtsFieldProps<Supplier> {
		return {
			canClearField: true,
			amtsInput: {
				bePath: BePaths.suppliers,
				editor: SupplierEditor,
				choseFn: (s) => {
					choseFn(s ? new FetchableField<Supplier>(s._id, ModelClass.Supplier, s) : null);
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
			renderValue: (c: any) => c && c.fetched.name,
			textFieldProps: textFieldProps || {
				variant: 'standard', 
				margin: 'none', 
				placeholder: 'Fornitore', 
			}
		};
	}


	private closeSavingOverlayHandler = (e?) => {
		if (this.state.showSavingFailsOnly) 
			this.setState({savingProgress: undefined});
	}

	private stopPropagationHandler = (e: React.MouseEvent<any>) => e.stopPropagation();

	private savingProgressOverlay() {
		
		// TODO improve errors
		return (
			<Backdrop open={Boolean(this.state.savingProgress)} style={{zIndex: 100000, color: 'white', overflow: 'auto'}} onClick={this.closeSavingOverlayHandler}>
					{!this.state.savingProgress ? (null) : 
					this.state.showSavingFailsOnly ? (
							<Box onClick={this.stopPropagationHandler} maxWidth='58em' margin='auto'>
								<Paper >
									<Box px={2} py={1}>
										<Box display='flex' alignItems='center'>
											<Box flexGrow={1}>
												<h2 style={{margin: 0}}>
													Errori:
												</h2>
											</Box>
											<IconButton onClick={this.closeSavingOverlayHandler}>
												<Close/>
											</IconButton>
										</Box>
										{this.state.savingProgress.fails.map((f, idx) => (
											<Accordion key={idx} style={{boxShadow: 'none'}}>
												<AccordionSummary expandIcon={<ExpandMoreIcon/>}>
													<Typography style={{flexGrow: 1, marginRight: '1em'}}>{f.trace.statusText}</Typography>
													<Typography style={{alignSelf: 'center'}} variant='subtitle2'>Dettagli</Typography>
												</AccordionSummary>
												<AccordionDetails>
													<Typography 
														style={{wordBreak: 'break-word'}} 
														dangerouslySetInnerHTML={{__html: DataFormatterService.objToHtml(f)}}
													/>
												</AccordionDetails>
											</Accordion>
											// <Box >
											// {/* TODO if you put JSON.parse(f) here it will do a "Script error."s */}
											// 	{JSON.stringify(f)}
											// </Box>
										))}
									</Box>
								</Paper>
							</Box>
					) : (
						<Box>
							<h1>
								Invio dati in corso...
							</h1>
							<table>
								<tbody>
									<tr>
										<td>Inviati</td>
										<td>{this.state.savingProgress.done}</td>
									</tr>
									{this.state.savingProgress.fails && (
										<tr>
											<td>Falliti</td>
											<td>{this.state.savingProgress.fails.length}</td>
										</tr>
									)}
									<tr>
										<td>Totale</td>
										<td>{this.state.savingProgress.total}</td>
									</tr>
								</tbody>
							</table>
						</Box>
					)}
			</Backdrop>
		);
	}
	

}

import React from 'react';
import Paper from '@material-ui/core/Paper';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { CodeScannerService, ModalComponentProps } from '@sixempress/main-fe-lib';
import Divider from '@material-ui/core/Divider';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import Box from '@material-ui/core/Box';
import { TextField } from '@material-ui/core';
import { FieldControl, FormArray } from 'react-reactive-form';
import { Subscription } from 'rxjs';
import { CodeScannerEventsActiveStatus } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-active-status';
import { SingleProductEditorLogic } from '../single-product.editor.logic';

export interface AutoBarcodesDialogResponse {
	mode: 'automatic' | 'manual';
	barcodeValueToUse: string[];
	differentBarcodes: 'false' | 'eachVariation' | 'eachVariant';
}

interface ABState {
	assignBarcodeMode: 'automatic' | 'manual';
	autoBarcodeMode: 'false' | 'eachVariation' | 'eachVariant';
	formArray: FormArray;
}

export class AutoBarcodes extends React.Component<{} & ModalComponentProps, ABState> {

	state: ABState = {
		assignBarcodeMode: 'automatic',
		autoBarcodeMode: 'eachVariant',
		formArray: SingleProductEditorLogic.FCFactory.barcodeArray([null]),
	};

	private sub: Subscription;

	componentDidMount() {
		// handle barcode scan
		CodeScannerEventsActiveStatus.isActive = false;
		this.sub = CodeScannerService.emitter.subscribe(output => {
			this.setState({...this.state, assignBarcodeMode: 'manual'});
			this.addManualBarcode(output.value);
		});
	}

	componentWillUnmount() {
		if (this.sub) { this.sub.unsubscribe(); }
		CodeScannerEventsActiveStatus.isActive = true;
	}

	private handleAssignMethodChange = (e?: React.ChangeEvent<any>, val?: string) => {
		(e.target as HTMLInputElement).blur();
		if (this.state.assignBarcodeMode !== val) {
			this.setState({...this.state, assignBarcodeMode: val as any})
		}
	};

	private handleAutoBarcodeMode = (e?: any, val?: string) => {
		(e.target as HTMLInputElement).blur();
		this.setState({...this.state, autoBarcodeMode: val as any});
	}

	private confirmDialog = (e?: any) => {
		this.props.modalRef.close({
			mode: this.state.assignBarcodeMode,
			barcodeValueToUse: this.state.formArray.value,
			differentBarcodes: this.state.autoBarcodeMode,
		} as AutoBarcodesDialogResponse);
	}

	private addManualBarcode = (value?: string) => {
		if (!value || this.state.formArray.value.indexOf(value) !== -1) {
			this.state.formArray.push(SingleProductEditorLogic.FCFactory.barcode(value));
			this.forceUpdate();
		}
	}




	render() {
		return (
			<Paper>
				<DialogContent>
					Alcuni prodotti hanno un barcode automatico
					<br/>
					<br/>
					<RadioGroup value={this.state.assignBarcodeMode} onChange={this.handleAssignMethodChange}>
						<FormControlLabel value="automatic" control={<Radio color='primary' />} label="Imposta automaticamente" />
						<FormControlLabel value="manual" control={<Radio color='primary' />} label="Imposta barcode unico manualmente" />
					</RadioGroup>
	
					<Box mt={1} mb={2}>
						<Divider/>
					</Box>
	
					{this.state.assignBarcodeMode === 'automatic' ? (
						<RadioGroup value={this.state.autoBarcodeMode} onChange={this.handleAutoBarcodeMode}>
							<Tooltip title="Tutti i barcode automatici avranno lo stesso barcode">
								<FormControlLabel 
									style={{width: '40%', whiteSpace: 'nowrap'}}
									value="false" 
									control={<Radio color='primary' />} 
									label="Barcode unico per tutti" 
								/>
								</Tooltip>
							<Tooltip title="Ogni combinazione di varianti avra' un barcode diverso (prodotti in cui cambia solo il prezzo/fornitore avranno lo stesso barcode)">
								<FormControlLabel 
									style={{width: '40%', whiteSpace: 'nowrap'}}
									value="eachVariant" 
									control={<Radio color='primary' />} 
									label="Barcode unico per ogni variante" 
								/>
								</Tooltip>
							<Tooltip title="Ogni combinazione di valori e varianti avra' un barcode unico (i prodotti avranno un barcode diverso se differenziano di qualsiasi valore)">
								<FormControlLabel 
									style={{width: '40%', whiteSpace: 'nowrap'}}
									value="eachVariation" 
									control={<Radio color='primary' />} 
									label="Barcode unico per ogni variazione" 
								/>
							</Tooltip>
						</RadioGroup>
					) : (
							<React.Fragment>
								{this.state.formArray.controls.map((c, idx) => (
									<Box key={'' + this.state.formArray.controls.length + idx} mb={2}>
										<FieldControl
											control={c}
											render={formControl => { 
												const handlers = formControl.handler();
												return (
													<TextField
														variant='outlined'
														label='Barcode'
														error={formControl.invalid}
														{...handlers}
														onChange={e => {
															handlers.onChange(e);
															this.forceUpdate();
														}}
													/>
												);
											}}
										/>
									</Box>
								))}
								<Button color='primary' onClick={e => this.addManualBarcode()}>
									Aggiungi +
								</Button>
						</React.Fragment>
					)}
					
				</DialogContent>
				<DialogActions>
					<Button color='primary' onClick={e => this.props.modalRef.close()}>
						Chiudi
					</Button>
					<Button color='primary' disabled={this.state.assignBarcodeMode === 'manual' && this.state.formArray.invalid} variant='contained' onClick={this.confirmDialog}>
						Conferma
					</Button>
				</DialogActions>
			</Paper>
		);
	}

}

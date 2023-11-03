import React from 'react';
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import { DymoUtils, PrintData } from './dymo.utils';
import { PrinterPaper } from './dymo.sizes';
import { SPrintService } from 'apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.service';
import { FieldsFactory, SelectFieldValue } from '@sixempress/main-fe-lib';

// import * as a from '../../../../../../public/lib/dymo.js';

export interface DLProps {
	onDymoCheck?: () => void,
}

export interface DLState {
	controlled: boolean;
	error?: string;

	chosenSize: PrinterPaper;

	simplePrintPrinters: SelectFieldValue[];
	simplePrintPrintersSelected: string;
}

export default class DymoLazy extends React.Component<DLProps, DLState> {

	state: DLState = {
		controlled: false,
		chosenSize: PrinterPaper.medium,

		simplePrintPrinters: [],
		simplePrintPrintersSelected: "",
	};

	componentDidMount() {
		this.startDymo();
	}

	componentDidUpdate(pp, ps) {
		if (this.props.onDymoCheck && ps.controlled !== this.state.controlled) {
			this.props.onDymoCheck();
		}
	}

	private defaultSimplePrinterValue = '__default';

	public print = (toPrint: PrintData[]) => {
		const printerUsed = this.state.simplePrintPrintersSelected;
		
		DymoUtils.sendPrintRequest(
			printerUsed === this.defaultSimplePrinterValue ? undefined : printerUsed, 
			this.state.chosenSize, 
			toPrint
		);
	}

	public canPrint = () => {
		return this.state.controlled && (!this.state.error || this.state.simplePrintPrinters.length);
	}

	private handleDymoReload = () => {
		this.startDymo();
	}

	private startDymo() {
		this.setState({controlled: undefined});

		// set timeout to get a delay for the UI to change
		setTimeout(async () => {
			// check simple printers
			const s = await SPrintService.getLabelPrinterList();
			if (!s || !s.length)
				return this.setState({controlled: true, error: 'Dymo non disponibile'});

			this.setState({
				controlled: true,
				simplePrintPrinters: [
					{label: "Predefinita", value: this.defaultSimplePrinterValue}, 
					...s.map(p => ({value: p.name, label: p.name}))
				],
				simplePrintPrintersSelected: this.defaultSimplePrinterValue
			});

		}, 200);

	}

	private onChangeSimplePrinterSelect = (e: React.ChangeEvent<any>) => {
		const val = e.target.value;
		this.setState({simplePrintPrintersSelected: val});
	}

	render() {

		// checking
		if (!this.state.controlled) {
			return (
				<Box my={2} p={1} className='dynamic-text-color'>
					Controllo collegamento etichettatrici DYMO...
				</Box>
			);
		}

		// no simple printer and local has errored
		if (this.state.error || this.state.simplePrintPrinters.length === 0) {
			return (
				<Box my={2} p={1} className='dynamic-text-color'>
					<span className='dymo-error'></span> 
					{this.state.error || ''}
					<br/>
					Server di stampa semplice non raggiungibile o stampante per etichette non configurata
					<br/>
					{this.state.controlled && <Button color='primary' onClick={this.handleDymoReload}>Aggiorna Lista Stampanti</Button>}
				</Box>
			);
		}

		return (
			<Box my={2} p={1}>
				<FieldsFactory.SelectField 
					key="simple_printer_select"
					label="Stampante da usare"
					margin='none'
					values={this.state.simplePrintPrinters} 
					value={this.state.simplePrintPrintersSelected} 
					onChange={this.onChangeSimplePrinterSelect}
				/>
				<br/>
				<br/>
				<Button color='primary' onClick={this.handleDymoReload}>Aggiorna Lista Stampanti</Button>
			</Box>
		);

	}

}

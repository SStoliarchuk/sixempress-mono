import './print-barcode.css';
import React from 'react';
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import { DataFormatterService, RouterService } from '@sixempress/main-fe-lib';
import { Product } from '../../Product';
import { BarcodeService } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/barcode-service';
import { ProductAmountList } from '../product-amount-list';
import { PALProps, PALState, productCommunicationObject } from '../product-amount-list.dtd';
import DymoLazy from './dymo.lazy';
import { PrintData } from './dymo.utils';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';
import { ProductsJsxRender } from '../../products-render';
// const DymoLazy = lazy(() => import('./dymo.lazy'));


interface PBPLState extends PALState {
	
}

/**
 * shows a table similar to the load table
 * but used to print barcodes
 */
export class PrintBarcodeProductList extends ProductAmountList<PALProps, PBPLState> {

	private dymoRef = React.createRef<DymoLazy>();

	componentDidMount() {
		super.componentDidMount();
	}

	/**
	 * Qol function
	 */
	private getAllProducts(): {item: Product, amount: number}[] {
		const toR: {item: Product, amount: number}[] = [];
		for (const g in this.state.products) {
			for (const p in this.state.products[g]) {
				toR.push({
					item: this.state.products[g][p].item, 
					amount: this.state.products[g][p].amounts[Object.keys(this.state.products[g][p].amounts)[0]].amount,
				});
			}
		}
		return toR;
	}


	protected async save() {
		if (this.dymoRef.current.canPrint()) {
			this.printDymo();
		} else {
			this.printHtml();
		}
	}

	private printHtml() {
		const toPrint: {code: string, prod: Product}[] = [];

		for (const p of this.getAllProducts()) {
			if (p.amount > 0) {
				const prod = p.item;

				for (let i = 0; i < p.amount; i++) {
					toPrint.push({
						code: CodeScannerEventsService.encodeBarcodeType(ScannedItemType.product, prod),
						prod: prod
					});
				}
			}
		}

		BarcodeService.printPdfMake(toPrint);
		RouterService.back();
	}

	private printDymo() {
		
		const toPrint: PrintData[] = [];

		for (const p of this.getAllProducts()) {
			if (p.amount > 0) {
				const prod = p.item;

				for (let i = 0; i < p.amount; i++) {
					toPrint.push({
						barcode: CodeScannerEventsService.encodeBarcodeType(ScannedItemType.product, prod),
						price: "€ " + DataFormatterService.centsToScreenPrice(prod.variationData.sellPrice),
						name: ProductsJsxRender.formatFullProductName(prod)
					});
				}
			}
		}

		this.dymoRef.current.print(toPrint);
		RouterService.back();
	}

	/**
	 * Ensures only 1 location is present, not more than 1
	 */
	addProductsToList(data: productCommunicationObject, ...other) {
		for (const d of data) {
			const amt = d.amounts ? Object.values(d.amounts).reduce((car, cur) => car += cur, 0) || 1 : 1;
			d.amounts = {[(this.state.simpleMode as {locationId: string}).locationId]: amt};
		}
		return super.addProductsToList(data, ...other);
	}


	private onDymoStarted = () => {
		this.forceUpdate();
	}

	render() {

		let totToPrint = 0;
		for (const p of this.getAllProducts()) { totToPrint += p.amount; }
		const canPrint = totToPrint !== 0 && this.dymoRef && this.dymoRef.current && this.dymoRef.current.state.controlled;

		return (
			<>

				{/* <Suspense fallback={<div style={{padding: '0.5em'}}>Caricamento...</div>}> */}
					<DymoLazy ref={this.dymoRef} onDymoCheck={this.onDymoStarted}/>
				{/* </Suspense> */}

				<Paper className='def-box'>
					<Box display='flex' alignItems='center'>

						<Box mr={2} flexGrow={1}>
							<h2 className='m-0'> <b> Stampa codice a barre  </b> </h2>
						</Box>

						<Box mr={2}>
							Tot da Stampare: {totToPrint}
						</Box>
						<Button variant='contained' color='primary' onClick={this.handleSaveBtn} disabled={!canPrint}> 
							Stampa
						</Button>

					</Box>
				</Paper>

				{super.render()}
			</>
		);
	}

}

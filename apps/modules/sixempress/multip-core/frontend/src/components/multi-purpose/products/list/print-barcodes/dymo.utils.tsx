
import { BarcodeType } from "apps/modules/sixempress/multip-core/frontend/src/services/barcode/barcode-service";

import { PrinterPaper, getTemplate } from "./dymo.sizes";
import { LabelPrinterRequest } from "apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.dtd";
import { SPrintService } from "apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.service";

export declare type DymoStartupResponse =
	{error: true, data: any & {noPrinters?: boolean, noLabelWriterPrinters?: boolean}} | 
	{error: false, data: {printerNames: string[]}};


export declare type PrintData = {barcode: string, price: string, name: string};

export class DymoUtils {
	
	public static sendPrintRequest(printerName: string | undefined, printerPaper: PrinterPaper, data: PrintData[], useOnly128 = true) {
		const parallelDataArr = {};
		for (const d of data) {
			for (const k in d) {
				if (!parallelDataArr[k]) { parallelDataArr[k] = []; }

				if (d[k] === null || d[k] === undefined) {
					parallelDataArr[k].push(null)
				} else {
					parallelDataArr[k].push(d[k]);
				}
			}
		}
		const body: LabelPrinterRequest = {
			schema: getTemplate(printerPaper, BarcodeType.code128Auto),
			data: parallelDataArr,
		};
		if (printerName) {
			body.printerNames = [printerName];
		}

		SPrintService.labelPrint(body);
	}
	
	// private static frameworkStartup() {
	// 	return newDymoStartupResponse>(obs => {
	// 		this.initLib(true).subscribe(
	// 			r => {
					
	// 				if (r.error) {
	// 					obs.next({error: true, data: r.data});
	// 					return;
	// 				}

	// 				const printers = dymo.label.framework.getPrinters().filter(p => p.isConnected);
	// 				if (printers.length === 0) {
	// 					obs.next({error: true, data: {...r.data, noPrinters: true}});
	// 					return;
	// 				}

	// 				const labelWriters = printers.filter(p => p.printerType === "LabelWriterPrinter" && p.isConnected).map(p => p.name);
	// 				if (labelWriters.length === 0) {
	// 					obs.next({error: true, data: {...r.data, noPrinters: false, noLabelWriterPrinters: true}});
	// 					return;
	// 				}

	// 				obs.next({error: false, data: {printerNames: labelWriters}});
	// 			},
	// 		);
	// 	});
	// }
	
	// private static initLib(force: true) {
	// 	return new{error: boolean, data?: DymoInitResponse}>(obs => {
			
	// 		if (force && (window as any)._createFramework && (window as any)._createFramework.resetFramework) {
	// 			(window as any)._createFramework.resetFramework();
	// 		}

	// 		dymo.label.framework.init(data => {
	// 			if (!data.isBrowserSupported || !data.isFrameworkInstalled || !data.isWebServicePresent || data.errorDetails) {
	// 				obs.next({error: true, data});
	// 			} else {
	// 				obs.next({error: false, data});
	// 			}
	// 		});
	// 	});
	// }


	// private static localDymoPrint(printerName: string, printerPaper: PrinterPaper, data: PrintData[], useOnly128 = true) {

	// 	const code128: PrintData[] = useOnly128 ? data : [];
	// 	const ean13: PrintData[] = [];
	// 	const ean8: PrintData[] = [];

	// 	if (!useOnly128) {
	// 		for (const d of data) {
	// 			const barcodeInfo =getBarcodeType(d.barcode);
	// 			switch (barcodeInfo.type) {
	// 				case BarcodeType.code128Auto:
	// 					code128.push({...d, barcode: barcodeInfo.value});
	// 					break;
	// 				case BarcodeType.ean13:
	// 					ean13.push({...d, barcode: barcodeInfo.value});
	// 					break;
	// 				case BarcodeType.ean8:
	// 					ean8.push({...d, barcode: barcodeInfo.value});
	// 					break;
	// 			}
	// 		}
	// 	}

	// 	if (ean13.length !== 0) {
	// 		const xmlTemplate = getTemplate(printerPaper, BarcodeType.ean13);
	// 		const xml = dymo.label.framework.openLabelXml(xmlTemplate);
			
	// 		const xmlSet = new dymo.label.framework.LabelSetBuilder();
	// 		for (const d of ean13) {
	// 			const r = xmlSet.addRecord();
	// 			r.setText("name", d.name);
	// 			r.setText("price", d.price);
	// 			r.setText("barcode", d.barcode);
	// 		}

	// 		dymo.label.framework.printLabel(printerName, null, xml, xmlSet);
	// 	}
		
	// 	if (code128.length !== 0) {
	// 		const xmlTemplate = getTemplate(printerPaper, BarcodeType.code128Auto);
	// 		const xml = dymo.label.framework.openLabelXml(xmlTemplate);
			
	// 		const xmlSet = new dymo.label.framework.LabelSetBuilder();
	// 		for (const d of code128) {
	// 			const r = xmlSet.addRecord();
	// 			r.setText("name", d.name);
	// 			r.setText("price", d.price);
	// 			r.setText("barcode", d.barcode);
	// 		}

	// 		dymo.label.framework.printLabel(printerName, null, xml, xmlSet);
	// 	}

	// 	if (ean8.length !== 0) {
	// 		const xmlTemplate = getTemplate(printerPaper, BarcodeType.ean8);
	// 		const xml = dymo.label.framework.openLabelXml(xmlTemplate);
			
	// 		const xmlSet = new dymo.label.framework.LabelSetBuilder();
	// 		for (const d of ean8) {
	// 			const r = xmlSet.addRecord();
	// 			r.setText("name", d.name);
	// 			r.setText("price", d.price);
	// 			r.setText("barcode", d.barcode);
	// 		}

	// 		dymo.label.framework.printLabel(printerName, null, xml, xmlSet);
	// 	}

	// }


}


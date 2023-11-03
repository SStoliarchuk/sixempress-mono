import { DataFormatterService } from '@sixempress/main-fe-lib';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { PdfService } from 'apps/modules/sixempress/multip-core/frontend/src/services/pdf/pdf.service';
import { TransferOrder } from './TransferOrder';
import { TransferOrderEditor } from './table/transfer-order.editor';
import { Observable } from 'rxjs';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { TransferOrderController } from './TransferOrder.controller';
import { BarcodeService } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/barcode-service';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';

export class TransferOrdersPdf {

	// private static defaultTitle = 'Dettaglio Ordine'

	// public static async printOrder(id: string | TransferOrder) {
	// 	const dd = await TransferOrdersPdf.generateOrderPdf(typeof id === 'string' ? id : id._id);
	// 	PdfService.pdfAction(dd, 'print');
	// }

	// public static async generateOrderPdf(id: string): Promise<object> {
	// 	const item = await new TransferOrderController().fetchFullObject(id).toPromise();

	// 	const encodedScan = CodeScannerEventsService.encodeBarcodeType(ScannedItemType.internalorder, item);
	// 	const barcodeB64 = BarcodeService.barcodeToB64(encodedScan, {
	// 		width: 1,
	// 		height: 13,
	// 		margin: 0,
	// 		displayValue: false,
	// 	});

	// 	const bussConf = MultipService.config.content || {};
	// 	const pdfConfig = bussConf.pdfInfo || {};
	// 	const entrance = {} as typeof pdfConfig.entrancePdf;

	// 	// const barcodeB64 = '';
	// 	const headerCols: any[] = [ {
	// 		margin: [0, 0, 0, 0],
	// 		table: {
	// 			widths: ['*'],
	// 			body: [
	// 				[{
	// 					text: {
	// 						text: (entrance.title || TransferOrdersPdf.defaultTitle) + '\n',
	// 						fontSize: 25,
	// 						alignment: 'center',
	// 						bold: true
	// 					},
	// 					border: [false, false, false, false],
	// 				}],
	// 				[{
	// 					border: [false, false, false, false],
	// 					table: {
	// 						widths: ['100%'],
	// 						body: [[
	// 							{
	// 								text: pdfConfig.infoRows || "",
	// 								margin: [10, 0, 0, 0],
	// 								border: [false, false, false, false]
	// 							},
	// 						]]
	// 					},
	// 				}],
	// 			]
	// 		}
	// 	}];

	// 	if (entrance.logo || bussConf.logo) {
	// 		headerCols.unshift({
	// 			width: 100,
	// 			image: entrance.logo ? entrance.logo.fetched.content : bussConf.logo.fetched.content,
	// 			fit: [100, 100],
	// 		});
	// 	}

	// 	const dd = {
	// 		pageMargins: [20, 270,20,40],
	// 		header: {
	// 			margin: [20, 20, 20, 0],
	// 			stack: [
	// 				{
	// 					columns: headerCols,
	// 				},
	// 				{
	// 					qr: encodedScan,
	// 					fit: 50,
	// 					margin: [0, 15, 0, 0],
	// 					border: [false,false,false,false],
	// 					alignment: "right"
	// 				},
	// 				{
	// 					margin: [0,-25,0,10],
	// 					table: {
	// 						widths: ["auto","auto","*",70],
	// 						body: [
	// 							[{
	// 									text: "Ordine N.",
	// 									border: [false,false,false,false],
	// 									bold: true
	// 								},
	// 								{
	// 									text: item._progCode,
	// 									bold: true
	// 								},
	// 								{
	// 									image: barcodeB64,
	// 									fit: [100, 9000],
	// 									alignment: "center",
	// 									border: [false,false,false,false]
	// 								},
	// 								{
	// 									text: "",
	// 									border: [false,false,false,false]
	// 								}
	// 							]
	// 						]
	// 					}
	// 				},
	// 				{
	// 					margin: [0,10,0,0],
	// 					table: {widths: ["*"],
	// 						body: [
	// 							[{text: "", border: [false,true,false,false]}]
	// 						]
	// 					},
	// 				},
	// 				{
	// 					margin: [0,-5,0,0],
	// 					layout: {defaultBorder: false},
	// 					table: {
	// 						widths: [105,153,"auto","*"],
	// 						body: [
	// 							[
	// 								{
	// 									text: item.customer ? "Cliente" : '',
	// 									bold: true,
	// 									border: [false,false,false,true]
	// 								},
	// 								{
	// 									text: item.customer ? CustomerController.formatCustomerName(item.customer.fetched) : '',
	// 									border: [false,false,false,true]
	// 								},
	// 								{
	// 									text: "Data Ordine:",
	// 									bold: true,
	// 									border: [false,false,false,true]
	// 								},
	// 								{
	// 									text: DataFormatterService.formatUnixDate(item.date || item._created._timestamp),
	// 									border: [false,false,false,true]
	// 								},
	// 							],
	// 						]
	// 					},
	// 				},
	// 				{
	// 					margin: [0, 15, 0, 20],
	// 					text: 'Dettagli',
	// 					bold: true,
	// 					fontSize: 20,
	// 				},
	// 			]
	// 		},
	// 		content: SaleableItemController.generatePdfTable(item),
	// 		footer: function(currentPage, pageCount) {
	// 			return [
	// 				{
	// 					margin: [20,0,20,0],
	// 					table: {
	// 						widths: ["*","auto"],
	// 						body: [
	// 							[
	// 								{
	// 									text: 'Pag.: ' + currentPage + '/' + pageCount,
	// 									border: [false,false,false,false]
	// 								},
	// 								{
	// 									text: "Firma per presa visione ed accettazione",
	// 									border: [false,true,false,false]
	// 								}
	// 							]
	// 						]
	// 					}
	// 				}
	// 			]
	// 		},
	// 	};

	// 	return dd;
	// }

}

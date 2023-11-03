import { DataFormatterService } from '@sixempress/main-fe-lib';
import { PdfService } from 'apps/modules/sixempress/multip-core/frontend/src/services/pdf/pdf.service';
import { CustomerOrder } from './CustomerOrder';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { CustomerOrderController } from './CustomerOrder.controller';
import { BarcodeService } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/barcode-service';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';
import { FieldsNameInfo } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/Customer';

export class CustomerOrdersPdf {

	private static defaultTitle = 'Dettaglio Ordine'

	public static async printOrder(id: string | CustomerOrder) {
		const dd = await CustomerOrdersPdf.generateOrderPdf(typeof id === 'string' ? id : id._id);
		PdfService.pdfAction(dd, 'print');
	}

	public static async generateOrderPdf(id: string): Promise<object> {
		const item = await new CustomerOrderController().getSingle(id, {params: {fetch: true}});

		const encodedScan = CodeScannerEventsService.encodeBarcodeType(ScannedItemType.customerorder, item);
		const barcodeB64 = BarcodeService.barcodeToB64(encodedScan, {
			width: 1,
			height: 13,
			margin: 0,
			displayValue: false,
		});

		const bussConf = MultipService.content || {};
		const pdfConfig = bussConf.pdfInfo || {};
		const entrance = pdfConfig.customerOrder || {};

		// const barcodeB64 = '';
		const headerCols: any[] = [ {
			margin: [0, 0, 0, 0],
			table: {
				widths: ['*'],
				body: [
					[{
						text: {
							text: (entrance.title || CustomerOrdersPdf.defaultTitle) + '\n',
							fontSize: 25,
							alignment: 'center',
							bold: true
						},
						border: [false, false, false, false],
					}],
					[{
						border: [false, false, false, false],
						table: {
							widths: ['100%'],
							body: [[
								{
									text: pdfConfig.infoRows || "",
									margin: [10, 0, 0, 0],
									border: [false, false, false, false]
								},
							]]
						},
					}],
				]
			}
		}];

		if (entrance.logo || bussConf.logo) {
			headerCols.unshift({
				width: 100,
				image: entrance.logo ? entrance.logo.fetched.content : bussConf.logo.fetched.content,
				fit: [100, 100],
			});
		}

		const infos = CustomerOrdersPdf.generateInfoRows(item);
		const dd = {
			pageMargins: [20, 217, 20,40],
			header: {
				margin: [20, 20, 20, 0],
				stack: [
					{
						columns: headerCols,
					},
					{
						qr: encodedScan,
						fit: 50,
						margin: [0, 15, 0, 0],
						border: [false,false,false,false],
						alignment: "right"
					},
					{
						margin: [0,-25,0,10],
						table: {
							widths: ["auto","auto","*",70],
							body: [
								[{
										text: "Ordine N.",
										border: [false,false,false,false],
										bold: true
									},
									{
										text: item._progCode,
										bold: true
									},
									{
										image: barcodeB64,
										fit: [100, 9000],
										alignment: "center",
										border: [false,false,false,false]
									},
									{
										text: "",
										border: [false,false,false,false]
									}
								]
							]
						}
					},
					{
						margin: [0,10,0,0],
						table: {widths: ["*"],
							body: [
								[{text: "", border: [false,true,false,false]}]
							]
						},
					},
				]
			},
			content: [
				{
					margin: [0,-5,0,0],
					layout: {defaultBorder: false},
					table: {
						widths: [105,153,"auto","*"],
						body: [
							[
								{
									text: item.customer ? "Cliente" : '',
									bold: true,
									border: [false,false,false,true]
								},
								{
									text: item.customer ? CustomerController.formatCustomerName(item.customer.fetched) : '',
									border: [false,false,false,true]
								},
								{
									text: "Data Ordine:",
									bold: true,
									border: [false,false,false,true]
								},
								{
									text: DataFormatterService.formatUnixDate(item.date || item._created._timestamp),
									border: [false,false,false,true]
								},
							],
							...infos,
						]
					},
				},
				{
					margin: [0, 0, 0, 0],
					table: {
						widths: ['auto', '*'],
						body: [
							[
								{ text: item.customerNote ? 'Note' : '', bold: true, border: [false, false, false, false] },
								{ text: item.customerNote || '', border: [false, false, false, false] }
							]
						]
					},
				},
				{
					margin: [0, 15, 0, 20],
					text: 'Dettagli',
					bold: true,
					fontSize: 20,
				},
				CustomerOrderController.generatePdfTable(item)
			],
			footer: function(currentPage, pageCount) {
				return [
					{
						margin: [20,0,20,0],
						table: {
							widths: ["*","auto"],
							body: [
								[
									{
										text: 'Pag.: ' + currentPage + '/' + pageCount,
										border: [false,false,false,false]
									},
									{
										text: "Firma per presa visione ed accettazione",
										border: [false,true,false,false]
									}
								]
							]
						}
					}
				]
			},
		};

		return dd;
	}

	private static generateInfoRows(item: CustomerOrder): any[] {
		
		const infos = [];
			
		const ks = Object.keys(FieldsNameInfo);
		for (let i1 = 0; i1 < ks.length; i1 += 2) {
			const i2 = i1 + 1;
			const val1 = (item.shipping && item.shipping[ks[i1]]) || (item.billing && item.billing[ks[i1]]);
			const val2 = (item.shipping && item.shipping[ks[i2]]) || (item.billing && item.billing[ks[i2]]);

			if (!val1 && !val2)
				continue;
			
			infos.push([
				{
					text: val1 ? FieldsNameInfo[ks[i1]] : '',
					bold: true,
					border: [false,false,false,true]
				},
				{
					text: val1 || '',
					border: [false,false,false,true]
				},
				{
					text: val2 ? FieldsNameInfo[ks[i2]] : '',
					bold: true,
					border: [false,false,false,true]
				},
				{
					text: val2 || '',
					border: [false,false,false,true]
				},
			]);
			
		}
		
		if (!infos.length && item.customer && item.customer.fetched.address) {
			infos.push([
				{
					text: 'Indirizzo',
					bold: true,
					border: [false,false,false,true]
				},
				{
					text: item.customer.fetched.address,
					border: [false,false,false,true]
				},
				{
					text: '',
					bold: true,
					border: [false,false,false,true]
				},
				{
					text: '',
					border: [false,false,false,true]
				},
			])
		}

		// add total
		infos.push([
			{
				text: 'Totale',
				bold: true,
				border: [false,false,false,true]
			},
			{
				text: '€ ' + DataFormatterService.centsToBigNumber(item.totalPrice),
				border: [false,false,false,true]
			},
			{
				text: '',
				bold: true,
				border: [false,false,false,true]
			},
			{
				text: '',
				border: [false,false,false,true]
			},
		]);


		return infos;
	}


}

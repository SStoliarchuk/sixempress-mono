import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { ProductsJsxRender } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/products-render';
import JsBarcode from 'jsbarcode';
import { DataFormatterService, MediaFileService } from '@sixempress/main-fe-lib';
import { PdfService } from 'apps/modules/sixempress/multip-core/frontend/src/services/pdf/pdf.service';

export enum BarcodeType {
	ean13 = "Ean13",
	ean8 = "Ean8",
	code128Auto = "Code128Auto",
}

class _BarcodeService {

	static printBarcodes(barcodes: {code: string, label: string}[]) {
		let html = '';

		// create the convrsion subs
		for (const b of barcodes) {
			html += `
				<div class='code-div'>
					<img src="${this.barcodeToB64(b.code)}"/>
					<span>${b.label}</span>
				</div>
			`;
		}

		if (html) {
			MediaFileService.printHtml(`
				<style>
					.container {
						display: flex;
						flex-wrap: wrap;
						font-family: sans-serif;
					}
					.code-div {
						display: flex;
						flex-direction: column;
						text-align: center;
						font-size: 0.6em;
					}
				</style>
				<div class='container'>
					${html}
				</div>
			`);
		}
	}
	
	static printPdfMake(barcodes: {code: string, prod: Product}[]) {
		// clone as we gonna alter it
		barcodes = [...barcodes];
		

		const rows = [];
		while (barcodes.length) {
			// apparently the rows need to be padded for pdfmake lite :/
			const columns: any[] = ['', '', '', ''];
			const chunk = barcodes.splice(0, 4);
			for (let i = 0; i < chunk.length; i++) {
				
				const prod = chunk[i].prod;
				// put vars before as to allow to place the correct barcode on the target product
				const name = ProductsJsxRender.formatProductVariantName(prod) + ' ' + prod.groupData.name;
				// TODO remove internalTags here as it exists only for the transition from internal to unique
				const tags = [...(prod.groupData.uniqueTags || []), ...(prod.groupData.internalTags || [])];
				columns[i] = {
					stack: [
						{
							image: BarcodeService.barcodeToB64(chunk[i].code),
							alignment: 'center',
							// width is tested for max size (140)
							// height is used as a way to space the container
							// as using just the size creates weird artifacts on new page prints :/
							fit: [140, 36.85], 
						},
						// add empty space if no tags are present to "consume" this space for correct label alignemnts
						{text: tags.length ? tags.join(', ') : '', fontSize: 8, margin: [0, -7.02, 0, 0], alignment: 'center'},
						// add formatted name
						{text: name.length > 24 ? name.substr(0, 21) + '...' : name, fontSize: 10, alignment: 'center'},

						// add price
						typeof prod.infoData.refSellPrice !== 'undefined' && prod.infoData.refSellPrice > prod.variationData.sellPrice
						// discounted
						? { columns: [
								{
									text: '€ ' + DataFormatterService.centsToScreenPrice(prod.infoData.refSellPrice), 
									width: '35%', fontSize: 9, decoration: 'lineThrough', alignment: 'center' 
								},
								{
									text: '€ ' + DataFormatterService.centsToScreenPrice(prod.variationData.sellPrice), 
									alignment: 'left'
								},
							] }
						// normal
						: {text: '€ ' + DataFormatterService.centsToScreenPrice(prod.variationData.sellPrice), alignment: 'center'},
					],
				};
			}

			rows.push(columns);
		}



		const dd = {
			pageMargins: [0, 0, 0, 0],
			content: [
				{
					columns: [
						{
							layout: {defaultBorder: false},
							table: {
								// height zero as setting a min height creates a weird artifact on new page prints :/
								heights: 0,
								// heights: 65.07,
								widths: ['25%', '25%', '25%', '25%'],
								body: rows
							}
						}
					]
				},    
			]
		};
	
		PdfService.pdfAction(dd, 'print', '');
	}

	/**
	 * Creates a base64Barcode image
	 * @param id ID of the element to create
	 */
	static barcodeToB64(barcode: string, opts?: JsBarcode.Options): string {
		const canvas = document.createElement('canvas');
		JsBarcode(canvas, barcode, {
			width: 1,
			height: 20,
			fontSize: 8,
			displayValue: false,
			...opts,
		});
		return canvas.toDataURL("image/png");
	}


	public static getBarcodeType(b: string): {type: BarcodeType, value: string} {
		const withouthLastChar = b.substr(0, b.length - 1);
		const lastChar = b[b.length - 1];

		if (b.length === 13 && this.eanCheckDigit(withouthLastChar).toString() === lastChar) {
			return {
				type: BarcodeType.ean13,
				value: withouthLastChar,
			};
		} 
		else if (b.length === 8 && this.eanCheckDigit(withouthLastChar).toString() === lastChar) {
			return {
				type: BarcodeType.ean8,
				value: withouthLastChar,
			};
		}

		return {
			type: BarcodeType.code128Auto,
			value: b,
		};
	}
	
	
	public static eanCheckDigit(s: string): number {
		let result = 0;
		for (let i = 1, counter = s.length - 1; counter >= 0; i++, counter--){
			result = result + parseInt(s.charAt(counter)) * (1 + (2 * (i % 2)));
		}
		return (10 - (result % 10)) % 10;
	}

}

globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.BarcodeService = (globalThis.__sixempress.BarcodeService || _BarcodeService);
export const BarcodeService = globalThis.__sixempress.BarcodeService as typeof _BarcodeService;
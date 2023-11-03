import { DataFormatterService } from '@sixempress/main-fe-lib';
import { SaleController } from "../sale.controller";
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { SPrintService } from 'apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.service';
import { ProductsJsxRender } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/products-render';
import { Sale } from '../Sale';
import { BarcodeService } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/barcode-service';

export async function printReceipt(saleId: string, config: {
	// unix date
	forceSale?: Sale,
	payments?: boolean,
	barcode?: string,
} = {}) {

	const sale = config.forceSale || await new SaleController().getSingle(saleId, {params: {fetch: new SaleController().getFullFetch()}});

	let articles = '';

	for (const l of sale.list) {
		if (l.products)
			for (const p of l.products)
				articles += `
					<tr>
						<td><span class='condense left'>${ProductsJsxRender.formatFullProductName(p.item.fetched)}</span></td>
						<td><span class='condense'>${p.amount}</span></td>
						<td><span class='condense right'>€ ${DataFormatterService.centsToScreenPrice(p.amount * p.item.fetched.variationData.sellPrice)}</span></td>
					</tr>
				`;
		if (l.manual)
			for (const p of l.manual)
				articles += `
					<tr>
						<td><span class='condense left'>${p.description}</span></td>
						<td><span class='condense'></span></td>
						<td>${typeof p.sellPrice === 'number' ? `<span class='condense right'>€ ${DataFormatterService.centsToScreenPrice(p.sellPrice)}</span>` : '' }</td>
					</tr>
				`;
	}
	
	// no articles, then return
	if (!articles) 
		return;

	const style = `
		<style>

			body {
				max-width: 15em;	
			}

			hr {
				border: 1px solid lightgrey;
			}
			
			.logo {
				max-height: 50px;
				max-width: 50px;
			}

			* {
				font-family: sans-serif;
				font-size: 0.93em;
				padding: 0;
			}

			span.condense {
				transform: scale(0.95, 1);
				display: inline-block;
			}
			.underline {
				text-decoration: underline;
			}
			span.condense.right {
				transform-origin: right;
			}
			span.condense.left {
				transform-origin: left;
			}

			.article-table {
				border-collapse: collapse;
				width: 100%;
			}
			.article-table td, .article-table th {
				padding: 2px 5px;
				border-bottom: 1px solid rgba(0,0,0,0.1);
				text-align: left;
			}
			.article-table td:first-child, .article-table th:first-child {
				padding-left: 0;
			}
			.article-table td:nth-child(2), .article-table th:nth-child(2) {
				text-align: center;
			}
			.article-table td:last-child, .article-table th:last-child {
				padding-right: 0;
				text-align: right;
			}
			.article-table td:first-child {
				width: 100%;
			}
			.article-table td:not(:first-child), article-table th:not(:first-child) {
				white-space: nowrap;
			}
			.section {
				margin: 1em 0;
			}
		</style>
	`;

	const leftToPay = config.payments && sale.totalPrice - sale.payments.reduce((t, m) => t += m.amount, 0);


	const toPrint = `

		${style}

		<div style="text-align: center">
			${MultipService.content.logo 
				? '<img class="logo" src="' + MultipService.content.logo.fetched.content + '"/><br/>'
				: ''
			}
			<span class="condense">
				${MultipService.content.receiptInfo ? DataFormatterService.replaceNewlineWithBrTag(MultipService.content.receiptInfo.infoRows) : ""}
			</span>
		</div>
		
		<div style="margin: 2em 0; text-align: center; font-weight: bold; font-size: 0.6em;">
			DOCUMENTO GESTIONALE
		</div>
	
		<div class="section" style="text-align: left;">
			<table class="article-table">
				<thead> 
					<tr> 
						<th><span class='condense left'>ARTICOLI</span></th> 
						<th><span class='condense'>QTA</span></th> 
						<th><span class='condense right'>EURO</span></th> 
					</tr> 
				</thead>
				<tbody>
					${articles}
				</tbody>
			</table>
		</div>
		
		<div class="section" style="text-align: right">
		${sale._priceMeta.maxTotal > sale.totalPrice ? `
			<b style="font-size: 1em;text-decoration: line-through;">
				<span class='right'>Totale € ${DataFormatterService.centsToScreenPrice(sale._priceMeta.maxTotal)}</span>
			</b>
			<br/>
			<b style="font-size: 1.4em">
				<span class='condense right'>Scontato € ${DataFormatterService.centsToScreenPrice(sale.totalPrice)}</span>
			</b>
		` : ` 
			<b style="font-size: 1.4em">
				<span class='condense right'>Totale € ${DataFormatterService.centsToScreenPrice(sale.totalPrice)}</span>
			</b>
		`}
		</div>
		
		
		${config.payments && leftToPay ? `
			<hr/>
			<div class="section">
				<b>Acconti</b>

				<table class="article-table">
					<thead> 
						<tr> 
							<th><span class='condense left'>DATA</span></th> 
							<th><span class='condense right'>EURO</span></th> 
						</tr> 
					</thead>
					<tbody>
						${sale.payments.reduce((car, cur) => car += `
							<tr>
								<td><span class='condense left'>${DataFormatterService.formatUnixDate(cur.date)}</span></td>
								<td><span class='condense right'>€ ${DataFormatterService.centsToScreenPrice(cur.amount)}</span></td>
							</tr>
						`, '')}
					</tbody>
				</table>
			</div>
			<div class="section" style="text-align: right">
				<b style="font-size: 1em;">
					<span class='right'>Tot. Acconti € ${DataFormatterService.centsToScreenPrice(sale.payments.reduce((t, m) => t += m.amount, 0))}</span>
				</b>
				<br/>
				<b style="font-size: 1.4em">
					<span class='condense right'>Rimanente € ${DataFormatterService.centsToScreenPrice(sale.totalPrice - sale.payments.reduce((t, m) => t += m.amount, 0))}</span>
				</b>
			</div>
		`: ""}

		${sale.date ? `
			<div style="margin: 0.6em 0">
				<div style="text-align: center">
					<span class='condense'>Data ${DataFormatterService.formatUnixDate(sale.date)}</span>
					<br/>
				</div>
			</div>
		` : ''}

		${!config.barcode ? '' : `
			<div class='section' style="display: flex; justify-content: center">
				<img src="${barcodeToImage(config.barcode)}" height="13px"/>
			</div>
		`}

		<div class="section" style="text-align: center">
			<br/>
			<span class='condense'>SNF</span>
		</div>
	`;

	SPrintService.receiptPrint(toPrint);

}

function barcodeToImage(barcode: string): string {
	return BarcodeService.barcodeToB64(barcode, {
		width: 1,
		height: 13,
		margin: 0,
		displayValue: false,
	});
}
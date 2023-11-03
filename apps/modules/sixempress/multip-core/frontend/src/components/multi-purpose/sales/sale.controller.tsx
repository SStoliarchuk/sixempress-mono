import React from 'react';
import { Sale } from "./Sale";
import { DbObjectSettings, DataFormatterService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { CustomerController } from '../customers/customer.controller';
import { PricedRowsSaleController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.controller';

export interface SMPProps {
	onSaleRevoked?: () => void,
	onSaleFetched?: (s?: Sale) => void,
}

export class SaleController extends PricedRowsSaleController<Sale> {
	
	bePath = BePaths.sales;
	modelClass = ModelClass.Sale;
	protected fetchInfo: DbObjectSettings<Sale> = {};
	static showSellPrice = true;


	public static getListTotal(list: Sale['list']) {
		return SaleController.getTotal({list} as any, 'calculated');
	}

	protected getDetailsRender(item: Sale) {

		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<b>Vendita:</b>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Data: </th>
								<td>{DataFormatterService.formatUnixDate(item.date)}</td>
							</tr>
							{item.customer && (
								<tr>
									<th>Acquirente: </th>
									<td>{CustomerController.formatCustomerName(item.customer.fetched)}</td>
								</tr>
							)}
							{item._priceMeta.priceChange !== 0 && (
								<tr>
									<th>Prezzo originale: </th>
									<td>€ {DataFormatterService.centsToScreenPrice(item._priceMeta.maxTotal)}</td>
								</tr>
							)}
							<tr>
								<th>Tot. Pagato: </th>
								<td>€ {DataFormatterService.centsToScreenPrice(item.totalPrice)} {item._priceMeta.priceChange !== 0 && '(' + DataFormatterService.centsToScreenPrice(item._priceMeta.priceChange) + ')'}</td>
							</tr>
							<tr>
								<th>Guadagno netto: </th>
								<td>€ {DataFormatterService.centsToScreenPrice(item._priceMeta.net)}</td>
							</tr>
						</tbody>
					</table>
				</div>

				{SaleController.generatePeekPreviewCard(item)}

			</div>
		);
	}

}



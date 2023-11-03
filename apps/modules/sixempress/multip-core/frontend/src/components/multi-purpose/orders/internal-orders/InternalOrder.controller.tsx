import React from 'react';
import { DbObjectSettings,  DataFormatterService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { InternalOrder, InternalOrderStatusLabel } from './InternalOrder';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';

export class InternalOrderController extends PricedRowsController<InternalOrder> {
	
	bePath = BePaths.InternalOrder;
	modelClass = ModelClass.InternalOrder;
	
	protected fetchInfo: DbObjectSettings<InternalOrder> = { };

	protected getDetailsRender(item: InternalOrder) {
		return (
			<div className='peek-div-info-container'>

				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							{/* {item.customer && (
								<>
									<tr>
										<th>Cliente</th>
										<td>{CustomerController.formatCustomerName(item.customer.fetched)}</td>
									</tr>
									<tr>
										<th>N. Telefono: </th>
										<td>{item.customer.fetched.phone ? item.customer.fetched.phone : 'Non fornito'}</td>
									</tr>
								</>
							)} */}
							<tr>
								<th>Totale</th>
								<td>€ {DataFormatterService.centsToScreenPrice(item.totalPrice)}</td>
							</tr>
							<tr>
								<th style={{verticalAlign: 'top'}}>Data:</th>
								<td>
									{DataFormatterService.formatUnixDate(item.date)}
								</td>
							</tr>
							<tr>
								<th>Stato: </th>
								<td>{InternalOrderStatusLabel[item.status]}</td>
							</tr>
							{item.internalNote && (
								<tr>
									<th>Note: </th>
									<td>{item.internalNote}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{InternalOrderController.generatePeekPreviewCard(item)}
			</div>
		);
	}


}

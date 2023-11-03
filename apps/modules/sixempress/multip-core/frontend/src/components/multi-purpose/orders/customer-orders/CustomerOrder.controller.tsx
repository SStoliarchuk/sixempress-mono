import React from 'react';
import Link from '@material-ui/core/Link';
import { DbObjectSettings,  DataFormatterService, FetchableField, ModalService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { CustomerOrder, CustomerOrderStatusLabel } from './CustomerOrder';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';
import { PricedRowsSaleController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.controller';
import { FieldsNameInfo } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/Customer';


export class CustomerOrderController extends PricedRowsSaleController<CustomerOrder> {
	
	bePath = BePaths.customerorders;
	modelClass = ModelClass.CustomerOrder;
	
	protected fetchInfo: DbObjectSettings<CustomerOrder> = {};

	public static Link(p: {item: FetchableField<CustomerOrder>}) {
		return (
			<>
				<Link onClick={CustomerOrderController.openDetail} data-id={p.item.id}>
					{p.item.id}
				</Link>
			</>
		)
	}


	/**
	 * Opens a model that shows the detail of the product
	 * and takes the parames either from `data-id` and `data-type` attributs
	 * or 
	 * from the passed manual params
	 * @param eOrId React.Mouse event (fired onClick) or the product id
	 * @param givenType the type of the product: replaceemnt|product
	 */
	public static openDetail(eOrId: React.MouseEvent<any> | string) {
		const id = typeof eOrId === 'string' ? eOrId : eOrId.currentTarget.dataset.id;
		if (!id)
			return;

		ModalService.open(
			{title: 'Dettagli Trasferimento', content: CustomerOrderController.FullDetailJsx},
			{id: id},
		);
	}

	protected getDetailsRender(item: CustomerOrder) {
		return (
			<div className='peek-div-info-container'>

				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							{item.customer && (
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
							)}
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
								<td>{CustomerOrderStatusLabel[item.status]}</td>
							</tr>
							{item.customerNote && (
								<tr>
									<th>Note: </th>
									<td>{item.customerNote}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{item.billing && (
					<div className='peek-div-info-card'>
						Informazioni di pagamento {!item.shipping && 'e di spedizione'}
						<hr/>
						<table className='peek-card-table'>
							<tbody>
								{Object.keys(FieldsNameInfo).map(k => !item.billing[k] ? (null) : (
									<tr><th>{FieldsNameInfo[k]}</th><td>{item.billing[k] }</td></tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{item.shipping && (
					<div className='peek-div-info-card'>
						Informazioni di spedizione {!item.billing && 'e di pagamento'}
						<hr/>
						<table className='peek-card-table'>
							<tbody>
								{Object.keys(FieldsNameInfo).map(k => !item.shipping[k] ? (null) : (
									<tr><th>{FieldsNameInfo[k]}</th><td>{item.shipping[k] }</td></tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{CustomerOrderController.generatePeekPreviewCard(item)}
			</div>
		);
	}


}

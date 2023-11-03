import React from 'react';
import Link from '@material-ui/core/Link';
import { DbObjectSettings, DataFormatterService, BusinessLocationsService, ModalService, FetchableField, ControllersService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { TransferOrder, TransferOrderStatusLabel } from './TransferOrder';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';
import { CustomerOrderController } from '../customer-orders/CustomerOrder.controller';


export class TransferOrderController extends PricedRowsController<TransferOrder> {

	bePath = BePaths.TransferOrder;
	
	modelClass = ModelClass.TransferOrder;
	
	protected fetchInfo: DbObjectSettings<TransferOrder> = { 
	};

	public static Link(p: {item: FetchableField<TransferOrder>}) {
		return (
			<>
				{TransferOrderController.getCount(p.item.fetched, 'products')}&nbsp;-&nbsp;
				<Link onClick={TransferOrderController.openDetail} data-id={p.item.id}>
					{BusinessLocationsService.getNameById(p.item.fetched.transferOriginLocationId)}
					: {TransferOrderStatusLabel[p.item.fetched.status]}
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
			{title: 'Dettagli Trasferimento', content: TransferOrderController.FullDetailJsx},
			{id: id},
		);
	}

	protected getDetailsRender(item: TransferOrder) {

		// const GenFromClass = item._generatedFrom && ControllersService.getByModelClass(item._generatedFrom.modelClass) as any;
		
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
							{/* {(GenFromClass) && (
								<tr>
									<th>Generato Da</th>
									<td><GenFromClass.Link item={item._generatedFrom}/></td>
								</tr>
							)} */}
							{item.economicTransfer && (
								<tr>
									<th>Totale Economico</th>
									<td>€ {DataFormatterService.centsToScreenPrice(item.totalPrice)}</td>
								</tr>
							)}
							<tr>
								<th style={{verticalAlign: 'top'}}>Data:</th>
								<td>
									{DataFormatterService.formatUnixDate(item.date)}
								</td>
							</tr>
							<tr>
								<th>Stato: </th>
								<td>{TransferOrderStatusLabel[item.status]}</td>
							</tr>
							<tr>
								<th>Origine: </th>
								<td>{BusinessLocationsService.getNameById(item.transferOriginLocationId)}</td>
							</tr>
							<tr>
								<th>Destinazione: </th>
								<td>{BusinessLocationsService.getNameById(item.physicalLocation)}</td>
							</tr>
						</tbody>
					</table>
				</div>

				{PricedRowsController.generatePeekPreviewCard(item)}

			</div>
		);
	}


}

import React from 'react';
import { CustomerAppointment, CustomerAppointmentStatusLabel } from "./CustomerAppointment";
import { CustomerAppointmentsTable } from "./table/customer-appointment.table";
import { CustomerAppointmentEditor } from "./table/customer-appointment.editor";
import { DbObjectSettings, DataFormatterService } from "@sixempress/main-fe-lib";
import { CustomerController, PricedRowsSaleController } from '@sixempress/multi-purpose';
import { BePaths, ModelClass } from '../enums';

export class CustomerAppointmentController extends PricedRowsSaleController<CustomerAppointment> {
	
	bePath = BePaths.CustomerAppointment;
	modelClass = ModelClass.CustomerAppointment;
	protected editorJsx = CustomerAppointmentEditor;
	protected tableJsx = CustomerAppointmentsTable;
	protected fetchInfo: DbObjectSettings<CustomerAppointment> = {
		customer: {  },
	};

	getDetailsRender(item: CustomerAppointment) {
		
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='table table-sm'>
						<tbody>
							<tr>
								<th>Cliente</th>
								<td>{CustomerController.formatCustomerName(item.customer.fetched)}</td>
							</tr>
							<tr>
								<th>Totale</th>
								<td>€ {DataFormatterService.centsToScreenPrice(item.totalPrice)}</td>
							</tr>
							<tr>
								<th style={{verticalAlign: 'top'}}>Data: </th>
								<td>
								{item.endDate 
									? DataFormatterService.formatUnixDate(item.date) + " - " + DataFormatterService.formatUnixDate(item.endDate)
									: DataFormatterService.formatUnixDate(item.date)
								}
								</td>
							</tr>
							<tr>
								<th>N. Telefono: </th>
								<td>{item.customer.fetched.phone ? item.customer.fetched.phone : 'Non fornito'}</td>
							</tr>
							<tr>
								<th>Stato: </th>
								<td>{CustomerAppointmentStatusLabel[item.status]}</td>
							</tr>
						</tbody>
					</table>
				</div>

				{CustomerAppointmentController.generatePeekPreviewCard(item)}
			</div>
		);

	}

}

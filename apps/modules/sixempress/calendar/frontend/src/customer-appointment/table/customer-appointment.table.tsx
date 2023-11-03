import React from 'react';
import { AbstractBasicDt,   ICustomDtSettings,  DataFormatterService, DtFiltersSetting, ComponentCommunicationService, ABDTAdditionalSettings, } from "@sixempress/main-fe-lib";
import { CustomerAppointment, CustomerAppointmentStatusLabel } from "../CustomerAppointment";
import { CustomerAppointmentPdf } from "../customer-appointment.pdf";
import { CustomerAppointmentController } from "../customer-appointment.controller";
import { BePaths, CustomerController, PdfService } from '@sixempress/multi-purpose';
import { Attribute } from '../../enums';

export class CustomerAppointmentsTable extends AbstractBasicDt<CustomerAppointment> {

	controller = new CustomerAppointmentController();

	additionalSettings: ABDTAdditionalSettings<CustomerAppointment> = {
		toFetch: [{field: "customer", projection: CustomerController.formatNameProjection}],
		projection: {'_relativeSale': 1},
	};

	filterSettings: DtFiltersSetting<CustomerAppointment> = {
		timeFields: [{
			label: 'Inizio',
			modelPath: 'date',
		}, {
			label: 'Fine',
			modelPath: 'endDate',
		}],
		selectFields: [{
			label: 'Stato',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(CustomerAppointmentStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: CustomerAppointmentStatusLabel[i]}))
		}],
		amtsFields: [{
			modelPath: 'customer',
			renderValue: CustomerController.formatCustomerName,
			amtsInput: {
				bePath: BePaths.customers,
				infoConf: {
					columns: [{
						title: 'Cod.',
						data: '_progCode',
						searchOptions: {
							castToInt: true
						}
					}, {
						title: 'Nome',
						data: 'name',
					}, {
						title: 'N. Tel',
						data: 'phone'
					}]
				},
			},
			textFieldProps: {
				label: "Cliente",
			}
		}]
	};

	componentDidMount() {
		super.componentDidMount();

		// TODO move this to abstract-table
		const dtFilterData = ComponentCommunicationService.getData('dt-filters');
		if (dtFilterData) {
			this.setState({dtFiltersComponentValue: dtFilterData});
		}
	}


	getDtOptions(): ICustomDtSettings<CustomerAppointment> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: {required: [Attribute.addCustomerAppointment]},
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: {required: [Attribute.modifyCustomerAppointment]},
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
				// {
				// 	title: 'Elimina',
				// 	attributes: { required: [Attribute.deleteCustomerAppointment] },
				// 	props: {color: 'secondary'},
				// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
				// },
				{
					title: "Stampa",
					select: { type: "single", },
					onClick: (event, dt) => CustomerAppointmentPdf.printOrder(this.getRowData(dt)._id)
				},
				{
					title: "Scarica",
					select: { type: 'single', },
					hideDisabled: true,
					onClick: (e, dt) => {
						const order = this.getRowData(dt);
						CustomerAppointmentPdf.generatedOrderDD(order._id).subscribe(dd => PdfService.pdfAction(dd, 'download', 'Order N ' + order._progCode));
					}
				},
				// {
				// 	text: 'Completa ora',
				// 	attributes: { required: [Attribute.modifyRepairs] },
				// 	select: {type: 'single', enabled: (model) => !model._relativeSale, },
				// 	hideDisabledButton: true,
				// 	action: (event, dt) => {
				// 		const item = this.getRowData(dt);
				// 		ConfirmModalComponent.open(
				// 			"Conferma completamento", 
				// 			"Trattamento N." + item._progCode + "   . Cliente: " + item.customer.fetched._progCode + " | " + item.customer.fetched.name, 
				// 			(r) => {
				// 				if (!r) { return; }
				// 				GenericController.patch<CustomerAppointment>(
				// 					this.controllerUrl, 
				// 					item._id, 
				// 					[
				// 						{op: 'set', path: 'status', value: true},
				// 					],
				// 				).subscribe(() => {
				// 					SmallUtils.notify( 'Consegnato con successo', "success" ); 
				// 					this.reloadTable(); 
				// 				});
				// 			}
				// 		);
				// 	}
				// },
			],
			columns: [
				{
					title: "Codice",
					data: "_progCode",
					search: {
						regex: false,
						toInt: true,
					}
				},
				{
					title: 'Inizio',
					data: 'date',
					render: d => DataFormatterService.formatUnixDate(d),
				},
				{
					title: 'Fine',
					data: 'endDate',
					render: d => d && DataFormatterService.formatUnixDate(d),
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => CustomerController.formatCustomerName(row.customer.fetched),
				},
				{
					title: 'Preventivo',
					data: 'totalPrice',
					render: d => DataFormatterService.centsToScreenPrice(d),
				},
				{
					title: 'Stato',
					data: 'status',
					render: s => CustomerAppointmentStatusLabel[s],
				},
			],
			renderDetails: (item) => <CustomerAppointmentController.FullDetailJsx id={item._id}/>,
			// renderDetails: (item) => new CustomerAppointmentController().renderFullObjectDetails(item._id).pipe(map(j => ReactDOMServer.renderToString(j.jsx))),
		};
	}

}

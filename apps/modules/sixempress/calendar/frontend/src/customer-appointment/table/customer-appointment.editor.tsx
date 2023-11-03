import React from 'react';
import {   AbstractEditorProps, TopLevelEditorPart, IMongoDBFetch } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from "react-reactive-form";
import { CustomerAppointment, CustomerAppointmentStatus, CustomerAppointmentStatusLabel } from '../CustomerAppointment';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import { CustomerAppointmentPdf } from '../customer-appointment.pdf';
import { CustomerAppointmentController } from '../customer-appointment.controller';
import { CustomerController, PricedRowsEditor } from '@sixempress/multi-purpose';
import moment from 'moment';

export class CustomerAppointmentEditor extends PricedRowsEditor<CustomerAppointment> {

	controller = new CustomerAppointmentController();
	
	fieldsToFetch: IMongoDBFetch<CustomerAppointment>[] = [
		...CustomerAppointmentController.getSaleableModelFetchField()
	];

	getEditorConfiguration(): AbstractEditorProps<CustomerAppointment> {
		return {
			saveActionArea: () => (
				<Box display='flex' flexDirection='row-reverse'>
					<Button disabled={this.state.formGroup && this.state.formGroup.invalid} variant='contained' color='primary' onClick={this.saveAndPrint}>Salva e Stampa</Button>
					<Button disabled={this.state.formGroup && this.state.formGroup.invalid} color='primary' onClick={this.saveToBe}>Salva</Button>
				</Box>
			)
		};
	}

	private saveAndPrint = (e?: any) => this.send().subscribe(id => CustomerAppointmentPdf.printOrder(id));

	generateEditorSettings(val: CustomerAppointment = {} as any): TopLevelEditorPart<CustomerAppointment>[] {

		return [
			{
				type: "formControl",
				logic: {
					component: "SelectAsyncModel",
					key: 'customer',
					label: 'Cliente',
					props: CustomerController.AmtsFieldProps(),
					required: true,
				}
			},
			{ type: "divider", },
			{
				type: 'formControl',
				logic: {
					component: 'DateTimePicker',
					key: 'date',
					label: 'Inizio',
					required: true,
					value: ((this.props as any).calendar && (this.props as any).calendar.date) || val.date || moment().startOf('hour').unix(),
					props: { onChange: (m) => {
						this.state.formGroup.get('date').patchValue(m.unix());
						this.state.formGroup.get('endDate').patchValue(m.add(30, 'm').unix());
					} }
				},
			},
			{
				type: 'formControl',
				logic: {
					component: 'DateTimePicker',
					key: 'endDate',
					label: 'Fine',
					value: ((this.props as any).calendar && (this.props as any).calendar.endDate) || val.date || moment().startOf('hour').add(30, 'm').unix(),
				},
			},
			{ type: "divider", },
			{
				type: "formControl",
				logic: {
					component: "SelectField",
					key: 'status',
					label: 'Stato',
					control: new FormControl(val.status || CustomerAppointmentStatus.pending, Validators.required),
					values: Object.values(CustomerAppointmentStatusLabel).filter(i => typeof i === 'number').map(i => ({
						value: i,
						label: CustomerAppointmentStatusLabel[i]
					})),
				}
			},
			{ type: "divider", },
			{
				type: 'formControl',
				gridProp: {md: 12},
				logic: {
					component: 'TextArea',
					key: 'internalNotes',
					label: 'Note'
				},
			},
		
			{ type: 'cut' },
		];
	}

}

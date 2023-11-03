import React from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { AbstractEditorProps,  TopLevelEditorPart, IMongoDBFetch } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from "react-reactive-form";
import { CustomerOrder, CustomerOrderStatus, CustomerOrderStatusLabel } from '../CustomerOrder';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';
import { PricedRowsEditor } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.editor';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';
import { FieldsNameInfo } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/Customer';
import { CustomerOrdersPdf } from '../customer-orders.pdf';
import { CustomerOrderController } from '../CustomerOrder.controller';

export class CustomerOrderEditor extends PricedRowsEditor<CustomerOrder> {

	controller = new CustomerOrderController();
	
	fieldsToFetch: IMongoDBFetch<CustomerOrder>[] = [
		{field: 'customer'},
		...PricedRowsController.getSaleableModelFetchField(),
	];
	
	private saveAndPrint = (e?: any) => this.send().toPromise().then(id => CustomerOrdersPdf.printOrder(id));

	getEditorConfiguration(): AbstractEditorProps<CustomerOrder> {
		return {
			saveActionArea: () => (
				<Box display='flex' flexDirection='row-reverse'>
					<Button disabled={this.state.formGroup && this.state.formGroup.invalid} variant='contained' color='primary' onClick={this.saveAndPrint}>Salva e Stampa</Button>
					<Button disabled={this.state.formGroup && this.state.formGroup.invalid} color='primary' onClick={this.saveToBe}>Salva</Button>
				</Box>
			)
		};
	}

	generateEditorSettings(val: CustomerOrder = {} as any): TopLevelEditorPart<CustomerOrder>[] {

		return [
			{
				type: 'formControl',
				logic: {
					key: 'date',
					label: 'Data',
					component: 'DateTimePicker',
				},
			},
			{type: 'divider'},
			{
				type: "formControl",
				logic: {
					component: "SelectAsyncModel",
					key: 'customer',
					label: 'Cliente',
					props: CustomerController.AmtsFieldProps({amtsInput: {
						projection: false,
						afterChose: (c) => {

							for (const f in FieldsNameInfo) {
								this.state.formGroup.get('billing').get(f).patchValue((c.billing && c.billing[f]) || undefined);
								this.state.formGroup.get('shipping').get(f).patchValue((c.shipping && c.shipping[f]) || undefined);
							}

						},
					}}),
					required: true,
				}
			},
			{
				type: "formControl",
				logic: {
					component: "SelectField",
					key: 'status',
					label: 'Stato',
					control: new FormControl(val.status || CustomerOrderStatus.pending, Validators.required),
					values: Object.values(CustomerOrderStatusLabel).filter(i => typeof i === 'number').map(i => ({
						value: i,
						label: CustomerOrderStatusLabel[i]
					})),
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'internalNote',
					label: 'Note Interne',
				},
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'customerNote',
					label: 'Note Cliente',
					props: {helperText: 'Verranno Stampate'},
				},
			},
			{ type: 'cut' },
			{
				type: 'formGroup',
				gridProp: {md: 12, style: {padding: 0}},
				wrapRender: (r) => (
					<Accordion className='b-0'>
						<AccordionSummary expandIcon={<ExpandMoreIcon/>}>
							<Typography>Informazioni di Spedizione</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={2}>
								{r}
							</Grid>
						</AccordionDetails>
					</Accordion>
				),
				logic: {
					key: 'shipping',
					parts: [
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'first_name', label: FieldsNameInfo.first_name}},
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'last_name', label: FieldsNameInfo.last_name}},
						{type: 'formControl', gridProp: {md: 4}, logic: {component: 'TextField', key: 'address_1', label: FieldsNameInfo.address_1}},
						{type: 'formControl', gridProp: {md: 4}, logic: {component: 'TextField', key: 'address_2', label: FieldsNameInfo.address_2}},
						{type: 'formControl', gridProp: {md: 4}, logic: {component: 'TextField', key: 'company', label: FieldsNameInfo.company}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'country', label: FieldsNameInfo.country}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'city', label: FieldsNameInfo.city}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'state', label: FieldsNameInfo.state}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'postcode', label: FieldsNameInfo.postcode}},
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'email', label: FieldsNameInfo.email}},
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'phone', label: FieldsNameInfo.phone}},
					]
				},
			},
			{ type: 'divider' },
			{
				type: 'formGroup',
				gridProp: {md: 12, style: {padding: 0}},
				wrapRender: (r) => (
					<Accordion className='b-0'>
						<AccordionSummary expandIcon={<ExpandMoreIcon/>}>
							<Typography>Informazioni di Fattura</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Grid container spacing={2}>
								{r}
							</Grid>
						</AccordionDetails>
					</Accordion>
				),
				logic: {
					key: 'billing',
					parts: [
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'first_name', label: FieldsNameInfo.first_name}},
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'last_name', label: FieldsNameInfo.last_name}},
						{type: 'formControl', gridProp: {md: 4}, logic: {component: 'TextField', key: 'address_1', label: FieldsNameInfo.address_1}},
						{type: 'formControl', gridProp: {md: 4}, logic: {component: 'TextField', key: 'address_2', label: FieldsNameInfo.address_2}},
						{type: 'formControl', gridProp: {md: 4}, logic: {component: 'TextField', key: 'company', label: FieldsNameInfo.company}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'country', label: FieldsNameInfo.country}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'city', label: FieldsNameInfo.city}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'state', label: FieldsNameInfo.state}},
						{type: 'formControl', gridProp: {md: 3}, logic: {component: 'TextField', key: 'postcode', label: FieldsNameInfo.postcode}},
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'email', label: FieldsNameInfo.email}},
						{type: 'formControl', gridProp: {md: 6}, logic: {component: 'TextField', key: 'phone', label: FieldsNameInfo.phone}},
					]
				},
			},
		];
	}

	protected generateToSaveObjectByFormGroup(b: CustomerOrder) {
		for (const f of ['billing', 'shipping'] as (keyof Pick<CustomerOrder, 'billing' | 'shipping'>)[]) {
			for (const k in b[f])
				if (!b[f][k])
					delete b[f][k];
					
			if (!Object.keys(b[f]).length)
				delete b[f];
		}
	}

}

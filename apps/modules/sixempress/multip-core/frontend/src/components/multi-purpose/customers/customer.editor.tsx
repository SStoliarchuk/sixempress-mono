import { AbstractEditor, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import { Customer, FieldsNameInfo } from './Customer';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { CustomerController } from './customer.controller';

export class CustomerEditor extends AbstractEditor<Customer> {

	controller = new CustomerController();

	generateEditorSettings(val: Customer = {} as any): TopLevelEditorPart<Customer>[] {
		return [
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'name',
					label: 'Nome',
					required: true,
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'lastName',
					label: 'Cognome',
					required: true,
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'phone',
					label: 'Num. Telefono',
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'email',
					label: 'E-Mail',
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'address',
					label: 'Indirizzo',
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'fiscalCode',
					label: 'Codice Fiscale',
				}
			},
			{ type: "cut" },
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
			{ type: "cut" },
			{
				type: 'formControl',
				gridProp: {md: 12},
				logic: {
					component: 'TextArea',
					key: 'notes',
					label: 'Note'
				},
			},
		];
	}

}

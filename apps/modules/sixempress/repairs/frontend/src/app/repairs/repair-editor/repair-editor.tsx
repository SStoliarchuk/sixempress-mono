import React from 'react';
import { LibModelClass, EditorAmtsConfig, AbstractEditorProps, TopLevelEditorPart, IMongoDBFetch } from '@sixempress/main-fe-lib';
import { BePaths as MultipBePaths } from '@sixempress/multi-purpose';
import { FormControl, Validators } from "react-reactive-form";
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { RepairStatus, RepairStatusLabel, DeviceType, DeviceTypeLabel, CustomerNotice, CustomerNoticeLabel, Repair } from '../Repair';
import { RepairsPdf } from '../pdf/repairs.pdf';
import { CustomerController } from '@sixempress/multi-purpose';
import { RepairController } from '../repair.controller';
import { PricedRowsEditor } from '@sixempress/multi-purpose';
import { MultipUserController } from '@sixempress/multi-purpose';
import { User } from '@sixempress/abac-frontend';


export class RepairEditor extends PricedRowsEditor<Repair> {

	controller = new RepairController();

	fieldsToFetch: IMongoDBFetch<Repair>[] = [
		{field: 'assignedTo'},
		{field: '_opReportLastAuthor._author'},
		...RepairController.getSaleableModelFetchField()
	];
	
	getEditorConfiguration(): AbstractEditorProps<Repair> {
		return {
			saveActionArea: () => (
				<Box display='flex' flexDirection='row-reverse'>
					<Button disabled={this.state.formGroup && this.state.formGroup.invalid} variant='contained' color='primary' onClick={this.saveAndPrint}>Salva e Stampa</Button>
					<Button disabled={this.state.formGroup && this.state.formGroup.invalid} color='primary' onClick={this.saveToBe}>Salva</Button>
				</Box>
			)
		};
	}

	protected saveAndPrint = (e?: any) => this.send().subscribe(id => RepairsPdf.pdf('print', 'entrance', id));

	private asyncUserConf: EditorAmtsConfig<User> = {
		renderValue: MultipUserController.formatName,
		modelClass: LibModelClass.User,
		amtsInput: {
			bePath: MultipBePaths.userlist,
			// editor: AuthService.isAttributePresent(Attribute.addCustomers) && CustomerEditor,
			infoConf: { columns: [{
				title: 'Cod.',
				data: '_progCode',
				searchOptions: {
					castToInt: true
				}
			}, {
				title: 'Nome',
				data: 'name',
			}, {
				title: 'Username',
				data: 'username',
			}] }
		}
	};
	

	generateEditorSettings(val: Repair = {} as any): TopLevelEditorPart<Repair>[] {
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
			// {
			// 	type: 'formControl',
			// 	logic: {
			// 		component: 'DateTimePicker',
			// 		key: 'date',
			// 		value: val.date || new Date(),
			// 		label: 'Entrato il',
			// 		required: true,
			// 	}
			// },
			{ type: 'divider' },
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'deviceType',
					required: true,
					label: 'Tipo Dispositivo',
					values: Object.values(DeviceType).filter(i => typeof i === 'number').map(n => ({label: DeviceTypeLabel[n], value: n}))
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'model',
					required: true,
					label: 'Modello'
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'color',
					required: true,
					label: 'Colore'
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'deviceCode',
					label: 'Password di sblocco'
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'accessories',
					label: 'Accessori'
				}
			},
			{type: 'divider'},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'defects',
					required: true,
					label: 'Difetti dichiarati'
				},
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'visibleDefects',
					label: 'Difetti visibili'
				},
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'diagnostic',
					label: 'Diagnostica'
				},
			},
			{type: 'divider'},
			{
				type: 'formControl',
				logic: {
					component: 'DateTimePicker',
					key: 'estimatedRepairTime',
					label: 'Tempo riparazione'
				}
			},
			{
				type: "formControl",
				logic: {
					component: "SelectAsyncModel",
					key: 'assignedTo',
					label: 'Operatore Assegnato',
					props: this.asyncUserConf,
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextArea',
					key: 'notes',
					label: 'Note'
				},
			},
			{type: "divider"},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'status',
					control: new FormControl(val.status || RepairStatus.entry, Validators.required),
					label: 'Stato riparazione',
					values: Object.values(RepairStatusLabel).filter(i => typeof i === 'number').map(n => ({label: RepairStatusLabel[n], value: n}))
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'customerNotice',
					control: new FormControl(val.customerNotice),
					label: 'Comunicazione',
					values: Object.values(CustomerNotice).filter(i => typeof i === 'number').map(n => ({label: CustomerNoticeLabel[n], value: n}))
				}
			},
		];
	}

	protected generateToSaveObjectByFormGroup(toSave: Repair) {
		if (this.objFromBe && this.objFromBe.opReport)
			toSave.opReport = this.objFromBe.opReport;
	}

}

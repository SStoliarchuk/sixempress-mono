import React from 'react';
import { Repair, RepairStatus, RepairStatusLabel, CustomerNotice, CustomerNoticeLabel } from "../Repair";
import { IEditorPart, ObjectUtils, DataFormatterService } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from 'react-reactive-form';
import { RepairEditor } from '../repair-editor/repair-editor';
import Box from '@material-ui/core/Box';
import { RepairsPdf } from '../pdf/repairs.pdf';
import { PricedRowsModelForm } from '@sixempress/multi-purpose';
import { MultipUserController } from '@sixempress/multi-purpose';
// import React from 'react';

export class RepairOperations extends RepairEditor {

	protected saveAndPrint = (e?: any) => this.send().subscribe(id => RepairsPdf.pdf('print', 'exit', id));

	generateEditorSettings(val: Repair = {} as any): IEditorPart<Repair>[] {
		return [
			{
				type: "jsx",
				component: () => !val._opReportLastAuthor ? (null) : (
					<Box display='flex' justifyContent='space-between'>
						<span>{MultipUserController.formatName(val._opReportLastAuthor._author)}</span>
						<span>{DataFormatterService.formatUnixDate(val._opReportLastAuthor._timestamp)}</span>
					</Box>
				)
			},
			{
				type: "formControl",
				logic: {
					component: "TextArea",
					key: 'diagnostic',
					label: 'Diagnostica Riscontrata',
				},
			},
			{
				type: "formControl",
				logic: {
					component: "TextArea",
					key: 'opReport',
					label: 'Rapporto intervento',
				},
			},
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
		// clone as to later it has to be compared to the objFromBe
		const clone = ObjectUtils.cloneDeep(this.objFromBe);
		
		// reassing values and yeet back
		clone.diagnostic = toSave.diagnostic;
		clone.opReport = toSave.opReport;
		clone.status = toSave.status;
		clone.customerNotice = toSave.customerNotice;
		
		(clone as PricedRowsModelForm<any>)._totalPriceControl = (toSave as PricedRowsModelForm<any>)._totalPriceControl;
		clone.totalPrice = toSave.totalPrice;
		clone.list = toSave.list;
		clone.payments = toSave.payments;

		return clone;
	}


}

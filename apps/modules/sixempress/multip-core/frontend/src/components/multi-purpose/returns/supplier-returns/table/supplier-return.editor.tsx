import { IMongoDBFetch, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import { SupplierReturnStatusLabel, SupplierReturn, SupplierReturnStatus } from "../SupplierReturn";
import { PricedRowsEditor } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.editor';
import { SupplierReturnController } from '../SupplierReturn.controller';

export class SupplierReturnEditor extends PricedRowsEditor<SupplierReturn> {

	controller = new SupplierReturnController();

	fieldsToFetch: IMongoDBFetch<SupplierReturn>[] = [
		...SupplierReturnController.getSaleableModelFetchField(),
	];

	generateEditorSettings(val: SupplierReturn = {} as any): TopLevelEditorPart<SupplierReturn>[] {
		return [
			{
				type: 'formControl',
				logic: {
					key: 'date',
					label: 'Data',
					component: 'DateTimePicker',
				},
			},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'status',
					label: 'Stato Reso',
					required: true,
					value: val.status || SupplierReturnStatus.processing,
					values: Object.values(SupplierReturnStatusLabel).filter(v => typeof v === 'number').map(v => ({label: SupplierReturnStatusLabel[v], value: v})),
				}
			},
		];
	}

}

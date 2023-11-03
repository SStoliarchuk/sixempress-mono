import { TopLevelEditorPart, IMongoDBFetch } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from "react-reactive-form";
import { InternalOrder, InternalOrderStatus, InternalOrderStatusLabel } from '../InternalOrder';
import { PricedRowsEditor } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.editor';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';
import { InternalOrderController } from '../InternalOrder.controller';

export class InternalOrderEditor extends PricedRowsEditor<InternalOrder> {

	controller = new InternalOrderController();;
	
	fieldsToFetch: IMongoDBFetch<InternalOrder>[] = [
		...PricedRowsController.getSaleableModelFetchField(),
	];
	
	canEditVariants = true;

	generateEditorSettings(val: InternalOrder = {} as any): TopLevelEditorPart<InternalOrder>[] {

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
				type: "formControl",
				logic: {
					component: "SelectField",
					key: 'status',
					label: 'Stato',
					control: new FormControl(val.status || InternalOrderStatus.pending, Validators.required),
					values: Object.values(InternalOrderStatusLabel).filter(i => typeof i === 'number').map(i => ({
						value: i,
						label: InternalOrderStatusLabel[i]
					})),
				}
			},
			{
				type: 'formControl',
				gridProp: {md: 12},
				logic: {
					component: 'TextArea',
					key: 'internalNote',
					label: 'Note ordine',
				},
			},
		];
	}
	
	getCalculatedTotal(m: InternalOrder) {
		return PricedRowsController.getTotal(m, 'buyPrice');
	}

}

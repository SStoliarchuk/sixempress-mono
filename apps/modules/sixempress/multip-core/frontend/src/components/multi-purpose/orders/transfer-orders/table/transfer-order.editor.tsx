import { TopLevelEditorPart, IMongoDBFetch, CustomValidators, BusinessLocationsService } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from "react-reactive-form";
import { TransferOrder, TransferOrderStatus, TransferOrderStatusLabel } from '../TransferOrder';
import { PricedRowsEditor } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.editor';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';
import { TransferOrderController } from '../TransferOrder.controller';

export class TransferOrderEditor extends PricedRowsEditor<TransferOrder> {

	controller = new TransferOrderController();
	
	allowPriceEdit = false;

	fieldsToFetch: IMongoDBFetch<TransferOrder>[] = [
		...PricedRowsController.getSaleableModelFetchField(),
	];

	generateEditorSettings(val: TransferOrder = {} as any): TopLevelEditorPart<TransferOrder>[] {

		const allLocs = BusinessLocationsService.getLocationsFilteredByUser(false);
		const formattedLocs = BusinessLocationsService.formatLocationsForSelect(allLocs);
		const origin = val.transferOriginLocationId || allLocs.find(i => i._id !== BusinessLocationsService.chosenLocationId)?._id;

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
					control: new FormControl(val.status || TransferOrderStatus.pending, Validators.required),
					values: Object.values(TransferOrderStatusLabel).filter(i => typeof i === 'number').map(i => ({
						value: i,
						label: TransferOrderStatusLabel[i]
					})),
				}
			},
			{type: 'divider'},
			{
				type: "formControl",
				logic: {
					component: "SelectField",
					key: 'transferOriginLocationId',
					label: 'Posizione di origine',
					control: new FormControl(origin, [Validators.required, CustomValidators.differentFromFieldByRegex(/^physicalLocation$/)]),
					values: formattedLocs,
				}
			},
			{
				type: "formControl",
				gridProp: {style: {alignSelf: 'center'}},
				logic: {
					component: "Checkbox",
					key: 'economicTransfer',
					label: 'Trasferimento Economico',
					value: this.objFromBe ? val.economicTransfer : true,
				}
			},
			// {
			// 	type: 'formControl',
			// 	gridProp: {md: 12},
			// 	logic: {
			// 		component: 'TextArea',
			// 		key: 'internalNote',
			// 		label: 'Note ordine',
			// 	},
			// },
		];
	}

	getCalculatedTotal(m: TransferOrder) {
		return PricedRowsController.getTotal(m, 'buyPrice');
	}

	protected generateToSaveObjectByFormGroup(m: TransferOrder) {
		if (!m.economicTransfer)
			delete m.economicTransfer;
	}

}

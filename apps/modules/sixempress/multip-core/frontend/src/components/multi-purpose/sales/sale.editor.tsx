import { IMongoDBFetch, TopLevelEditorPart } from "@sixempress/main-fe-lib";
import { FormControl, Validators } from "react-reactive-form";
import { PricedRowsEditor } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.editor";
import { CustomerController } from "../customers/customer.controller";
import { Sale, SaleStatus, SaleStatusLabel } from "./Sale";
import { SaleController } from "./sale.controller";

export class SaleEditor extends PricedRowsEditor<Sale> {

	controller = new SaleController();
	
	fieldsToFetch: IMongoDBFetch<Sale>[] = [
		...SaleController.getSaleableModelFetchField(),
	];

	generateEditorSettings(val: Sale = {} as any): TopLevelEditorPart<Sale>[] {
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
					props: CustomerController.AmtsFieldProps(),
					required: false,
				}
			},
			{
				type: "formControl",
				logic: {
					component: "SelectField",
					key: 'status',
					label: 'Stato',
					control: new FormControl(val.status || SaleStatus.success, Validators.required),
					values: Object.values(SaleStatusLabel).filter(i => typeof i === 'number').map(i => ({
						value: i,
						label: SaleStatusLabel[i]
					})),
				}
			}
		];
	}

}

import { AbstractEditor, IMongoDBFetch, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import { FormControl, Validators } from "react-reactive-form";
import { UsedProduct } from "./UsedProduct";
import { UsedProductController } from './used-products.controller';
import { CustomerController } from '@sixempress/multi-purpose';

export class UsedProductEditor extends AbstractEditor<UsedProduct> {

	controller = new UsedProductController();
	fieldsToFetch: IMongoDBFetch<UsedProduct>[] = new UsedProductController().getFullFetch();

	generateEditorSettings(val: UsedProduct = {} as any): TopLevelEditorPart<UsedProduct>[] {
		return [
			{
				type: 'formControl',
				logic: {
					component: 'SelectAsyncModel',
					props: CustomerController.AmtsFieldProps(),
					key: 'seller',
					label: 'Venditore',
					required: true,
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'name',
					label: 'Nome Prodotto',
					control: new FormControl(val.name, Validators.required)
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'PriceField',
					key: 'buyPrice',
					label: "Prezzo D'Acquisto",
					props: {helperText: 'es 25.00'},
					required: true,
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'PriceField',
					key: 'sellPrice',
					label: "Prezzo di Vendita",
					props: {helperText: 'es 25.00'},
					required: true,
				}
			},
			{
				type: 'formGroup',
				logic: {
					key: 'additionalInfo',
					parts: [
						{
							type: 'formControl',
							logic: {
								component: 'TextField',
								key: 'imeiNumber',
								label: "Codice imei",
							}
						}
					]
				}
			},
			{
				type: 'formControl',
				gridProp: {md: 12},
				logic: {
					component: 'TextArea',
					key: 'description',
					label: "Descrizione",
					control: new FormControl(val.description)
				}
			},
		];
	}

	generateToSaveObjectByFormGroup(t: UsedProduct) {
		if (Object.keys(t.additionalInfo).length === 0) {
			delete t.additionalInfo;
		}
	}
}
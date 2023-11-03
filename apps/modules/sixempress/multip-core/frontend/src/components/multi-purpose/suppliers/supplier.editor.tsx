import { AbstractEditor, IEditorPart } from '@sixempress/main-fe-lib';
import { Supplier } from './Supplier';
import { SupplierController } from './supplier.controller';

export class SupplierEditor extends AbstractEditor<Supplier> {

	controller = new SupplierController();

	generateEditorSettings(val: Supplier = {} as any): IEditorPart<Supplier>[] {
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
					key: 'piva',
					label: 'P. IVA',
				}
			},
			{type: 'divider'},
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
			{type: 'divider'},
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
					key: 'province',
					label: 'Provincia',
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'TextField',
					key: 'cap',
					label: 'CAP',
				}
			},
		]
	}

}

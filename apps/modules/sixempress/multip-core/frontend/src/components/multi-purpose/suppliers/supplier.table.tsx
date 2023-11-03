import { Supplier } from './Supplier';
import { AbstractBasicDt, ICustomDtSettings, } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { SupplierController } from './supplier.controller';

export class SupplierTable extends AbstractBasicDt<Supplier> {

	controller = new SupplierController();

	protected getDtOptions(): ICustomDtSettings<Supplier> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addSuppliers] },
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifySuppliers] },
					select: { type: "single", },
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
			],
			columns: [
				{
					title: 'Cod. Fornitore',
					data: '_progCode'
				},
				{
					title: 'Nome',
					data: 'name'
				},
				{
					title: 'N.Telefono',
					data: 'phone'
				},
				{
					title: 'E-Mail',
					data: 'email'
				},
				{
					title: 'P. IVA',
					data: 'piva'
				}
			],
		};
	}

}
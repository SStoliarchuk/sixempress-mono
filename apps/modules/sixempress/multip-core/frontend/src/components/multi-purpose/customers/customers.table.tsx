import { Customer } from './Customer';
import { AbstractBasicDt, ICustomDtSettings, ABDTAdditionalSettings } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { isModelCreatedFromRemote, modelFromRemoteProjections } from 'apps/modules/sixempress/multip-core/frontend/src/utils/syncable.model';
import { CustomerController } from './customer.controller';

export class CustomersTable extends AbstractBasicDt<Customer> {

	controller = new CustomerController();
	
	additionalSettings: ABDTAdditionalSettings<Customer> = {
		projection: modelFromRemoteProjections(),
	};

	protected getDtOptions(): ICustomDtSettings<Customer> {
		const toR: ICustomDtSettings<Customer> = {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: {required: [Attribute.addCustomers]},
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: {required: [Attribute.modifyCustomers]},
					select: {type: 'single', enabled: (i) => !isModelCreatedFromRemote(i) },
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
				{
					title: 'Elimina',
					attributes: { required: [Attribute.deleteCustomers] },
					props: {color: 'secondary'},
					select: { type: "single", },
					onClick: (e, dt) => this.sendDeleteRequest(dt)
				},
				{
					title: 'Dettagli',
					select: { type: "single", },
					onClick: (event, dt) => {
						this.relativeNavigation('/details/' + this.getRowData(dt)._id);
					}
				},
			],
			columns: [
				{
					title: 'Cod. Cliente',
					data: '_progCode',
					search: { toInt: true }
				},
				{
					title: 'Nome',
					data: 'name',
					search: {manual: CustomerController.createCustomerNameQuery},
				},
				{
					title: 'Cognome',
					data: 'lastName',
					search: false,
				},
				{
					title: 'N.Telefono',
					data: 'phone'
				},
				{
					title: 'E-Mail',
					data: 'email'
				}
			],
		};
		return toR;
	}

}
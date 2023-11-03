import { IMongoDBFetch, ModalService, TopLevelEditorPart } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { CustomerReturnStatusLabel, CustomerReturnItemStatusLabel, CustomerReturn, CustomerReturnStatus, CustomerReturnItemStatus } from "../CustomerReturn";
import { CustomerController } from '../../../customers/customer.controller';
import { PricedRowsEditor } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.editor';
import { CustomerReturnController } from '../customer-return.controller';
import { ErrorCodes } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';

export class CustomerReturnEditor extends PricedRowsEditor<CustomerReturn> {

	controller = new CustomerReturnController();

	fieldsToFetch: IMongoDBFetch<CustomerReturn>[] = [
		...CustomerReturnController.getSaleableModelFetchField(),
	];

	protected onSaveError(error: any) {
		const err = error && error.data;
		if (err && err.code === ErrorCodes.customerReturnCouponUsed) {
			ModalService.open({
				title: 'Modifica non possibile',
				content: 'Il Buono Cassa creato da questo Reso e\' stato utilizzato dal cliente, pertanto e\' impossibile modificare questo reso',
			});
		} 
		else {
			throw error;
		}
	}


	generateEditorSettings(val: CustomerReturn = {} as any): TopLevelEditorPart<CustomerReturn>[] {
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
				attributes: {required: [Attribute.viewCustomers]},
				logic: {
					component: 'SelectAsyncModel',
					props: CustomerController.AmtsFieldProps(),
					key: 'customer',
					label: 'Cliente',
				},
			},
			{type: 'divider'},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'status',
					label: 'Stato Reso',
					required: true,
					value: val.status || CustomerReturnStatus.accepted,
					values: Object.values(CustomerReturnStatusLabel).filter(v => typeof v === 'number').map(v => ({label: CustomerReturnStatusLabel[v], value: v})),
				}
			},
			{
				type: 'formControl',
				logic: {
					component: 'SelectField',
					key: 'itemStatus',
					label: 'Stato Elementi',
					required: true,
					value: val.itemStatus || CustomerReturnItemStatus.itemsWorking,
					values: Object.values(CustomerReturnItemStatusLabel).filter(v => typeof v === 'number').map(v => ({label: CustomerReturnItemStatusLabel[v], value: v})),
				}
			},
		];
	}

}

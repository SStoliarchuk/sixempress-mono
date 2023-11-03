import { CustomerReturnItemStatusLabel, CustomerReturn, CustomerReturnStatusLabel, CustomerReturnItemStatus, CustomerReturnStatus } from '../CustomerReturn';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService,  ABDTAdditionalSettings, DtFiltersSetting, TableVariation } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { CustomerReturnController } from '../customer-return.controller';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';

export class CustomerReturnsTable extends AbstractBasicDt<CustomerReturn> {

	controller = new CustomerReturnController();

	additionalSettings: ABDTAdditionalSettings<CustomerReturn> = {
		toFetch: [{field: "customer", projection: CustomerController.formatNameProjection}],
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
		]
	}

	filterSettings: DtFiltersSetting<CustomerReturn> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: 'Entrata',
			modelPath: 'date',
		}],
		selectFields: [{
			label: 'Stato Reso',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(CustomerReturnStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: CustomerReturnStatusLabel[i]}))
		}, {
			label: 'Stato Elementi',
			modelPath: 'itemStatus',
			multiple: true,
			availableValues: Object.values(CustomerReturnItemStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: CustomerReturnItemStatusLabel[i]}))
		}],
	};

	defaultAvailableTables: TableVariation[] = [{
		name: 'Danneggiato da Risolvere',
		filters: {
			itemStatus: {$in: [CustomerReturnItemStatus.itemsDamaged]},
			status: {$in: [CustomerReturnStatus.accepted, CustomerReturnStatus.pending]}
		}
	}];

	protected getDtOptions(): ICustomDtSettings<CustomerReturn> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: { required: [Attribute.addCustomerReturns] },
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifyCustomerReturns] },
					select: {type: 'single', enabled: (model) => !model.endDate, },
					onClick: (event, dt) => this.openEditor(dt)
				},
				// {
				// 	title: 'Elimina',
				// 	props: {color: 'secondary'},
				// 	attributes: { required: [Attribute.deleteCustomerReturns] },
				// 	select: { type: "single" },
				// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
				// },
			],
			columns: [
				{
					title: 'Cod',
					data: '_progCode',
					search: { toInt: true },
				},
				{
					title: 'Data',
					data: 'date',
					search: false,
					render: (d) => DataFormatterService.formatUnixDate(d),
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => CustomerController.formatCustomerName(row.customer?.fetched),
					search: {manual: v => CustomerController.createCustomerNameQuery(v, 'customer.fetched')},
				},
				{
					title: 'Stato Reso',
					data: 'status',
					search: false,
					render: (d) => CustomerReturnStatusLabel[d],
				},
				{
					title: 'Stato Elementi',
					data: 'itemStatus',
					search: false,
					render: (d) => CustomerReturnItemStatusLabel[d],
				},
			],
			renderDetails: (item) => <CustomerReturnController.FullDetailJsx id={item._id}/>,
		};
	}

}

import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, DtFiltersSetting, TableVariation, ABDTAdditionalSettings, ReactUtils, ComponentCommunicationService,} from "@sixempress/main-fe-lib";
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { CustomerOrder, CustomerOrderStatus, CustomerOrderStatusLabel } from "../CustomerOrder";
import { CustomerOrderController } from '../CustomerOrder.controller';
import { isModelCreatedFromRemote, modelFromRemoteProjections } from 'apps/modules/sixempress/multip-core/frontend/src/utils/syncable.model';
import { CustomerController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.controller';
import { CustomerOrdersPdf } from '../customer-orders.pdf';
import { PdfService } from 'apps/modules/sixempress/multip-core/frontend/src/services/pdf/pdf.service';

export class CustomerOrdersTable extends AbstractBasicDt<CustomerOrder> {

	controller = new CustomerOrderController();

	defaultAvailableTables: TableVariation[] = [{
		name: 'Da completare',
		filters: {
			status: {$in: [CustomerOrderStatus.processing, CustomerOrderStatus.onHold]},
		}
	}];

	additionalSettings: ABDTAdditionalSettings<CustomerOrder> = {
		toFetch: [{field: 'customer', projection: CustomerController.formatNameProjection}],
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
		],
		projection: {
			...modelFromRemoteProjections() as {[a: string]: 1}, 
			'billing.first_name': 1,
			'billing.last_name': 1,
			'shipping.first_name': 1,
			'shipping.last_name': 1,
			'_relativeSale': 1,
		},
	};

	filterSettings: DtFiltersSetting<CustomerOrder> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: 'Data di creazione',
			modelPath: 'date',
		}],
		selectFields: [{
			label: 'Stato',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(CustomerOrderStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: CustomerOrderStatusLabel[i]}))
		}],
		amtsFields: [{
			modelPath: 'customer',
			renderValue: CustomerController.formatCustomerName,
			amtsInput: {
				bePath: BePaths.customers,
				infoConf: {
					columns: [{
						title: 'Cod.',
						data: '_progCode',
						searchOptions: {
							castToInt: true
						}
					}, {
						title: 'Nome',
						data: 'name',
					}, {
						title: 'N. Tel',
						data: 'phone'
					}]
				},
			},
			textFieldProps: {
				label: "Cliente",
			}
		}]
	};

	componentDidMount() {
		super.componentDidMount();

		// TODO move this to abstract-table
		const dtFilterData = ComponentCommunicationService.getData('dt-filters');
		if (dtFilterData) {
			this.setState({dtFiltersComponentValue: dtFilterData});
		}
	}


	getDtOptions(): ICustomDtSettings<CustomerOrder> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: {required: [Attribute.addCustomerOrder]},
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: {required: [Attribute.modifyCustomerOrder]},
					select: {type: 'single', enabled: (i) => !isModelCreatedFromRemote(i) },
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
				// {
				// 	title: 'Elimina',
				// 	attributes: { required: [Attribute.deleteCustomerOrder] },
				// 	props: {color: 'secondary'},
				// 	select: { type: "single", },
				// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
				// },
				{
					title: "Stampa",
					select: { type: "single", },
					onClick: (event, dt) => CustomerOrdersPdf.printOrder(this.getRowData(dt))
				},
				{
					title: "Scarica",
					select: { type: "single", },
					hideDisabled: true,
					onClick: (e, dt) => {
						const order = this.getRowData(dt);
						CustomerOrdersPdf.generateOrderPdf(order._id).then(dd => PdfService.pdfAction(dd, 'download', 'Ordine N ' + order._progCode));
					}
				},
			],
			columns: [
				{
					title: "Codice",
					data: "_progCode",
					search: {
						regex: false,
						toInt: true,
					}
				},
				{
					title: 'Data creazione',
					data: 'date',
					render: d => DataFormatterService.formatUnixDate(d),
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => {
						if (c) 
							return CustomerController.formatCustomerName(row.customer?.fetched);
						
						if (row.billing?.first_name)
							return row.billing.first_name + ' ' + (row.billing.last_name || '')
						
						if (row.shipping?.first_name)
							return row.shipping.first_name + ' ' + (row.shipping.last_name || '')
					},
					search: {manual: v => [
						...CustomerController.createCustomerNameQuery(v, 'customer.fetched'),
						...CustomerController.createCustomerNameQuery(v, 'billing', 'first_name', 'last_name'),
						...CustomerController.createCustomerNameQuery(v, 'shipping', 'first_name', 'last_name'),
					]},
				},
				{
					title: 'Preventivo',
					data: 'totalPrice',
					render: d => DataFormatterService.centsToScreenPrice(d),
				},
				{
					title: 'Da Pagare',
					data: '_priceMeta.left',
					render: d => DataFormatterService.centsToScreenPrice(d),
				},
				{
					title: 'Stato',
					data: 'status',
					// className: 'p-0',
					render: (s, m) => <ReactUtils.SelectChangeField model={m} field='status' enumLabel_to_Value={CustomerOrderStatusLabel} controller={new CustomerOrderController()}/>,
					// render: s => CustomerOrderStatusLabel[s],
				},
			],
			renderDetails: (item) => <CustomerOrderController.FullDetailJsx id={item._id}/>,
		};
	}

}

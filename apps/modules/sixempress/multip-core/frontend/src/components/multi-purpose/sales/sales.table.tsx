import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, ComponentCommunicationService, DtFiltersSetting, TableVariation, ConfirmModalComponent, ABDTAdditionalSettings, ModalService, FieldsFactory, ModalComponentProps, } from '@sixempress/main-fe-lib'; 
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { Sale, SaleStatus, SaleStatusLabel } from "./Sale";
import { SaleController } from './sale.controller';
import { CustomerController } from '../customers/customer.controller';
import { openReceiptModal } from './receipt/print-receipt.modal';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';

export class SalesTable extends AbstractBasicDt<Sale> {
	
	controller = new SaleController();

	defaultAvailableTables: TableVariation[] = [{
		name: "Non pagato",
		filters: {status: {$in: [SaleStatus.successPrePay]}},
	}];

	additionalSettings: ABDTAdditionalSettings<Sale> = {
		toFetch: [{field: "customer", projection: CustomerController.formatNameProjection}],
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
		],
	};

	filterSettings: DtFiltersSetting<Sale> = {
		selectFields: [
			{
				label: 'Stato',
				modelPath: 'status',
				multiple: true,
				availableValues: Object.values(SaleStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: SaleStatusLabel[i]}))
			},
		],
		amtsFields: [{
			modelPath: 'customer',
			textFieldProps: { label: 'Cliente' },
			...CustomerController.AmtsFieldProps(),
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


	getDtOptions(): ICustomDtSettings<Sale> {
		const toR: ICustomDtSettings<Sale> = {
			buttons: [
				{
					title: 'Modifica',
					attributes: { required: [Attribute.modifySales] },
					select: { type: "single", },
					onClick: (e, dt) => this.openEditor(dt)
				},
				{
					title: 'Annulla',
					props: {color: 'secondary'},
					attributes: { required: [Attribute.deleteSales] },
					select: { type: "single", },
					onClick: (e, dt) => ConfirmModalComponent.open("Annulla Vendita", "Sicuro di voler annullare questa vendita?", r => {
						if (r)
							this.controller.patch(
								this.getRowData(dt)._id, 
								[{op: 'set', path: 'status', value: SaleStatus.cancelled}]
							)
							.then(r => this.reloadTable());
					})
				},
				{
					title: "Completa Pagamenti",
					attributes: { required: [Attribute.modifySales] },
					hideDisabled: true,
					select: {type: 'single', enabled: (m) => m.status === SaleStatus.successPrePay, },
					onClick: (e, dt) => ConfirmModalComponent.open("Completa pagamento", "Sicuro di voler completare il pagamento di questa vendita?", r => {
						if (r)
							this.controller.patch(
								this.getRowData(dt)._id, 
								[{op: 'set', path: 'status', value: SaleStatus.success}]
							)
							.then(r => this.reloadTable());
					})
				},
				{
					title: 'Stampa scontrino',
					select: { type: "single", },
					onClick: (e, dt) => {
						const sent = this.getRowData(dt);
						openReceiptModal({sale: sent, barcode: CodeScannerEventsService.encodeBarcodeType(ScannedItemType.sale, sent)});
					}
				}, 
				{
					title: 'Stampa pre-scontrino',
					hideDisabled: true,
					select: {type: 'single', enabled: (m) => m.status === SaleStatus.successPrePay, },
					onClick: (e, dt) => {
						const sent = this.getRowData(dt);
						openReceiptModal({sale: sent, payments: true, barcode: CodeScannerEventsService.encodeBarcodeType(ScannedItemType.sale, sent)});
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
					title: 'Data',
					data: 'date',
					render: (data) => DataFormatterService.formatUnixDate(data)
				},
				{
					title: 'Stato',
					data: 'status',
					render: (data) => SaleStatusLabel[data],
				},
				{
					title: 'Totale Pagato',
					data: 'totalPrice',
					render: (data) => '€ ' + DataFormatterService.centsToScreenPrice(data)
				},
				{
					title: 'Cliente',
					data: 'customer.fetched.name',
					render: (c, row) => CustomerController.formatCustomerName(row.customer?.fetched),
					search: {manual: v => CustomerController.createCustomerNameQuery(v, 'customer.fetched')},
				},
			],
			renderDetails: (item) => <SaleController.FullDetailJsx id={item._id}/>,
		};

		return toR;

	}

}

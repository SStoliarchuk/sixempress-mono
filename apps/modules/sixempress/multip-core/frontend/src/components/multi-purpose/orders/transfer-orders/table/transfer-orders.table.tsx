import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, DtFiltersSetting, ABDTAdditionalSettings, ReactUtils, SmallUtils, BusinessLocationsService } from "@sixempress/main-fe-lib";
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { TransferOrder, TransferOrderStatusLabel } from "../TransferOrder";
import { TransferOrderController } from '../TransferOrder.controller';
import { ProductController, ProductOpTableData } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { LibSmallUtils } from 'libs/main-fe-lib/src/app/utils/various/small-utils';

export class TransferOrdersTable extends AbstractBasicDt<TransferOrder> {

	controller = new TransferOrderController();

	filterSettings: DtFiltersSetting<TransferOrder> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: 'Data di creazione',
			modelPath: 'date',
		}],
		selectFields: [{
			label: 'Stato',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(TransferOrderStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: TransferOrderStatusLabel[i]}))
		}],
	};

	additionalSettings: ABDTAdditionalSettings<TransferOrder> = {
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
		],
		projection: {
			_generatedFrom: 1,
			economicTransfer: 1,
		},
	};

	getDtOptions(): ICustomDtSettings<TransferOrder> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: {required: [Attribute.addTransferOrder]},
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: {required: [Attribute.modifyTransferOrder]},
					select: {type: 'single', enabled: (m) => !m._generatedFrom},
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
				// {
				// 	title: 'Elimina',
				// 	attributes: { required: [Attribute.deleteTransferOrder] },
				// 	props: {color: 'secondary'},
				// 	select: { type: "single", },
				// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
				// },
				{
					title: "Stampa Barcode Prodotti",
					select: { type: "single", },
					onClick: async (event, dt) => {
						const order = this.getRowData(dt);
						const fullOrder = await new TransferOrderController().getSingle(order._id, {params: {fetch: true}});
						const prods: ProductOpTableData[] = [];
							
						if (fullOrder) {
							const loc = BusinessLocationsService.getLocationsFilteredByUser(false)[0]._id;
							for (const l of fullOrder.list) {
								if (!l.products)
									continue;

								for (const p of l.products)
									prods.push({_id: p.item.id, __amounts: {[loc]: p.amount}});
							}
						}

						if (prods.length)
							ProductController.openProductsTableOperation('printbarcode', prods);
						else
							LibSmallUtils.notify('Nessun prodotto da stampare', 'error');
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
					title: 'Totale',
					data: 'totalPrice',
					render: (d, r) => r.economicTransfer ? DataFormatterService.centsToScreenPrice(d) : '',
				},
				{
					title: 'Origine',
					data: 'transferOriginLocationId',
					render: d => BusinessLocationsService.getNameById(d),
				},
				{
					title: 'Destinazione',
					data: 'physicalLocation',
					render: d => BusinessLocationsService.getNameById(d),
				},
				{
					title: 'Stato',
					data: 'status',
					render: (s, m) => <ReactUtils.SelectChangeField model={m} field='status' enumLabel_to_Value={TransferOrderStatusLabel} controller={new TransferOrderController()}/>,
					// render: s => TransferOrderStatusLabel[s],
				},
			],
			renderDetails: (item) => <TransferOrderController.FullDetailJsx id={item._id}/>,
		};
	}

}

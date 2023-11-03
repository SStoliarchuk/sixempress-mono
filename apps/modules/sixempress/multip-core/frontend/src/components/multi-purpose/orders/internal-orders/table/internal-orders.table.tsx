import React from 'react';
import { AbstractBasicDt, ICustomDtSettings, DataFormatterService, DtFiltersSetting, TableVariation, ABDTAdditionalSettings, ReactUtils, SmallUtils, BusinessLocationsService } from "@sixempress/main-fe-lib";
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { InternalOrder, InternalOrderStatus, InternalOrderStatusLabel } from "../InternalOrder";
import { InternalOrderController } from '../InternalOrder.controller';
import { ProductController, ProductOpTableData } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { SupplierController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.controller';
import { LibSmallUtils } from 'libs/main-fe-lib/src/app/utils/various/small-utils';

export class InternalOrdersTable extends AbstractBasicDt<InternalOrder> {

	controller = new InternalOrderController();

	additionalSettings: ABDTAdditionalSettings<InternalOrder> = {
		searchFields: [
			{data: 'list.products.item.fetched.groupData.name'},
			{data: 'list.products.item.fetched.groupData.uniqueTags'},
		],
	};

	filterSettings: DtFiltersSetting<InternalOrder> = {
		addCreationTimeFilter: false,
		timeFields: [{
			label: 'Data di creazione',
			modelPath: 'date',
		}],
		selectFields: [{
			label: 'Stato',
			modelPath: 'status',
			multiple: true,
			availableValues: Object.values(InternalOrderStatusLabel).filter(i => typeof i === 'number').map(i => ({value: i, label: InternalOrderStatusLabel[i]}))
		}],
		amtsFields: [{
			modelPath: 'list.products.item.fetched.variationData.supplier',
			textFieldProps: { label: 'Fornitore' },
			...SupplierController.AmtsFieldProps(undefined, { label: 'Fornitore' }),
		}]
	};

	defaultAvailableTables: TableVariation[] = [{
		name: "Non Completato",
		filters: {
			status: {$in: [
				InternalOrderStatus.pending, 
				InternalOrderStatus.processing, 
				InternalOrderStatus.draft, 
				InternalOrderStatus.onHold, 
				InternalOrderStatus.completedPrePay,
			]},
		}
	}];

	getDtOptions(): ICustomDtSettings<InternalOrder> {
		return {
			buttons: [
				{
					title: 'Aggiungi',
					attributes: {required: [Attribute.addInternalOrder]},
					onClick: () => {
						this.openEditor();
					}
				},
				{
					title: 'Modifica',
					attributes: {required: [Attribute.modifyInternalOrder]},
					select: {type: 'single'},
					onClick: (event, dt) => {
						this.openEditor(dt);
					}
				},
				// {
				// 	title: 'Elimina',
				// 	attributes: { required: [Attribute.deleteInternalOrder] },
				// 	props: {color: 'secondary'},
				// 	select: { type: "single", },
				// 	onClick: (e, dt) => this.sendDeleteRequest(dt)
				// },
				{
					title: "Stampa Barcode Prodotti",
					select: { type: "single", },
					onClick: async (event, dt) => {
						const order = this.getRowData(dt);
						const fullOrder = await new InternalOrderController().getSingle(order._id, {params: {fetch: true}});
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
					title: 'Preventivo',
					data: 'totalPrice',
					render: d => DataFormatterService.centsToScreenPrice(d),
				},
				{
					title: 'Posizione',
					data: 'physicalLocation',
					render: d => BusinessLocationsService.getNameById(d),
				},
				{
					title: 'Stato',
					data: 'status',
					render: (s, m) => <ReactUtils.SelectChangeField model={m} field='status' enumLabel_to_Value={InternalOrderStatusLabel} controller={new InternalOrderController()}/>,
				},
			],
			renderDetails: (item) => <InternalOrderController.FullDetailJsx id={item._id}/>,
		};
	}

}

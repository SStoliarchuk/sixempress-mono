import React from 'react';
import { PricedRowsSaleModel as _PricedRowsSaleModel } from './priced-rows-sale.dtd';
import { IMongoDBFetch } from '@sixempress/main-fe-lib';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';
import { TransferOrderController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/transfer-orders/TransferOrder.controller';

type PricedRowsSaleModel = _PricedRowsSaleModel<any>;

export abstract class PricedRowsSaleController<T extends PricedRowsSaleModel> extends PricedRowsController<T> {

	/**
	 * Returns an array to fetch all the fields inside the item
	 */
	 public getFullFetch(): IMongoDBFetch<T>[] {
		const toR = super.getFullFetch();
		toR.push(...PricedRowsSaleController.getSaleableModelFetchField());
		return toR;
	}


	/**
	 * returns the array of patch operations to fetch the additional saleable items fields
	 */
	public static getSaleableModelFetchField(): IMongoDBFetch<PricedRowsSaleModel>[] {
		return [
			...PricedRowsController.getSaleableModelFetchField(),
			{field: 'customer'},
			{field: '_transferOrders.*'},
		];
	}

	/**
	 * generates the details preview
	 */
	 public static generatePeekPreviewCard(item: PricedRowsSaleModel): JSX.Element {

		return (
			<>
				{super.generatePeekPreviewCard(item)}

				{item._transferOrders && item._transferOrders.length !== 0 && (
					<div className='peek-div-info-card peek-card-table'>
						<div>Trasferimenti:</div>
						<div>
							<table>
								<tbody>
									{item._transferOrders.map((curr) => (
										<tr key={curr.id}>
											<td><TransferOrderController.Link item={curr}/></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</>
		);
	}


}

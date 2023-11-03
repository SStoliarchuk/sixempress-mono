import './priced-rows.css';
import React from 'react';
import { PricedRow, PricedRowsModel as _PricedRowsModel } from './priced-rows.dtd';
import { IMongoDBFetch, AbstractDbItemController, DataFormatterService } from '@sixempress/main-fe-lib';
import { MovementMediumLabel } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/Movement';
import { MultipUserController } from 'apps/modules/sixempress/multip-core/frontend/src/base-components/users/multip-user-controller';
import { ProductController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/product.controller';
import { ProductsJsxRender } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/products-render';

type PricedRowsModel = _PricedRowsModel<any>;

export abstract class PricedRowsController<T extends PricedRowsModel> extends AbstractDbItemController<T> {

	protected static showSellPrice = false;
	protected static showBuyPrice = false;

	/**
	 * Returns an array to fetch all the fields inside the item
	 */
	public getFullFetch(): IMongoDBFetch<T>[] {
		const toR = super.getFullFetch();
		toR.push(...PricedRowsController.getSaleableModelFetchField());
		return toR;
	}

	/**
	 * returns the array of patch operations to fetch the additional saleable items fields
	 */
	public static getSaleableModelFetchField(): IMongoDBFetch<PricedRowsModel>[] {
		return [
			{field: 'list.*.products.*.item'},
			{field: 'list.*.products.*.item.fetched.variationData.supplier'},
			{field: 'list.*.coupons.*.item'},
			{field: 'list.*._meta._author', projection: {name: 1, _progCode: 1}},
		];
	}

	/**
	 * Calculates the totals for a row
	 * @param type the type of the total to return\
	 * 'net' => returns the net total earning\
	 * 'calculated' => returns the sum of all the sellPrices withouth discounts\
	 * 'left' => the set total amount minus the payments already done\
	 * 'granTotal' => the amount to actually pay (either automatically set or set by the user)\
	 * 'buyPrice' => the expenses for the business side
	 */
	public static getTotal(m: PricedRowsModel, type: 'net' | 'calculated' | 'left' | 'granTotal' | 'buyPrice'): number {
		switch (type) {
			//
			// the grand total to pay
			//
			case 'granTotal':
				return typeof m.totalPrice !== 'undefined' 
					? m.totalPrice 
					: this.getTotal(m, 'calculated')

			//
			// the grand total MINUS the payments already made
			//
			case 'left':
				let left = this.getTotal(m, 'granTotal');

				for (const p of m.payments || [])
					left -= p.amount;
				
				return left > 0 ? left : 0;
			
			//
			// the math sum of all the costs in the system
			//
			case 'calculated':
				let calc = 0;

				for (const l of m.list || []) {
					for (const m of l.manual || [])
						calc += (typeof m.sellPrice === 'string' ? DataFormatterService.stringToCents(m.sellPrice) : m.sellPrice) || 0;
		
					for (const p of l.products || [])
						calc += p.amount * p.item.fetched.variationData.sellPrice;

					for (const c of l.coupons || [])
						calc -= c.item.fetched.amount;
				}

				return calc;

			//
			// the buy costs for the list
			//
			case 'buyPrice':
				let buyCost = 0;

				for (const l of m.list || []) {
					for (const m of l.manual || [])
						buyCost += (typeof m.buyPrice === 'string' ? DataFormatterService.stringToCents(m.buyPrice) : m.buyPrice) || 0;
		
					for (const p of l.products || [])
						buyCost += p.amount * p.item.fetched.variationData.buyPrice;
				}
		
				return buyCost;

			//
			// the net earning of the grand total
			//
			case 'net':
				return this.getTotal(m, 'granTotal') - this.getTotal(m, 'buyPrice');

			//
			// just in case we throw error instead of giving zero
			//
			default:
					throw new Error('Total Type not implemented: "' + type + '"');

		}
	}

	/**
	 * Counts the instances of the objects
	 * @param type the type of the total to return\
	 * 'products' => returns the total number of products\
	 */
	public static getCount(m: Pick<PricedRowsModel, 'list'>, type: 'products' | 'manual' | 'total'): number {
		switch (type) {
			//
			// the grand total to pay
			//
			case 'products':
				let prods = 0;
				for (const l of m.list || [])
					for (const p of l.products || [])
						prods += p.amount

				return prods;

			case 'manual':
				let man = 0;
				for (const l of m.list || [])
					if (l.manual)
						man += l.manual.length;

				return man;

			case 'total':
				return PricedRowsController.getCount(m, 'products') + 
					PricedRowsController.getCount(m, 'manual')
		}
	}

	/**
	 * Checks if the row has anything that will count as a priced element
	 */
	public static isRowEmpty(row: PricedRow): boolean {
		if (!row.products?.length && !row.manual?.length)
			return true;

		return false;
	}

	/**
	 * generates the details preview
	 */
	 public static generatePeekPreviewCard(item: PricedRowsModel): JSX.Element {

		return (
			<>
				{item.payments.length !== 0 && (
					<div className='peek-div-info-card peek-card-table'>
						<div>Pagamenti:</div>
						<div>
							<table>
								<tbody>
									{item.payments.map((curr, idx) => (
										<tr key={idx}>
											<td>{DataFormatterService.formatUnixDate(curr.date)}</td>
											<td>{curr.medium === 1 ? '' : MovementMediumLabel[curr.medium]}</td>
											<td>€&nbsp;{DataFormatterService.centsToScreenPrice(curr.amount)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
				
				{item.list.length !== 0 && (
					<div className='peek-div-info-card'>
						<b>Dettagli:</b>
						<div className='peek-card-table'>
							{item.list.map((row, rowIdx) => (
								<React.Fragment key={rowIdx}>
									{row.date && (
										<div>{DataFormatterService.formatUnixDate(row.date)} - {MultipUserController.formatName(row._meta._author)}</div>
									)}
									<div>
										<table className='peek-priced-rows-list-table'>
											<tbody>
												
												{row.manual && row.manual.map((curr, mIdx) => (
													<tr key={'' + mIdx}>
														<td></td>
														<td><pre className='pre-span'>{curr.description}</pre></td>
														{this.showBuyPrice && (<td>{DataFormatterService.centsToScreenPrice(curr.buyPrice || 0)}</td>)}
														{this.showSellPrice && (<td>{DataFormatterService.centsToScreenPrice(curr.sellPrice || 0)}</td>)}
													</tr>
												))}

												{row.products && row.products.map(curr => (
													<tr key={curr.item.id}>
														<td>{curr.amount}</td>
														<td><ProductController.Link item={curr.item}/></td>
														{this.showBuyPrice && (<td>{DataFormatterService.centsToScreenPrice(curr.item.fetched.variationData.buyPrice)}</td>)}
														{this.showSellPrice && (<td>{DataFormatterService.centsToScreenPrice(curr.item.fetched.variationData.sellPrice)}</td>)}
													</tr>
												))}

												{row.coupons && row.coupons.map(curr => (
													<tr key={curr.item.id}>
														<td></td>
														<td>{curr.item.fetched.code}</td>
														{this.showBuyPrice && <td></td>}
														{this.showSellPrice && (<td>-{DataFormatterService.centsToScreenPrice(curr.item.fetched.amount)}</td>)}
													</tr>
												))}

											</tbody>
										</table>
									</div>
								</React.Fragment>
							))}
						</div>
					</div>
				)}
			</>
		);
	}

	/**
	 * Generates the PDF table to show for printable items
	 */
	public static generatePdfTable(item: PricedRowsModel, addTotal = true): any[] {

		const tor = [];

		if (item.list.length) {
			
			const tbody: any[] = [
				[
					{text: 'Descrizione',  border: [false, false, false, true], bold: true},
					{text: 'Q.TA',         border: [false, false, false, true], bold: true},
					{text: 'Tot',          border: [false, false, false, true], bold: true},
				],
				['', '', ''],
				['', '', ''],
			];

			const priceEstimateTable = {
				margin: [0, 0, 0, 0],
				layout: {
					defaultBorder: false,
					hLineColor: () => '#ddd'
				},
				table: {
					widths: ['*', 'auto', 'auto'],
					headerRows: 3,
					body: tbody,
				},
			};
			
			for (const r of item.list) {
				if (r.manual) {
					for (const m of r.manual) {
						tbody.push(
							[
								{ text: m.description, border: [false, false, false, true] },
								{ text: '', border: [false, false, false, true] },
								{ text: typeof m.sellPrice === 'number' ? '€ ' + DataFormatterService.centsToScreenPrice(m.sellPrice) : '', border: [false, false, false, true] },
							],
							['', '', ''],
							['', '', ''],
						);
					}
				}
	
				if (r.products) {
					for (const p of r.products) {
						const totAmount = p.amount;
						tbody.push(
							[
								{ 
									text: ProductsJsxRender.formatFullProductName(p.item.fetched), 
									border: [false, false, false, true]
								},
								{
									text: totAmount + 'x € ' + DataFormatterService.centsToScreenPrice(p.item.fetched.variationData.sellPrice), 
									border: [false, false, false, true]
								},
								{ 
									text: '€ ' + DataFormatterService.centsToScreenPrice(totAmount * p.item.fetched.variationData.sellPrice),
									border: [false, false, false, true]
								}
							],
							['', '', ''],
							['', '', ''],
						);
					}
				}
			}

			tor.push(priceEstimateTable);
		}

		if (!addTotal)
			return tor;
			
		const calculatedTotal = item._priceMeta.maxTotal;
		const priceToUse = item.totalPrice;
		
		if (priceToUse < calculatedTotal) {
			tor.push({
				margin: [0, 0, 20, 0],
				text: 'Tot. Calcolato: € ' + DataFormatterService.centsToBigNumber(calculatedTotal),
				fontSize: 15,
				// bold: true,
				decoration: 'lineThrough',
				alignment: 'right',
			})
		}
		tor.push({
				margin: [0, 0, 20, 0],
				text: 'Totale: € ' + DataFormatterService.centsToBigNumber(priceToUse),
				fontSize: 19,
				bold: true,
				alignment: 'right',
			},
		)

		return tor;
	}


}

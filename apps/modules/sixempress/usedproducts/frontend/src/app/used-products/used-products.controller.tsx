import React from 'react';
import { UsedProduct } from "./UsedProduct";
import { UsedProductsTable } from "./used-products.table";
import { UsedProductEditor } from "./used-products.editor";
import { DbObjectSettings, AbstractDbItemController, DataFormatterService } from "@sixempress/main-fe-lib";
import { BePaths } from '../../enums/bepaths';
import { ModelClass } from '../../enums/model-class';

export class UsedProductController extends AbstractDbItemController<UsedProduct> {
	
	bePath = BePaths.usedproducts;
	modelClass = ModelClass.UsedProduct;
	protected editorJsx = UsedProductEditor;
	protected tableJsx = UsedProductsTable;

	protected fetchInfo: DbObjectSettings<UsedProduct> = {
		buyer: { },
		seller: { },
	};
	

	getDetailsRender(item: UsedProduct) {
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Nome: </th>
								<td>{item.name}</td>
							</tr>
							{typeof item.buyPrice !== "undefined" && (
								<tr>
									<th>Prezzo di acquisto:</th>
									<td>€ {DataFormatterService.centsToScreenPrice(item.buyPrice)}</td>
								</tr>
							)}
							{typeof item.sellPrice !== "undefined" && (
								<tr>
									<th>Prezzo di vendita:</th>
									<td>€ {DataFormatterService.centsToScreenPrice(item.sellPrice)}</td>
								</tr>
							)}
							{item.description && (
								<tr>
									<th>Descrizione: </th>
									<td>{item.description}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

}

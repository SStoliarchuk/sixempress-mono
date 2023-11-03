import React from 'react';
import { ProductVariant, ProductVarTypes, ProductVarTypesLabel } from "./ProductVariant";
import { DbObjectSettings, AbstractDbItemController } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';

export class ProductVariantController extends AbstractDbItemController<ProductVariant> {
	
	bePath = BePaths.productvariants;
	modelClass = ModelClass.ProductVariant;
	
	protected fetchInfo: DbObjectSettings<ProductVariant> = {
	};


	getDetailsRender(item: ProductVariant) {
			return (
			<div className='peek-div-info-container'>

				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Nome: </th>
								<td>{item.name}</td>
							</tr>
							<tr>
								<th>Tipo: </th>
								<td>{ProductVarTypesLabel[item.data.type]}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div className='peek-div-info-card'>
					<b>Varianti:</b><br/><br/>
					{
						item.data.type === ProductVarTypes.automatic ? 
							item.data.value.map(cur => (
								<>
									Nome: {cur.name}<br/>
									Valori: {cur.values.join(', ')}
									<hr/>
								</>
							)) 
						:
						item.data.type === ProductVarTypes.category ? 
							item.data.value.map(cur => (
								<>
									Nome: {cur.name}<br/>
									<hr/>
								</>
							))
						: 
							item.data.value.map(cur => (
								<>
									Nome: {cur}
									<hr/>
								</>
							))
					}
				</div>

			</div>
		);
	}

}

import React from 'react';
import { SupplierReturn } from "./SupplierReturn";
import { DbObjectSettings, DataFormatterService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { PricedRowsController } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.controller';

export class SupplierReturnController extends PricedRowsController<SupplierReturn> {
	
	bePath = BePaths.SupplierReturn;
	modelClass = ModelClass.SupplierReturn;
	
	protected fetchInfo: DbObjectSettings<SupplierReturn> = {
		list: [{
			products: [{
				item: { },
			}]
		}]
	};


	getDetailsRender(item: SupplierReturn) {
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Data: </th>
								<td>{DataFormatterService.formatUnixDate(item._created._timestamp)}</td>
							</tr>
						</tbody>
					</table>
				</div>

				{PricedRowsController.generatePeekPreviewCard(item)}
				
			</div>
		);
	}

}

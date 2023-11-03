import React from 'react';
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import { FetchableField, RouterService } from '@sixempress/main-fe-lib';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import Button from '@material-ui/core/Button';
import { ProductAmountList } from '../product-amount-list';
import { ProductMovement, ProductMovementType, Product } from '../../Product';
import { productCommunicationObject, _internal_productCommunicationObject } from '../product-amount-list.dtd';
import { Observable } from 'rxjs';
import { ProductMovementController } from '../../product-movement.controller';

export class ProductManualQt extends ProductAmountList {


	protected generateProductsListFromIds(data: productCommunicationObject): Observable<_internal_productCommunicationObject> {
		return new Observable(obs => {
			super.generateProductsListFromIds(data).subscribe(builded => {
	
				const stateProdsIdsHm: {[id: string]: Product} = {};
				
				for (const gId in this.state.products) {
					for (const pId in this.state.products[gId]) {
						stateProdsIdsHm[pId] = this.state.products[gId][pId].item;
					}
				}
				for (const d of builded) {
					if (!stateProdsIdsHm[d.item._id] && !d.amounts) {
						d.amounts = d.item._amountData;
					}
				}

				obs.next(builded);
			});
		});
	}

	protected async save() {
		// create the movements array to push
		const toSave: ProductMovement[] = [];

		for (const groupCode in this.state.products) {
			for (const id in this.state.products[groupCode]) {
				const prod = this.state.products[groupCode][id];

				for (const locId in prod.amounts) {
					const loc = prod.amounts[locId];

					// skip if impossible amount
					// and skip if the loc is simple and not equal
					if (loc.amount < 0 || (this.state.simpleMode && locId !== this.state.simpleMode.locationId)) { 
						continue; 
					}

					const toPush: ProductMovement = {
						amount: loc.amount - (prod.item._amountData[locId] || 0),
						movementType: ProductMovementType.manualChange,
						documentLocation: locId,
						documentLocationsFilter: [locId],
						targetProductInfo: {
							productsGroupId: prod.item._trackableGroupId,
							product: new FetchableField(prod.item._id, ModelClass.Product),
						}
					};
	
					toSave.push(toPush);
				}

			}
		} 

		if (toSave.length !== 0)
			await new ProductMovementController().post(toSave);

		RouterService.back();
	}


	/**
	 * Returns data about the products status
	 */
	protected getProductsData() {
		let canSave = true;
		let totalProduct = 0;

		for (const g in this.state.products) {
			for (const p in this.state.products[g]) {
				const stateProd = this.state.products[g][p];
				for (const locId in stateProd.amounts) {
					
					// add totals
					totalProduct += stateProd.amounts[locId].amount;

					// check if can save
					if (canSave && (isNaN(stateProd.amounts[locId].amount) || stateProd.amounts[locId].amount < 0)) {
						canSave = false;
					}

				}
			}
		}

		return {totalProduct, canSave};
	}

		
	render() {
		const data = this.getProductsData();

		return (
			<>
				<Paper className='def-box'>
					<Box display='flex' alignItems='center' flexWrap='wrap'>

						<Box flexGrow={1}>
							{
								this.allLocations.length === 1 
									? (<h2 className='m-0'><b>Giacenza</b></h2>) 
									: this.getSimpleModeSwitcher()
							}
						</Box>

						<Box display='flex' margin='auto'>
							<Box mr={2}>
								<table>
									<tbody>
										<tr>
											<td>Tot. Elementi:</td>
											<td style={{textAlign: 'right'}}>{data.totalProduct}</td>
										</tr>
									</tbody>
								</table>
							</Box>

							<Button variant='contained' color='primary' disabled={!data.canSave} onClick={this.handleSaveBtn}>
								Conferma
							</Button>
						</Box>

					</Box>
				</Paper>

				{super.render()}
			</>
		);
	}

}

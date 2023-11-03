import React from 'react';
import Box from "@material-ui/core/Box";
import { BusinessLocationsService } from '@sixempress/main-fe-lib';
import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { ProductAmountList } from '../product-amount-list';
import { PALProps, PALState, productCommunicationObject, _internal_productCommunicationObject } from '../product-amount-list.dtd';


export interface CPLProps extends PALProps {
	
	initialProducts?: productCommunicationObject | _internal_productCommunicationObject;

	forceSimpleLocationId?: string;

	onChange?: (props: CPLProps, list: PALState['products']) => void;

	onProductsAdded?: () => void;

	onProductRemoved?: (product: Product) => void;

	// onProductRowClick?: (e: React.MouseEvent<any>, product: Product) => void;
	
}


export class ChoseProductsList extends ProductAmountList<CPLProps> {

	locations = BusinessLocationsService.getLocationsFilteredByUser(false);

	activateBarcodeScan = false;

	protected async save() {};

	componentDidUpdate(...args) {
		if (super.componentDidUpdate) {
			(super.componentDidUpdate as any)(...args);
		}
		if (this.props.onChange) {
			this.props.onChange(this.props, this.state.products);
		}
	}

	componentDidMount() {
		if (this.props.forceSimpleLocationId && this.state.simpleMode)
			this.setState({simpleMode: {locationId: this.props.forceSimpleLocationId}});
			
		super.componentDidMount();
		if (this.props.initialProducts) {
			this['_internal_addProductsToList'](this.props.initialProducts);
		}
	}

	/**
	 * If the prods array contains 1 element, then it's a product with no variant, and add it simply to the list
	 * If there is variants then it opens the modal to chose a variant
	 * @param pg The products that match a scanned barcode
	 */
	public addProductsToList = (data: productCommunicationObject, ...other) => {
		super.addProductsToList(data, ...other);
		if (this.props.onProductsAdded) { this.props.onProductsAdded(); }
	}

	// update the parent
	public removeProduct(gId: string, pId: string) {
		super.removeProduct(gId, pId);
		if (this.props.onProductRemoved) { this.props.onProductRemoved(this.state.products[gId][pId].item); }
	}


	render() {

		// dont generate if no products
		if (Object.keys(this.state.products).length === 0) {
			return (null);
		}

		return (
			<>
				{this.getAddComplexLocationPopover()}

				<Box display='flex' alignItems='center' flexWrap='wrap'>
					<Box flexGrow={1}>
						<h2 className='m-0'> <b>Prodotti</b> </h2>
					</Box>
					{this.props.editable !== false && !this.props.disableComplexLocation && this.locations.length !== 1 && this.getSimpleModeSwitcher()}
				</Box>

				{this.getTable()}
			</>
		);
	}

	// /**
	//  * Returns the "errors" that the products amount have,
	//  * they are not true erros, they are used just for warnings
	//  */
	// public prodsAmountErrors(): {lessThanOne?: true, moreThanAvailable?: true} {
		
	// 	const toR: {lessThanOne?: true, moreThanAvailable?: true} = {};
		
	// 	for (const g in this.state.products) {
	// 		for (const p in this.state.products[g]) {
	// 			const stateProd = this.state.products[g][p];
			
	// 			for (const locId in stateProd.amounts) {
	// 				const loc = stateProd.amounts[locId];

	// 				// more than available
	// 				if (loc.amount > (stateProd.item._amountData[locId] || 0)) { toR.moreThanAvailable = true; } 
	// 				// less than 0
	// 				else if (loc.amount < 1) { toR.lessThanOne = true; }
	// 			}
	// 		}
			
	// 	}
		
	// 	if (toR.lessThanOne || toR.moreThanAvailable) { return toR; }
		
	// 	return;
	// }


}

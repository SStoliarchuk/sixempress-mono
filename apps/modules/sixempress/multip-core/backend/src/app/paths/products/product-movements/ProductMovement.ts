import { FetchableField, IDtdTypes } from '@sixempress/main-be-lib';
import { ModelClass } from '../../../utils/enums/model-class.enum';
import { SyncableModel } from '@sixempress/main-be-lib';

export enum ProductMovementType {
	/** The product has been loaded into the system */
	loadProducts = 1,
	/** The product has been sold */
	sellProducts,
	/** The product has changed it's physical location */
	locationMovement,
	/** Manual fixes of the user */
	manualChange,
	// TODO split this movement type into reserve and incoming, so it's better ? 
	/** Announce that the product amount will change by external forces (sale or internal order) */
	reserveOrIncoming,
	/** A user has asked for a return */
	returns,
	/** Used for operations on Product that causes an automatic transfer of the stock, it is used to force the stock sync to remote connections */
	moveStockOnProductChange,
	/** When an item has been returned with the product movement "returns" we sign it -1 with this movement if it is broken */
	brokenItem,
	/** When a returned item has been returned to supplier (useful if return is broke) */
	returnedToSupplier,
	/** Products have been throw away */
	trashed,
	/** reserverOrIncoming but for internal stock transfer created by a priced-rows-saleable model */
	salePendingTransfer,
}

/**
 * The product movement documentLocationsFilter SHOULD BE EQUAL TO documentLocation AT ALL TIMES
 * 
 * Example
 * documentLocation: 'abc123'
 * documentLocationsFilter: ['abc123']
 * 
 * Additional a ProductMovement model should NEVER be modified in the main fields.
 * 
 * you can modify the _deleted and/or _metaData field, all other fields should be immutable.
 */
export interface ProductMovement extends SyncableModel {
	
	targetProductInfo: {
		/**
		 * if this field is not present, it will be manually inserted
		 */
		productsGroupId?: string;
		// variation id
		product: FetchableField<ModelClass.Product>;
	};

	movementType: ProductMovementType;

	/**
	 * Signed integer of the movement
	 * if decrease then negative INTEGER
	 * if increase then positive INTEGER
	 * 
	 * it is used with $sum during aggregation,
	 * thats why signed integers are needed
	 */
	amount: number; 

	date?: number;
}


export interface ProductAmountsField {
	item: FetchableField<ModelClass.Product>;
	amounts: { 
		[locationId: string]: number 
	};
	_price?: number;
}


export function getProductAmountsFieldDtd(required: boolean, allowNegative?: true): IDtdTypes<ProductAmountsField[]> { 
	return {
		type: [Array], 
		required, 
		minArrN: 1,
		customFn: (v) => {
			const idsHm = {};
			for (const i of v) { idsHm[i.item.id] = 1; }
			if (Object.keys(idsHm).length !== v.length) { return "The array contains different object but with the same item._id"; }
		},
		arrayDef: { 
			type: [Object], 
			objDef: [{
				item: FetchableField.getFieldSettings(ModelClass.Product, true),
				amounts: { 
					type: [Object], 
					required: true, 
					objDef: [Number], 
					// checks that the amount HM is not empty
					customFn: (v) => { 
						const values = Object.values(v);
						
						if (values.length === 0)
							return {field: 'soldProducts.N.amounts', message: "The amounts hashmap need to have at least 1 element"};

						if (!allowNegative)
							for (const n of values)
								if (n < 1)
									return {field: 'soldProducts.N.amounts', message: "The value must be greater than 0"};
					}
				},
			}] 
		} 
	};
}

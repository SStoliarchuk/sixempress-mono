import { ProductGroupNoAmounts, ProductGroupWithAmount, ExternalConnection, ProductWithAmounts, ProductNoAmounts, Product } from "../../external-conn-paths/sync-config.service";
import { ProductGroupTypeController } from "./ProductType.controller";
import { DataSyncService } from "./data-sync.service";

export class SyncProductMovementsUtilities {

  /**
	 * Tries to find a non deleted model in the product group with the remoteId given, otherwise returns even a deleted one if present
	 * @param pg Product Group
	 * @param ep External Connection
	 * @param remoteId The remote id that the model searched has to contain
	 */
	public static findRelevantSaleableModelByRemoteId<T extends ProductGroupNoAmounts | ProductGroupWithAmount>(pg: T, ep: ExternalConnection, remoteId: string | number): T extends ProductGroupWithAmount ? ProductWithAmounts : T extends ProductGroupNoAmounts ? ProductNoAmounts : never {
		let chosen: T extends ProductGroupWithAmount ? ProductWithAmounts : T extends ProductGroupNoAmounts ? ProductNoAmounts : never;

		// search for 
		for (const m of pg.models) {
			if (DataSyncService.getRemoteId(m, ep) === remoteId) {
				chosen = m as T extends ProductGroupWithAmount ? ProductWithAmounts : T extends ProductGroupNoAmounts ? ProductNoAmounts : never;
				// if the model is not deleted we break immediately as a non deleted is the most relevant model
				if (!m._deleted)
					break;
			}
		}

		// if no remoteId has been found
		// or the item is not _deleted
		// return it
		if (!chosen || !chosen._deleted)
			return chosen as T extends ProductGroupWithAmount ? ProductWithAmounts : T extends ProductGroupNoAmounts ? ProductNoAmounts : never;

		// if deleted try to find a non deleted saleable var
		const ret = pg.models.find(m => !m._deleted && ProductGroupTypeController.twoSaleableVariationsAreEqual(m, chosen)) || chosen;
		return ret as T extends ProductGroupWithAmount ? ProductWithAmounts : T extends ProductGroupNoAmounts ? ProductNoAmounts : never;
	}

  
	/**
	 * Creates the amountData object to set inside the new product based on the stock online
	 * it can either subtract or add the stocks in smart way
	 * 
	 * the object returned contains location with zeroes as to be able to reset the stock for that location
	 * 
	 * @param ep external connection
	 * @param p the product to create the amount of
	 * @param remoteStock the stock to set in remote
	 * @param subtractSafeMode a mode to subtract the items ignoring the negative amounts
	 */
	public static createAmountDataToSet(ep: ExternalConnection, p: Pick<Product, '_amountData'>, remoteStock: number, subtractSafeMode?: true): Product['_amountData'] {

		const d = {...p._amountData} || {};

		if (subtractSafeMode)
			for (const k in d) 
				if (d[k] < 0)
					delete d[k];

		let currAmount = SyncProductMovementsUtilities.getTotalStockForRemote(ep, {_amountData: d}, subtractSafeMode);
		
		if (subtractSafeMode && !currAmount)
			return {};
			
		if (currAmount === remoteStock)
			return {};
		
		const currDataObj = {...d};

 		// if the remote is more than the local 
		// the we add the excess stock to the main locationId of the external connection
		if (remoteStock > currAmount) {
			currDataObj[ep.locationId] = (currDataObj[ep.locationId] || 0) + (remoteStock - currAmount);
		}
		// else the remote stock is less than local
		// so we will remove the stock in ordered way
		else {

			const subtractToZero = (locId: string) => {

				if (!currDataObj[locId] || remoteStock === currAmount)
					return;

				// if less then zero we delete all
				if (remoteStock < 1) {
					currAmount -= currDataObj[locId];
					currDataObj[locId] = 0;
				}
				else {
					const diff = currAmount - remoteStock;
					if (diff > currDataObj[locId]) {
						currAmount -= currDataObj[locId]
						currDataObj[locId] = 0;
					} 
					else {
						currAmount -= diff;
						currDataObj[locId] -= diff;
					}
				}
			}

			// start with location id
			subtractToZero(ep.locationId);
			
			// handle the additional stocks 
			if (ep.additionalStockLocation) {
				// use all
				if (ep.additionalStockLocation.useAll) {
					for (const id in p._amountData)
						subtractToZero(id);
				}
				// else use ordered
				else if (ep.additionalStockLocation.orderedIds) {
					for (const id of ep.additionalStockLocation.orderedIds)
						subtractToZero(id);
				}
			}

			// if it's still not subtracted completely
			// then we remove the last in online
			// as it means that the remoteStock is either 0 or negative
			//
			// OR (this is i think logically impossible BUT anyway)
			// in the rare case that it is still positive, then some sync was wrong
			// so we set the stock in online to be safe 
			if (remoteStock !== currAmount)
				currDataObj[ep.locationId] = remoteStock;

		}


		for (const k in currDataObj)
			if (currDataObj[k] === d[k])
				delete currDataObj[k];

		return currDataObj;
	}

  	/**
	 * Returns the total quantity for the online stock (summed from all the ids activited for a location)
	 * @param ep external connection
	 * @param p product to count
	 */
	public static getTotalStockForRemote(ep: ExternalConnection, p: Pick<ProductWithAmounts, '_amountData' | '_deleted'>, ignoreNegative?: true | false | undefined): number {

		const d = p._amountData || {};
		let tot = 0;
		
		// if it is a remainance, then we add only if there is amount, otherwise we ignore the negative
		const add = (n: number) => {
			// force add only if positive
			if (ignoreNegative === true) {
				if (n > 0)
					tot += n;
			}
			// force add number
			else if (ignoreNegative === false) {
				tot += n
			}
			// automatic
			else if (!p._deleted || n > 0)
				tot += n;
		}

		// add ext locaiton
		if (d[ep.locationId])
			add(d[ep.locationId]);
		
		if (ep.additionalStockLocation) {
			// add all
			if (ep.additionalStockLocation.useAll) {
				tot = 0;
				for (const k in d) 
					add(d[k]);
			}
			// or else add the ordered
			else {
				for (const id of ep.additionalStockLocation.orderedIds)
					if (d[id])
						add(d[id]);
			}
		}

		return tot;
	}

}
import React from 'react';
import { PALProps, PALState, StateProductAmountValue, productCommunicationObject, StateProduct, productCommunicationServiceKey, _internal_productCommunicationObject } from './product-amount-list.dtd';
import { ComponentCommunicationService, CodeScannerService, DbItemSchema, ObjectUtils, BusinessLocationsService } from '@sixempress/main-fe-lib';
import { Product } from '../Product';
import { Subscription, Observable } from 'rxjs';
import { CodeScannerEventsActiveStatus } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-active-status';
import { ProductController } from '../product.controller';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';

export class ProductAmountListLogic<P extends PALProps = PALProps, S extends PALState = PALState> extends React.Component<P, S> {

	protected schema: DbItemSchema<Product> = {
		_trackableGroupId: 1,
		_amountData: 1,
		_deleted: 1,
		infoData: {
			barcode: 1,
			refSellPrice: 1,
		},
		groupData: {
			uniqueTags: 1,
			internalTags: 1,
			name: 1,
			type: 1,
		},
		variationData: {
			variants: 1,
			buyPrice: 1,
			sellPrice: 1,
			supplier: {
				fetched: {
					name: 1,
					_progCode: 1,
				}
			}
		},
	};

	protected controller = new ProductController();

	protected allLocations = BusinessLocationsService.getLocationsFilteredByUser(false);

	/**
	 * Values used to chage the simple mode location value
	 */
	protected docPosVals = BusinessLocationsService.formatLocationsForSelect(this.allLocations);

	/**
	 * The subscription tho the code scanner service
	 */
	private barcodeSub: Subscription;

	/**
	 * Flag to listen for barcode events ornot
	 */
	protected activateBarcodeScan = true;

	state: S = {
		addComplexLocationPopover: null,
		simpleMode: { locationId: BusinessLocationsService.chosenLocationId || this.allLocations[0]._id  },
		products: {},
	} as S;


	/**
	 * This function is present to be extendebla
	 */
	protected getBaseStateProdObject(item: Product): StateProduct {
		return {item, amounts: {}};
	}

	/**
	 * this function is present as the amount object value could store different data if this table is extended
	 * so we need an external function to allow to create base amounts objects differently based on the table that extend this class
	 */
	protected getBaseAmountsListObject(locId: string): StateProductAmountValue {
		return {amount: 0};
	}

	/**
	 * Reads if there is data to add to the list
	 */
	componentDidMount() {
		if (this.activateBarcodeScan) { this.startListenBarcode(); }
		// get the product group code
		const data: productCommunicationObject = ComponentCommunicationService.getData(productCommunicationServiceKey);
		if (data) { this.addProductsToList(data); }
	}

	/**
	 * Removes the barcode listen
	 */
	componentWillUnmount() {
		if (this.activateBarcodeScan) { this.stopListenBarcode(); }
	}


	/**
	 * Start to listen to the barcode scans
	 */
	protected startListenBarcode() {
		CodeScannerEventsActiveStatus.isActive = false;
		this.barcodeSub = CodeScannerService.emitter.subscribe(o => this.addOnBarcodeScan(o.value));
	}

	/**
	 * Stops to listen to the barcode scans
	 */
	protected stopListenBarcode() {
		CodeScannerEventsActiveStatus.isActive = true;
		if (this.barcodeSub) { this.barcodeSub.unsubscribe(); }
	}



	/**
	 * If the new state is simple, then adds the this.allLocations[0]._id to all the products
	 * 
	 * @param newState optional forced state, if not given inverts the current state
	 */
	protected toggleSimpleMode(newState?: boolean) {
		this.setState(s => {

			const prods = {...s.products};
			const bool = typeof newState === 'boolean' ? newState : !s.simpleMode;
			const simpleLocToSet = this.allLocations[0]._id;

			if (bool === true) {
				for (const gId in prods) {
					for (const pId in prods[gId]) {
						if (!prods[gId][pId].amounts[simpleLocToSet]) {
							prods[gId][pId].amounts[simpleLocToSet] = this.getBaseAmountsListObject(simpleLocToSet);
						}
					}
				}
			}

			return {products: prods, simpleMode: bool ? {locationId: simpleLocToSet} : false};
		});
	}

	protected changeSimpleModeLocationId(newLocationId: string) {
		this.setState((s: PALState) => {
			if (!s.simpleMode) { return; }

			const prods = {...s.products};
	
			for (const gId in prods) {
				for (const pId in prods[gId]) {
					this.changeLocation(gId, pId, s.simpleMode.locationId, newLocationId);
				}
			}
	
			return {products: prods, simpleMode: {...s.simpleMode, locationId: newLocationId}};
		});
	}

	/**
	 * Opens the products table list in a modal window to add the products to the list
	 */
	protected openProductsTable() {
		this.controller.openSelectDt(
			{selectMode: "detailed", schema: this.schema}, 
			(ids, ps) => this.addProductsToList(ps.map(p => ({productId: p._id})))
		);
	}

	/**
	 * It adds 1 amoun to the first location available in a present item
	 * OR if the item is not present
	 * it queries all the items with that barcode and adds them to the list with only the first one having amount 1
	 */
	protected addOnBarcodeScan(barcode: string) {

		// check if the item is already present
		// if so add 1 to the first location available
		for (const gId in this.state.products) {
			for (const pId in this.state.products[gId]) {
				const p = this.state.products[gId][pId];
				if (p.item.infoData.barcode.includes(barcode)) {
					this.addProductsToList([{productId: pId, amounts: {[Object.keys(p.amounts)[0]]: 1}}]);
					return;
				}
			}
		}

		const type = CodeScannerEventsService.getTypeFromCodeScan(barcode);
		if (type.prefix !== ScannedItemType.product)
			return;

		this.controller.getMulti({params: {filter: {'infoData.barcode': type.fixedCode}, schema: this.schema}}).then(products => {
			// no items
			if (products.data.length === 0) { return; }
			
			const data: _internal_productCommunicationObject = products.data.map(p => ({item: p}));
			// add 1 item to the first object only
			data[0].amounts = {[this.state.simpleMode ? this.state.simpleMode.locationId : this.allLocations[0]._id]: 1};

			this._internal_addProductsToList(data);
		});
	}

	public addProductsToList(given: productCommunicationObject, amountMode: "set" | "add" = 'add') {
		return this._internal_addProductsToList(given, amountMode);
	}

	/**
	 * Adds all the elements given to the list
	 * if the amounts object is not given, or dont have any location set,
	 * then it adds a default location
	 * 
	 * @param amountMode what action to perform with the amount, if set, then it replace the current amount, if add the it adds to the current amount
	 */
	private _internal_addProductsToList(given: productCommunicationObject | _internal_productCommunicationObject, amountMode: "set" | "add" = 'add') {
		if (given.length === 0) { return; }

		this.generateProductsListFromIds(given as any).subscribe(data => {

			this.setState((s: PALState) => {

				const prods = {...s.products};
				let setToComplexMode = Boolean(!s.simpleMode);

				for (const d of data) {
					if (!prods[d.item._trackableGroupId]) {
						prods[d.item._trackableGroupId] = {};
					}
					if (!prods[d.item._trackableGroupId][d.item._id]) {
						prods[d.item._trackableGroupId][d.item._id] = this.getBaseStateProdObject(d.item);
					}				

					const stateProd = prods[d.item._trackableGroupId][d.item._id];

					// add all given location
					if (d.amounts) {
						const keys = Object.keys(d.amounts);
						if (keys.length !== 0) {
							// check if you have to set to complex mode
							// if more than one location
							// or if the only location present is different from the one in the simple mode
							if (!setToComplexMode && (keys.length !== 1 || keys[0] !== (s.simpleMode as {locationId: string}).locationId)) {
								setToComplexMode = true;
							}

							for (const locId of keys) {
								if (!stateProd.amounts[locId]) {
									stateProd.amounts[locId] = this.getBaseAmountsListObject(locId);
								}
								if (amountMode === 'add') {
									stateProd.amounts[locId].amount += d.amounts[locId];
								} else {
									stateProd.amounts[locId].amount = d.amounts[locId];
								}
							}
						}
					}

					// add fallback location if no manual location are given
					if (Object.keys(stateProd.amounts).length === 0) {
						const locToSet = s.simpleMode ? s.simpleMode.locationId : this.allLocations[0]._id;
						stateProd.amounts[locToSet] = this.getBaseAmountsListObject(locToSet);
					}

					// flash the row if it was already present
					if (s.products[d.item._trackableGroupId] && s.products[d.item._trackableGroupId][d.item._id]) {
						this.flashRow(d.item._id);
					}
					
				}

				return {products: prods, simpleMode: setToComplexMode ? false : s.simpleMode};
			});
		});
	}

	/**
	 * Returns an array of prodocuts from an array of ids
	 */
	protected generateProductsListFromIds(data: productCommunicationObject): Observable<_internal_productCommunicationObject> {
		return new Observable<_internal_productCommunicationObject>(obs => {

			// just for optimization
			if ((data as any as _internal_productCommunicationObject)[0].item) { 
				return obs.next(data as any as _internal_productCommunicationObject);
			}

			const toFetch: string[] = [];
			const stateProdsIdsHm: {[id: string]: Product} = {};
			
			for (const gId in this.state.products) {
				for (const pId in this.state.products[gId]) {
					stateProdsIdsHm[pId] = this.state.products[gId][pId].item;
				}
			}
			for (const d of data) {
				if (!stateProdsIdsHm[d.productId]) {
					toFetch.push(d.productId);
				}
			}

			if (toFetch.length === 0) {
				return obs.next(data.map(d => ({item: stateProdsIdsHm[d.productId], amounts: d.amounts})));
			}
			else {
				this.controller.getMulti({params: {filter: {_id: {$in: toFetch}, _deleted: null, _groupDeleted: null}, schema: this.schema}}).then(r => {
					const idHm = ObjectUtils.arrayToHashmap(r.data, '_id');
					const toR: _internal_productCommunicationObject = [];
					for (const d of data) {
						if (stateProdsIdsHm[d.productId] || idHm[d.productId]) {
							toR.push({item: stateProdsIdsHm[d.productId] || idHm[d.productId], amounts: d.amounts});
						}
					}
					obs.next(toR);
				});
			}


		});
	}

	/**
	 * Updates the products amount in the list
	 */
	protected changeProductAmount(gId: string, pId: string, locId: string, value: number) {
		this.setState(s => {
			if (s.products[gId] && s.products[gId][pId]) {

				const prods = {...s.products};
				const rel = prods[gId][pId];
				
				if (!rel.amounts[locId]) {
					rel.amounts[locId] = this.getBaseAmountsListObject(locId);
				}
				rel.amounts[locId].amount = value;

				return {products: prods};
			}
		});
	}


	/**
	 * Removes a product from the list
	 */
	protected removeProduct(gId: string, pId: string): void { 
		this.setState(s => {
			if (s.products[gId]) {

				const prods = {...s.products};
				delete prods[gId][pId];
				if (Object.keys(prods[gId]).length === 0) { 
					delete prods[gId];
				}

				return {products: prods};
			}
		});
	}


	protected addLocation(gId: string, pId: string, locId: string): void {
		this.setState(s => {
			if (s.products[gId] && s.products[gId][pId] && !s.products[gId][pId].amounts[locId]) {

				const prods = {...s.products};
				prods[gId][pId].amounts[locId] = this.getBaseAmountsListObject(locId);

				return {products: prods, addComplexLocationPopover: null};
			}
		});
	}

	protected removeLocation(gId: string, pId: string, locId: string) {
		this.setState(s => {
			// only if not the last location, then you can remove
			if (s.products[gId] && s.products[gId][pId] && Object.keys(s.products[gId][pId].amounts).length !== 1) {

				const prods = {...s.products};
				delete prods[gId][pId].amounts[locId];

				return {products: prods};
			}
		});
	}

	protected changeLocation(gId: string, pId: string, oldLocId: string, newLocId: string) {
		// edge case
		// if this is not present, then when you click the same position in the select, it crashes
		// that's because having the same id, aka the same key in the amounts hashmap 
		// no new location is added, but the old location is deleted
		if (oldLocId === newLocId) { return; }

		this.setState(s => {
			if (s.products[gId] && s.products[gId][pId] && s.products[gId][pId].amounts[oldLocId]) {

				const prods = {...s.products};
				prods[gId][pId].amounts[newLocId] = this.getBaseAmountsListObject(newLocId);
				prods[gId][pId].amounts[newLocId].amount = prods[gId][pId].amounts[oldLocId].amount;
				delete prods[gId][pId].amounts[oldLocId];

				return {products: prods};
			}
		});
	}

	/**
	 * Flashes a row when inserting a new product
	 */
	protected flashRow(productId: string) {
		const id = (this.props.multiListPrefixKey || "") + "row_" + productId;
		
		const item = document.getElementById(id);
		if (!item) { return; }

		// item = this.state.simpleMode ? item.parentElement : item.parentElement.parentElement;
		// if (!item) { return; }

		if (!item.className.includes("on")) { item.className += ' on'; }
		setTimeout(() => item.className = item.className.replace(" on", ""), 100);
	}

}

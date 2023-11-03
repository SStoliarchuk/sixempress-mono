import { FetchableField, SyncableModel } from '@sixempress/main-be-lib';
import { CustomerOrderController, CustomerOrder, CustomerController, Customer, Product, ModelClass, ProductGroup, MovementMedium, PricedRow, PricedRowSale, ProductGroupController, ProductGroupWithAmount } from '@sixempress/be-multi-purpose';
import { ExternalConnection } from '../../external-conn-paths/sync-config.dtd';
import { WooBaseItem } from '@sixempress/contracts-agnostic';
import { Request } from 'express';
import { DataSyncService } from "./data-sync.service";
import { AddedIdInfo, ItemsBuildOpts } from '../woo.dtd';
import to from 'await-to-js';
import { SyncCustomersService } from './sync-customers.service';
import { SyncProductsService } from './sync-products.service';
import { ProductTypeController } from './ProductType.controller';
import { SyncProductMovementsService } from './sync-product-movements.service';

type AddRemoteData = {
	customerHm: {[remoteId: string]: Customer},
	productsHm: {[remoteId: string]: Product},
	prodGroupHm: {[_trackableGroupId: string]: ProductGroupWithAmount},
};

/**
 * We only download the orders, we do not upload them
 */
export abstract class SyncOrdersService<A extends WooBaseItem> extends DataSyncService<A, CustomerOrder> {

	protected abstract productSync: SyncProductsService<any>;
	protected abstract customerSync: SyncCustomersService<any>;
	protected abstract productMovsSync: SyncProductMovementsService<any>;
	
	/**
	 * We store the items we already subbed that we did not yet saved to db
	 */
	private SUBTRACTED_CACHE: {[id: string]: Product['_amountData']} = {};

	/**
	 * translates the remote object to a local one
	 * @param ep external connnection of the sync request
	 * @param ref the remote reference object
	 * @param loc the optional local object if present
	 */
	protected abstract translateItemToLocal(req: Request, ep: ExternalConnection, ref: A[], loc: Map<A, CustomerOrder>): Promise<{
		subbed: {[id: string]: Product['_amountData']}[], 
		items: Map<A, CustomerOrder>
	}>;


	/**
	 * Processes the remote items into local ones
	 */
	public async receiveFromRemote(ep: ExternalConnection, req: Request, ids: (string | number)[], referenceItems: Map<string | number, A>, opts?: ItemsBuildOpts) {
		const c = new CustomerOrderController();
		
		const cachedSub: {[id: string]: Product['_amountData']}[] = [];

		const acts = await this.automaticRemoteToLocalCompare(
			req, c, ep, ids, referenceItems, 
			async (req, ep, ref, loc) => {
				const r = await this.translateItemToLocal(req, ep, ref, loc);
				cachedSub.push(...r.subbed);
				return r.items;
			},
		);

		const [e] = await to(this.executeCrudActions(req, c, acts));
		this.removeFromSubtractCache(cachedSub);

		// throw after we remove from cache the item
		if (e) throw e;
	}

	/**
	 * Creates the additional data for the products that will be synced
	 * @param req request object for queries
	 * @param ep the external connection where we are sync data
	 * @param referenceItems the ref items that will be updated
	 */
	protected async getRemoteAddData(req: Request, ep: ExternalConnection, remote: {customerIds: (string | number)[], productIds: (string | number)[]}): Promise<AddRemoteData> {
		
		const customerIds = remote.customerIds;
		const productIds = remote.productIds;

		const prods: Product[] = !productIds.length ? [] : await new ProductTypeController().findForUser(
			req,
			this.createQueryForMetadata(ep, {'_id': {$in: productIds}}),
			{skipFilterControl: true},
		);
		const customers: Customer[] = !customerIds.length ? [] : await new CustomerController().getRawCollection(req).find(
			this.createQueryForMetadata(ep, {'_id': {$in: customerIds}}),
		).toArray();
		const pgs = !prods.length ? [] : await this.productSync.fullGroupProductQueryWithAmounts(
			req,
			{_trackableGroupId: {$in: prods.map(p => p._trackableGroupId)}},
		)

		const ret: AddRemoteData = {
			customerHm: {},
			productsHm: {},
			prodGroupHm: {},
		};
		for (const c of customers) {
			const id = this.customerSync.getRemoteId(c, ep);
			if (id) ret.customerHm[id] = c;
		}
		for (const p of prods) {
			const id = this.productSync.getRemoteId(p, ep);
			if (id) ret.productsHm[id] = p;
		}
		for (const pg of pgs) {
			ret.prodGroupHm[pg._trackableGroupId] = pg;
		}

		return ret;
	}

	/**
	 * In SIXEMPRESS data model, every Product variation is a separate model in the database. so here we try to account for this by updating the stock of the right item
	 */
	protected addProductWithCorrectedStocks(
		m: CustomerOrder, 
		ep: ExternalConnection, 
		add: AddRemoteData, 
		p: Product, 
		prods: {[id: string]: PricedRowSale['products'][0]} = {},
		allProductsSubbed: {[id: string]: Product['_amountData']}[] = [],
		remoteId: number | string,
		remoteQuantity: number,
	) {
		const pid = remoteId;
		const i_quantity = remoteQuantity;
		const saleableEqual = m.list[0]?.products?.filter(cur => ProductGroupController.twoSaleableVariationsAreEqual(cur.item.fetched, p)) || [];
		const alreadyPresent = saleableEqual.reduce((car, cur) => car += cur.amount, 0);

		// if currently we have more items or equal than desired
		// then we create the quantities object with the same old product stock info
		// this way the result is the same
		if (alreadyPresent >= i_quantity) {
			const resetAmount: {[id: string]: Product['_amountData']} = {};
			for (const s of saleableEqual) {
				const amountInfo = this.orderRowDataToAmount(m, s);
				resetAmount[s.item.id] = amountInfo;
			}
			
			// add all the quantities to the row
			const quantities = this.productMovsSync.createAmountDataForSubtractionByVariation(
				ep, add.prodGroupHm[p._trackableGroupId], pid, i_quantity, this.SUBTRACTED_CACHE, resetAmount
			);

			this.sumQuantities(m, prods, quantities);
			
			// inverse add to cache, to account for the "released" stock
			// this.addToSubtractCache(quantities);
			allProductsSubbed.push(quantities);
		}
		// if otherwise the new quantity is more than the currently set in order
		// we create a qunatity object with only the diff increase, and then we combine the two quantities object
		else {
			const diff = i_quantity - alreadyPresent;
			// add all the quantities to the row
			const quantities = this.productMovsSync.createAmountDataForSubtractionByVariation(
				ep, add.prodGroupHm[p._trackableGroupId], pid, diff, this.SUBTRACTED_CACHE
			);
			// add old stock and the new diff
			for (const s of saleableEqual)
				this.sumQuantities(m, prods, {[s.item.id]: this.orderRowDataToAmount(m, s)});
			this.sumQuantities(m, prods, quantities);

			// add to subracted stock the new quantity
			this.addToSubtractCache(quantities);
			allProductsSubbed.push(quantities);
		}
	}

	private sumQuantities(m: CustomerOrder, prodObj: {[id: string]: PricedRowSale['products'][0]}, quantities: {[id: string]: Product['_amountData']}) {
		for (const id in quantities) {
			// create base
			if (!prodObj[id])
				prodObj[id] = {item: new FetchableField(id, ModelClass.Product), amount: 0};

			// add sum
			const parsedAmount = this.amountDataToOrderRowData(m, quantities[id]);
			prodObj[id].amount += parsedAmount.amount;

			// transfer the items
			if (parsedAmount.transfer) {
				if (!prodObj[id].transfer)
					prodObj[id].transfer = {};

				for (const tra in parsedAmount.transfer)
					prodObj[id].transfer[tra] = (prodObj[id].transfer[tra] || 0) + parsedAmount.transfer[tra];
			}

			// clear if empty
			if (prodObj[id].transfer && !Object.keys(prodObj[id].transfer).length)
				delete prodObj[id].transfer;
		}
	}

	/**
	 * Adds to cache the items subtracted by adding them to other items
	 * @param items Items subtracted to add to cache
	 */
	private addToSubtractCache(items: {[id: string]: Product['_amountData']}, dataObj: {[id: string]: Product['_amountData']} = this.SUBTRACTED_CACHE) {
		for (const id in items) {
			if (!dataObj[id])
				dataObj[id] = {};

			for (const l in items[id]) {
				if (!dataObj[id][l])
					dataObj[id][l] = 0;

				dataObj[id][l] += items[id][l]
			}
		}
	}

	private orderRowDataToAmount(model: CustomerOrder, amounts: Partial<PricedRowSale['products'][0]>): {[locId: string]: number} {
		const r: {[locId: string]: number} = {};

		let transfered = 0;
		if (amounts.transfer) {
			for (const id in amounts.transfer) {
				r[id] = amounts.transfer[id]
				transfered += amounts.transfer[id];
			}
		}

		const left = amounts.amount - transfered;
		if (left)
			r[model.physicalLocation] = left;

		return r;
	}

	private amountDataToOrderRowData(model: CustomerOrder, amounts: {[locId: string]: number}): Pick<PricedRowSale['products'][0], 'amount' | 'transfer'> {
		const r: Pick<PricedRowSale['products'][0], 'amount' | 'transfer'> = {amount: 0};
		const tr: {[locId: string]: number} = {};

		for (const id in amounts) {
			if (id !== model.physicalLocation)
				tr[id] = amounts[id];

			r.amount += amounts[id];
		}

		if (Object.keys(tr).length)
			r.transfer = tr;
		
		return r;
	}

	/**
	 * Removes the items subbed from the cache
	 * @param itemsArr items subtracted fromt the models
	 */
	private removeFromSubtractCache(itemsArr: Array<{[id: string]: Product['_amountData']}>) {
		for (const items of itemsArr) {
			for (const id in items) {
				if (!this.SUBTRACTED_CACHE[id])
					continue;

				for (const l in items[id]) {
					if (!this.SUBTRACTED_CACHE[id][l])
						continue;

					this.SUBTRACTED_CACHE[id][l] -= items[id][l]


					if (!this.SUBTRACTED_CACHE[id][l])
						delete this.SUBTRACTED_CACHE[id][l];
				}

				if (!Object.keys(this.SUBTRACTED_CACHE[id]).length)
					delete this.SUBTRACTED_CACHE[id];
			}
		}
	}

}

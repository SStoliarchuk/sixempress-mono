import { DataFormatterService, FetchableField, ModelFetchService, ObjectUtils } from '@sixempress/main-be-lib';
import { CustomerOrder, CustomerOrderStatus, Customer, Product, ModelClass, MovementMedium, PricedRow, PricedRowSale, ProductGroupWithAmount, ExternalConnectionType } from '@sixempress/be-multi-purpose';
import { ExternalConnection } from '../../external-conn-paths/sync-config.dtd';
import { WooOrder, WooOrderStatus } from '@sixempress/contracts-agnostic';
import { Request } from 'express';
import moment from 'moment';
import { WPRemotePaths, WooTypes } from '../woo.enum';
import { ExternalSyncUtils } from '../../external-sync.utils';
import { WooSyncCustomersService } from './woo-sync-customers.service';
import { SyncOrdersService } from '../../abstract/sync/sync-orders.service';
import { SyncCustomersService } from '../../abstract/sync/sync-customers.service';
import { AddedIdInfo, ItemsBuildOpts, ModelIdsHm, SyncDataItems } from '../../abstract/woo.dtd';
import { SyncProductsService } from '../../abstract/sync/sync-products.service';
import { WooSyncProductsService } from './woo-sync-products.service';
import { SyncProductMovementsService } from '../../abstract/sync/sync-product-movements.service';
import { WooSyncProductMovementsService } from './woo-sync-product-movements.service';
import to from 'await-to-js';

type AddRemoteData = {
	customerHm: {[remoteId: string]: Customer},
	productsHm: {[remoteId: string]: Product},
	prodGroupHm: {[_trackableGroupId: string]: ProductGroupWithAmount},
};

type BuiltWooOrders = {
	local: CustomerOrder[], 
	remote: WooOrder[], 
	ec: ExternalConnection,
}

export enum REMOTE_STATUS {
	pending     = 'pending',
	processing  = 'processing',
	onHold      = 'on-hold',
	completed   = 'completed',
	cancelled   = 'cancelled',
	refunded    = 'refunded',
	failed      = 'failed',
}

const REMOTE_TO_LOCAL_STATUS = {
	'pending'    : CustomerOrderStatus.pending,
	'processing' : CustomerOrderStatus.processing,
	'on-hold'    : CustomerOrderStatus.onHold,
	'completed'  : CustomerOrderStatus.completed,
	'cancelled'  : CustomerOrderStatus.cancelled,
	'refunded'   : CustomerOrderStatus.refunded,
	'failed'     : CustomerOrderStatus.failed,
};

const LOCAL_TO_REMOTE_STATUS = {
	[CustomerOrderStatus.pending]         : 'pending',
	[CustomerOrderStatus.processing]      : 'processing',
	[CustomerOrderStatus.onHold]          : 'on-hold',
	[CustomerOrderStatus.completed]       : 'completed',
	[CustomerOrderStatus.cancelled]       : 'cancelled',
	[CustomerOrderStatus.refunded]        : 'refunded',
	[CustomerOrderStatus.failed]          : 'failed',
	[CustomerOrderStatus.draft]           : 'pending',
	[CustomerOrderStatus.completedPrePay] : 'completed',
};

/**
 * We only download the orders, we do not upload them
 */
class _WooSyncOrdersService extends SyncOrdersService<WooOrder> {

	protected type: ExternalConnectionType = ExternalConnectionType.wordpress;

	protected customerSync: SyncCustomersService<any> = WooSyncCustomersService;
	protected productSync: SyncProductsService<any> = WooSyncProductsService;
	protected productMovsSync: SyncProductMovementsService<any> = WooSyncProductMovementsService;

	/**
	 * We send ONLY the status updates for now
	 */
	public async translateAndSendToRemote(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, localOrders: CustomerOrder[], opts?) {

		const bd: BuiltWooOrders[] = [];

		for (const e of endpoints) {
			const remote: WooOrder[] = [];
			
			for (const m of localOrders) {
				
				// the obj has to be synced from remote to work
				const id = this.getRemoteId(m, e) as number;
				if (!id)
					continue;

				// omit origin url
				const omittedUrls = data.get(m._id.toString())?.omitOriginUrls;
				if (omittedUrls && omittedUrls.find(o => e.originUrl.includes(o)))
					continue;

				remote.push({
					id: id,
					status: LOCAL_TO_REMOTE_STATUS[m.status] as WooOrderStatus,
				});
			}

			if (remote.length)
				bd.push({ec: e, remote: remote, local: localOrders})
		}


		const errors: any[] = [];
		for (const b of bd) {
			const [e] = await to(ExternalSyncUtils.requestToWoo(req, b.ec, 'POST', WPRemotePaths.orders, {items: b.remote}));
			if (e) errors.push(e);
		}

		return [{errors, ops: []}];
	}

	
	protected async translateItemToLocal(req: Request, ep: ExternalConnection, items: WooOrder[], local: Map<WooOrder, CustomerOrder>): Promise<{ subbed: { [id: string]: { [locationId: string]: number; }; }[]; items: Map<WooOrder, CustomerOrder>; }> {
		const remote = {customerIds: [] as number[], productIds: [] as number[]};
		for (const val of items) {
			if (val.customer_id)
				remote.customerIds.push(val.customer_id);
			for (const i of val.line_items)
				remote.productIds.push(i.variation_id || i.product_id);
		}

		const add = await this.getRemoteAddData(req, ep, remote);
		await ModelFetchService.fetchAndSetFields(req, [{field: 'list.*.products.*.item'}], Array.from(local.values()));

		const r: { subbed: { [id: string]: { [locationId: string]: number; }; }[]; items: Map<WooOrder, CustomerOrder>; } = {
			items: new Map(),
			subbed: [],
		};
		
		for (const ref of items) {
			const i = this.translateItem(ep, add, ref, local.get(ref));
			r.items.set(ref, i.model);
			r.subbed.push(...i.subbed);
		}

		return r;
	}

	private gmtToUnix(modelGmtDate: string): void | number {
		const d = new Date(modelGmtDate)
		// invalid time
		if (!d.getTime())
			return;

		return Math.floor(d.getTime() / 1000);
	}

	/**
	 * translates the remote object to a local one
	 * @param ep external connnection of the sync request
	 * @param add additional build data
	 * @param ref the remote reference object
	 * @param loc the optional local object if present
	 */
	private translateItem(ep: ExternalConnection, add: AddRemoteData, ref: WooOrder, loc?: CustomerOrder) {
		const m: CustomerOrder = loc 
			? ObjectUtils.cloneDeep(loc) 
			: {
				payments: [],
				physicalLocation: ep.locationId,
				documentLocation: ep.locationId,
				documentLocationsFilter: [ep.locationId],
			} as CustomerOrder;

		if (ref.customer_id)
			m.customer = new FetchableField(add.customerHm[ref.customer_id]._id, ModelClass.Customer);
		
		const refTotal = DataFormatterService.stringToCents(ref.total);
		
		// the item was already paid
		if (ref.transaction_id || ref.date_paid_gmt) {
			const time = this.gmtToUnix(ref.date_paid_gmt) || moment().unix(); 
			m.payments = [{amount: refTotal, date: time, medium: MovementMedium.unspecified}];
		}

		// add original completed date
		if (ref.date_completed_gmt) {
			const time = this.gmtToUnix(ref.date_completed_gmt) || m.endDate || this.gmtToUnix(ref.date_paid_gmt) || moment().unix();
			m.endDate = time;
		}

		// add original date
		if (ref.date_created_gmt) {
			const time = this.gmtToUnix(ref.date_created_gmt) || m.date || moment().unix();
			m.date = time;
		}

		if (ref.billing)
			m.billing = {
				first_name: ref.billing.first_name,
				last_name: ref.billing.last_name,
				company: ref.billing.company,
				address_1: ref.billing.address_1,
				address_2: ref.billing.address_2,
				city: ref.billing.city,
				state: ref.billing.state,
				postcode: ref.billing.postcode,
				country: ref.billing.country,
				email: ref.billing.email,
				phone: ref.billing.phone,
			};

		if (ref.shipping)
			m.shipping = {
				first_name: ref.shipping.first_name,
				last_name: ref.shipping.last_name,
				company: ref.shipping.company,
				address_1: ref.shipping.address_1,
				address_2: ref.shipping.address_2,
				city: ref.shipping.city,
				state: ref.shipping.state,
				postcode: ref.shipping.postcode,
				country: ref.shipping.country,
				email: ref.shipping.email,
				phone: ref.shipping.phone,
			};

		// remove empty fields
		for (const type of (['billing', 'shipping'] as (keyof Pick<CustomerOrder, 'shipping' | 'billing'>)[])) {
			const obj = m[type];
			if (!obj)
				continue;
				
			for (const k in obj)
				if (!obj[k])
					delete obj[k];
				
			// remove the root object if no keys inside
			if (!Object.keys(obj).length)
				delete m[type];
		}
					

		m.status = REMOTE_TO_LOCAL_STATUS[ref.status] as unknown as CustomerOrderStatus || CustomerOrderStatus.pending;
		m.totalPrice = refTotal;

		const allProductsSubbed: {[id: string]: Product['_amountData']}[] = [];

		if (!ref.line_items.length) {
			m.list = []
		}
		else {
			
			if (!m.list)
				m.list = [];

			//
			// build data new rows data
			const prods: {[id: string]: PricedRowSale['products'][0]} = {};
			const man: PricedRow['manual'] = [];

			for (const i of ref.line_items) {
				const pid = i.variation_id || i.product_id;
				const p = add.productsHm[pid];
				
				// add the product normally
				if (p)
					this.addProductWithCorrectedStocks(m, ep, add, p, prods, allProductsSubbed, pid, i.quantity);

				// if the product is deleted or not present we save it as a manual row
				// this can happen in case the product has not been synced OR if the product type is a custom type or composite etc..
				else 
					man.push(i.total
						? {description: i.quantity + 'x ' + i.name, sellPrice: DataFormatterService.stringToCents(i.total)}
						: {description: i.quantity + 'x ' + i.name}
					);

			}

			// TODO instead of adding this as an external cost
			// add as a businessService that is created based on the name of the shipping lines
			if (ref.shipping_lines?.length) {
				let tot = 0;
				for (const s of ref.shipping_lines)
					tot += DataFormatterService.stringToCents(s.total);

				man.push({sellPrice: tot, buyPrice: tot, description: 'Spedizione'})
			}


			// build final row
			if (!m.list[0])
				m.list[0] = {};

			if (m.date)
				m.list[0].date = m.date;

			if (Object.keys(prods).length)
				m.list[0].products = Object.values(prods);
			
			if (man.length)
				m.list[0].manual = man;

		}
		
		return {model: m, subbed: allProductsSubbed};
	}
	
	public async onUnsuccessfulSync(oUrl: string, cache: SyncDataItems<any>, opts: ItemsBuildOpts, currentlyProcessing: any, missingRef: ModelIdsHm): Promise<boolean> {
		// Orders may have product types that are not syncronizable, or broken products, that were deleted etc..
		// So we in case we're unable to sync them, we ignore them as they will be captured as a manual row
		delete missingRef[WooTypes.product];
		return Object.keys(missingRef).length ? false : true;
	}
}

export const WooSyncOrdersService = new _WooSyncOrdersService();
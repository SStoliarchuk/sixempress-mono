import { ExternalConnection } from '../../external-conn-paths/sync-config.dtd';
import { Customer, ExternalConnectionType } from '@sixempress/be-multi-purpose';
import { WooCustomer } from '@sixempress/contracts-agnostic';
import { ObjectUtils } from '@sixempress/main-be-lib';
import { SyncCustomersService } from '../../abstract/sync/sync-customers.service';
import { Request } from 'express';

/**
 * We only download the users, we do not upload them
 */
class _WooSyncCustomersService extends SyncCustomersService<WooCustomer> {

	protected type: ExternalConnectionType = ExternalConnectionType.wordpress;

	protected async translateAndSendToRemote() {
		// no need to sync with remote
		return [];
	}

	/**
	 * translates the remote object to a local one
	 * @param ep external connnection of the sync request
	 * @param ref the remote reference object
	 * @param loc the optional local object if present
	 */
	protected async translateItemToLocal(req: Request, ep: ExternalConnection, items: WooCustomer[], local: Map<WooCustomer, Customer>): Promise<Map<WooCustomer, Customer>> {
		const ret = new Map<WooCustomer, Customer>();

		for (const ref of items) {
			const l: Customer = local.has(ref) 
				? ObjectUtils.cloneDeep(local.get(ref)) 
				: {name: '', lastName: '', documentLocationsFilter: [ep.locationId]};
	
			l.name = ref.first_name || ref.username;
			l.lastName = ref.last_name;
	
			if (ref.billing)
				l.billing = ref.billing
			else
				delete l.billing;
	
			if (ref.shipping)
				l.shipping = ref.shipping
			else
				delete l.shipping
	
			if (ref.email)
				l.email = ref.email;
			else
				delete l.email;
	
			ret.set(ref, l);
		}

		return ret;
	}


}

export const WooSyncCustomersService = new _WooSyncCustomersService();
import { Request } from 'express';
import { ExternalConnection } from '../../external-conn-paths/sync-config.dtd';
import { DataSyncService } from './data-sync.service';
import { Customer, CustomerController } from '@sixempress/be-multi-purpose';
import { WooBaseItem } from '@sixempress/contracts-agnostic';
import { ItemsBuildOpts } from '../woo.dtd';
import { SyncableModel } from '../../syncable-model';

/**
 * We only download the users, we do not upload them
 */
export abstract class SyncCustomersService<A extends WooBaseItem> extends DataSyncService<A, Customer> {

	/**
	 * translates the remote object to a local one
	 * @param ep external connnection of the sync request
	 * @param ref the remote reference object
	 * @param loc the optional local object if present
	 */
	protected abstract translateItemToLocal(req: Request, ep: ExternalConnection, ref: A[], loc: Map<A, Customer>): Promise<Map<A, Customer>>;

	/**
	 * Processes the remote items into local ones
	 */
	public async receiveFromRemote(ep: ExternalConnection, req: Request, ids: (number | string)[], referenceItems: Map<string | number, A>, opts?: ItemsBuildOpts) {
		const c = new CustomerController();
		
		const acts = await this.automaticRemoteToLocalCompare(req, c, ep, ids, referenceItems, this.translateItemToLocal);

		await this.executeCrudActions(req, c, acts);
	}

}

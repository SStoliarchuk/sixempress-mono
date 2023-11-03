import { ExternalConnectionType } from '@sixempress/be-multi-purpose';
import { ExternalConnection } from '../../external-conn-paths/sync-config.dtd';
import { WooTypes, WPRemotePaths } from '../woo.enum';
import { ExternalSyncUtils } from '../../external-sync.utils';
import { WooProductSetStock } from '../../abstract/woo.dtd';
import { WooFetchedAggregatedInfo } from '../woo.dtd';
import { SyncProductMovementsService } from '../../abstract/sync/sync-product-movements.service';
import { SyncProductsService } from '../../abstract/sync/sync-products.service';
import { WooSyncProductsService } from './woo-sync-products.service';
import { Request } from 'express';

class _WooSyncProductMovementsService extends SyncProductMovementsService<WooProductSetStock> {

	protected type: ExternalConnectionType = ExternalConnectionType.wordpress;
	
	protected get productSync(): SyncProductsService<any> { return WooSyncProductsService };

	protected sendPayload(req: Request, ec: ExternalConnection, items: Array<{amount: number, id: string | number, op?: 'set'}>): Promise<void> {
		// we expect no response from this request
		return ExternalSyncUtils.requestToWoo(req, ec, 'POST', WPRemotePaths.product_amount, {items}, {forceJson: false});
	}

	protected async getRemoteStockInformation(req: Request, ec: ExternalConnection, remoteIds: (string | number)[]): Promise<Array<WooProductSetStock>> {
		const re = await ExternalSyncUtils.requestToWoo<WooFetchedAggregatedInfo>(req, ec, 'POST', WPRemotePaths.aggregate_sync_ids, {[WooTypes.product_amount]: remoteIds});
		const ret: Array<WooProductSetStock> = [];
		if (re[WooTypes.product_amount])
			for (const id in re[WooTypes.product_amount])
				ret.push({id: parseInt(id), value: re[WooTypes.product_amount][id].value});

		return ret;
	}

}


export const WooSyncProductMovementsService = new _WooSyncProductMovementsService();
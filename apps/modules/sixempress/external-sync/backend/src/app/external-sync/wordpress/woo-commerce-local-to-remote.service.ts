import { ModelClass, InventoryCategoryController, ProductMovementController, CustomerOrderController, ExternalConnection } from '@sixempress/be-multi-purpose';
import { LocalToRemoteSteps, SyncLocalToRemoteService } from "../abstract/local-to-remote.service";
import { ProductGroupTypeController } from '../abstract/sync/ProductType.controller';
import { WooSyncProductCategories } from './sync/woo-sync-product-categories.service';
import { WooSyncProductsService } from './sync/woo-sync-products.service';
import { WooSyncProductMovementsService } from './sync/woo-sync-product-movements.service';
import { WooSyncOrdersService } from './sync/woo-sync-orders.service';

class _WooCommerceLocalToRemoteService extends SyncLocalToRemoteService {
	
	protected orderedSteps: LocalToRemoteSteps<any>[] = [
		{ 
			modelClass: ModelClass.InventoryCategory,
			controller: InventoryCategoryController as any,
			fetch: [],
			send: (...args) => WooSyncProductCategories.translateAndSendToRemote(...args),
			onUnsuccessful: (...args) => WooSyncProductCategories.onUnsuccessfulSync(...args),
		},
		{ 
			modelClass: ModelClass.Product,
			controller: ProductGroupTypeController as any,
			fetch: [],
			send: (...args) => WooSyncProductsService.translateAndSendToRemote(...args),
			onUnsuccessful: (...args) => WooSyncProductsService.onUnsuccessfulSync(...args),
		},
		{ 
			modelClass: ModelClass.ProductMovement,
			controller: ProductMovementController as any,
			processAll: true,
			fetch: [],
			send: (...args) => WooSyncProductMovementsService.translateAndSendToRemote(...args),
			onUnsuccessful: (...args) => WooSyncProductMovementsService.onUnsuccessfulSync(...args),
		},
		{ 
			modelClass: ModelClass.CustomerOrder,
			controller: CustomerOrderController as any,
			fetch: [],
			send: (...args) => WooSyncOrdersService.translateAndSendToRemote(...args),
			onUnsuccessful: (...args) => WooSyncOrdersService.onUnsuccessfulSync(...args),
		},
	];

	public start() {
		
	}

}

export const WooCommerceLocalToRemoteService = new _WooCommerceLocalToRemoteService();
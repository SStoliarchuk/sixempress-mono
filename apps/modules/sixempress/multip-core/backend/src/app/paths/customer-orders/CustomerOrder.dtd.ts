import { SyncableModel } from '@sixempress/main-be-lib';
import { PricedRowsSaleModel } from '../../utils/priced-rows-sale/priced-rows-sale.dtd';
import { CustomerInformation } from '../customers/Customer.dtd';

// remember to update also LOCAL_TO_REMOTE_STATUS
// in woo-sync-order.service.ts
export enum CustomerOrderStatus {
	pending = 1,
	processing,
	onHold,
	
	completed,
	
	cancelled,
	refunded,
	failed,

	draft,
	completedPrePay,
}

export interface CustomerOrder extends PricedRowsSaleModel<CustomerOrderStatus>, SyncableModel {
	customerNote?: string,
	internalNote?: string,
	billing?: CustomerInformation,
	shipping?: CustomerInformation,
}

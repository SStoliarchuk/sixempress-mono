import { SyncableModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/syncable.model";
import { PricedRowsSaleModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd";
import { CustomerInformation } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/Customer";

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

export enum CustomerOrderStatusLabel {
	'Attesa Pagamento (Bozza)' = CustomerOrderStatus.pending,
	'In Processo' = CustomerOrderStatus.processing,
	'Sospeso' = CustomerOrderStatus.onHold,
	'Completato' = CustomerOrderStatus.completed,
	'Annullato' = CustomerOrderStatus.cancelled,
	'Rimborsato' = CustomerOrderStatus.refunded,
	'Fallito' = CustomerOrderStatus.failed,
	'Bozza' = CustomerOrderStatus.draft,
	'Completato, Da Pagare' = CustomerOrderStatus.completedPrePay,
}

export interface CustomerOrder extends PricedRowsSaleModel<CustomerOrderStatus>, SyncableModel {
	customerNote?: string,
	internalNote?: string,
	billing?: CustomerInformation,
	shipping?: CustomerInformation,
}

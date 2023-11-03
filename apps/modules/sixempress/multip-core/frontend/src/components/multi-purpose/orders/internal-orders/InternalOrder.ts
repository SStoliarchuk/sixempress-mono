import { PricedRowsModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.dtd";

export enum InternalOrderStatus {
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

export enum InternalOrderStatusLabel {
	'In Attesa' = InternalOrderStatus.pending,
	'In Processo' = InternalOrderStatus.processing,
	'Sospeso' = InternalOrderStatus.onHold,
	'Completato' = InternalOrderStatus.completed,
	'Annullato' = InternalOrderStatus.cancelled,
	'Rimborsato' = InternalOrderStatus.refunded,
	'Fallito' = InternalOrderStatus.failed,
	'Bozza' = InternalOrderStatus.draft,
	'Completato, Da Pagare' = InternalOrderStatus.completedPrePay,
}

export interface InternalOrder extends PricedRowsModel<InternalOrderStatus> {
	internalNote?: string,
}

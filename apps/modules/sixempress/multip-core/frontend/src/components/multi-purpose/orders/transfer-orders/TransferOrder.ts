import { PricedRowsModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.dtd";

export enum TransferOrderStatus {
	pending = 1,
	processing,
	onHold,

	completed,
	cancelled,
	refunded,
	failed,

	draft,
}
export enum TransferOrderStatusLabel {
	'In Attesa' = TransferOrderStatus.pending,
	'In Processo' = TransferOrderStatus.processing,
	'Sospeso' = TransferOrderStatus.onHold,
	'Completato' = TransferOrderStatus.completed,
	'Annullato' = TransferOrderStatus.cancelled,
	'Rimborsato' = TransferOrderStatus.refunded,
	'Fallito' = TransferOrderStatus.failed,
	'Bozza' = TransferOrderStatus.draft,
}

export interface TransferOrder extends PricedRowsModel<TransferOrderStatus> {
	transferOriginLocationId: string,
	economicTransfer?: true,
}

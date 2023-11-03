import { PricedRowsModel } from '../../utils/priced-rows/priced-rows.dtd';

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

export interface TransferOrder extends PricedRowsModel<TransferOrderStatus> {
	transferOriginLocationId: string,
	economicTransfer?: true,
}

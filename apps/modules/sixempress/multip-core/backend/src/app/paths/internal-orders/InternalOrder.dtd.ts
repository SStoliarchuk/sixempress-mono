import { PricedRowsModel } from '../../utils/priced-rows/priced-rows.dtd';

export enum InternalOrderStatus {
	/** The order has yet to be acknowledged by the supplier */
	pending = 1,
	/** The order is being processed by the supplier */
	processing,
	/** The order was processing but then put on hold for some reason */
	onHold,
	
	/** The order has been completed and payed fully */
	completed,
	/** The order has been cancelled, useful for a "not longer needed" type of scenario ? */
	cancelled,
	/** The order has been sent back to supplier and refunded */
	refunded,
	/** The order has failed for some reason */
	failed,

	/** Draft */
	draft,
	/** Items have been received but the payment is not yet complete */
	completedPrePay,
}

export interface InternalOrder extends PricedRowsModel<InternalOrderStatus> {
	internalNote?: string,
}

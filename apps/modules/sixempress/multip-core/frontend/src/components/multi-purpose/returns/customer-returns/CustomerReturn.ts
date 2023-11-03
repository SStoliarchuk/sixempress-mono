import { FetchableField } from '@sixempress/main-fe-lib';
import { PricedRowsModel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.dtd';
import { Customer } from "../../customers/Customer";

export enum CustomerReturnStatus {
	/** The items are being evaluated for accepted as refunds */
	pending = 1,
	/** The items have been accepted as a refund but nothing has been given to the customer in return ?*/
	accepted,
	/** Draft */
	draft,
	/** The items have been throw away */
	trashed,
	/** The refund has been cancelled */
	cancelled,
	/** The customer has received it's money back */
	refunded,
	/** Instead of refunding we generated a coupon for the customer */
	generatedCoupon,
}
export enum CustomerReturnStatusLabel {
	'Bozza' = CustomerReturnStatus.draft,
	'In attesa' = CustomerReturnStatus.pending,
	'Accettato' = CustomerReturnStatus.accepted,
	'Reso Eliminato' = CustomerReturnStatus.trashed,
	'Annullato' = CustomerReturnStatus.cancelled,

	'Rimborsato al Cliente' = CustomerReturnStatus.refunded,
	'Generato Coupon' = CustomerReturnStatus.generatedCoupon,
}

export enum CustomerReturnItemStatus {
	itemsDamaged = 1,
	itemsWorking,
	itemsReturned,
}

export enum CustomerReturnItemStatusLabel {
	'Danneggiati' = CustomerReturnItemStatus.itemsDamaged,
	'Intatti' = CustomerReturnItemStatus.itemsWorking,
	'Danneggiati Ritornati al Fornitore' = CustomerReturnItemStatus.itemsReturned,
}

export interface CustomerReturn extends PricedRowsModel<CustomerReturnStatus> {
	customer?: FetchableField<Customer>;
	itemStatus: CustomerReturnItemStatus;
}


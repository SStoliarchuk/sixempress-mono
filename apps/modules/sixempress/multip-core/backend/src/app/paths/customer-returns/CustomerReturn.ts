import { FetchableField, } from '@sixempress/main-be-lib';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { PricedRowsModel } from '../../utils/priced-rows/priced-rows.dtd';


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

export enum CustomerReturnItemStatus {
	itemsDamaged = 1,
	itemsWorking,
	itemsReturned,
}

export interface CustomerReturn extends PricedRowsModel<CustomerReturnStatus> {
	customer?: FetchableField<ModelClass.Customer>;
	itemStatus: CustomerReturnItemStatus;
}

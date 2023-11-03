import { Customer } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/Customer";
import { TransferOrder } from "apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/transfer-orders/TransferOrder";
import { FetchableField } from "@sixempress/main-fe-lib";
import { PricedRow, PricedRowsModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.dtd";

export interface PricedRowSale extends PricedRow {
	products?: Array<PricedRow['products'][0] & {
		/**
		 * This field is used to create transfer orders from other endpoints to the current physical location
		 * so the locId here cannot be the model physicalLocation
		 * 
		 * it is only for transfer and it is not added to the product amount bought
		 * 
		 * usage example:
		 * we have two location, A and B
		 * the stock is A: 15, B: 3
		 * 
		 * if we want to sell 10 products from physicalLocation B
		 * we set the product object to {amount: 10, transfer: {A: 7}}
		 * 
		 * meaning we sell 10 items, and 7 of those are transfered from A
		 */
		transfer?: {[locId: string]: number}
	}>;
}

export interface PricedRowsSaleModel<T extends number> extends PricedRowsModel<T> {
	
	customer?: FetchableField<Customer>;
	list: PricedRowSale[];
	
	// we need to track the orders as if a user modifies them we need to keep the updates done by the user
	// thus the system will check if transfer order is present then it will update the existing one, otherwise will create one
	_transferOrders?: FetchableField<TransferOrder>[];
}

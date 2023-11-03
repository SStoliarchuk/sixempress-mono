import { Request } from 'express';
import { DeleteResult, IVerifiableItemDtd, RestoreDeletedOptions } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { CustomerOrder, CustomerOrderStatus } from './CustomerOrder.dtd';
import { PricedRowsSaleController } from '../../utils/priced-rows-sale/priced-rows-sale.controller';
import { Filter } from 'mongodb';

export class CustomerOrderController extends PricedRowsSaleController<CustomerOrder> {

	modelClass = ModelClass.CustomerOrder;
	collName = ModelClass.CustomerOrder;
	bePath = BePaths.CustomerOrder;

	Attributes = {
		view: Attribute.viewCustomerOrder,
		add: Attribute.addCustomerOrder,
		modify: Attribute.modifyCustomerOrder,
		delete: Attribute.deleteCustomerOrder,
	}

	modelStatus = {
		all: Object.values(CustomerOrderStatus).filter(v => typeof v === 'number') as number[],
		draft: [CustomerOrderStatus.draft, CustomerOrderStatus.pending],
		fail: [CustomerOrderStatus.cancelled, CustomerOrderStatus.failed, CustomerOrderStatus.refunded],
		success: [CustomerOrderStatus.completed],
		successPrePay: [CustomerOrderStatus.completedPrePay],
	}

	dtd: IVerifiableItemDtd<CustomerOrder> = {
		customerNote: { type: [String], required: false },
		internalNote: {type: [String], required: false},
		billing: {type: [Object], required: false, objDef: [{
			first_name: {type: [String], required: false},
			last_name: {type: [String], required: false},
			company: {type: [String], required: false},
			address_1: {type: [String], required: false},
			address_2: {type: [String], required: false},
			city: {type: [String], required: false},
			state: {type: [String], required: false},
			postcode: {type: [String], required: false},
			country: {type: [String], required: false},
			email: {type: [String], required: false},
			phone: {type: [String], required: false},
		}]},
		shipping: {type: [Object], required: false, objDef: [{
			first_name: {type: [String], required: false},
			last_name: {type: [String], required: false},
			company: {type: [String], required: false},
			address_1: {type: [String], required: false},
			address_2: {type: [String], required: false},
			city: {type: [String], required: false},
			state: {type: [String], required: false},
			postcode: {type: [String], required: false},
			country: {type: [String], required: false},
			email: {type: [String], required: false},
			phone: {type: [String], required: false},
		}]},
	};
	
	/**
	 * Only removed _Deleted field, 
	 * 
	 * NOTE:
	 * 
	 * please re-save the item for the side-effects models (movements)
	 */
	public async restoreDeletedForUser(req: Request, filters: Filter<CustomerOrder>, options: RestoreDeletedOptions = {}): Promise<DeleteResult> {
		const items = await this.findItemsToDelete(req, filters, options);
		
		const e = await this.getCollToUse(req).updateMany(
			{_id: {$in: items.map(i => i._id)}},
			{$unset: {_deleted: 1}},
		);

		return {deletedCount: e.modifiedCount};
	}

}

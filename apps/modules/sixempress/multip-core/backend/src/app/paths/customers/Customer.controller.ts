import { AbstractDbApiItemController, IVerifiableItemDtd, } from "@sixempress/main-be-lib";
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { Customer } from "./Customer.dtd";

export class CustomerController extends AbstractDbApiItemController<Customer> {

	modelClass = ModelClass.Customer;
	collName = ModelClass.Customer;
	bePath = BePaths.customers;

	addIncrementalValue = true;
	requireDocumentLocation = false;
	
	Attributes = {
		view: Attribute.viewCustomers,
		add: Attribute.addCustomers,
		modify: Attribute.modifyCustomers,
		delete: Attribute.deleteCustomers,
	};

	dtd: IVerifiableItemDtd<Customer> = {
		name: {type: [String], required: true},
		lastName: {type: [String], required: false},
		phone: {type: [String], required: false},
		email: {type: [String], required: false},
		address: {type: [String], required: false},
		fiscalCode: {type: [String], required: false},
		notes: {type: [String], required: false},

		billing: {type: [Object], required: false, objDef: [{
			first_name: { type: [String], required: false },
			last_name: { type: [String], required: false },
			company: { type: [String], required: false },
			address_1: { type: [String], required: false },
			address_2: { type: [String], required: false },
			city: { type: [String], required: false },
			state: { type: [String], required: false },
			postcode: { type: [String], required: false },
			country: { type: [String], required: false },
			email: { type: [String], required: false },
			phone: { type: [String], required: false },
		}]},
		shipping: {type: [Object], required: false, objDef: [{
			first_name: { type: [String], required: false },
			last_name: { type: [String], required: false },
			company: { type: [String], required: false },
			address_1: { type: [String], required: false },
			address_2: { type: [String], required: false },
			city: { type: [String], required: false },
			state: { type: [String], required: false },
			postcode: { type: [String], required: false },
			country: { type: [String], required: false },
			email: { type: [String], required: false },
			phone: { type: [String], required: false },
		}]},
	};

}

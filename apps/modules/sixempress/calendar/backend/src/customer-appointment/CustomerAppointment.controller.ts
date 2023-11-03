import { IVerifiableItemDtd, } from '@sixempress/main-be-lib';
import { CustomerAppointment, CustomerAppointmentStatus } from './CustomerAppointment';
import { Attribute, BePaths, ModelClass } from '../enums';
import { PricedRowsSaleController } from '@sixempress/be-multi-purpose';

export class CustomerAppointmentController extends PricedRowsSaleController<CustomerAppointment> {

	modelClass = ModelClass.CustomerAppointment;
	collName = ModelClass.CustomerAppointment;
	bePath = BePaths.CustomerAppointment;

	Attributes = {
		view: Attribute.viewCustomerAppointment,
		add: Attribute.addCustomerAppointment,
		modify: Attribute.modifyCustomerAppointment,
		delete: Attribute.deleteCustomerAppointment,
	};

	modelStatus = {
		all: Object.values(CustomerAppointmentStatus).filter(v => typeof v === 'number') as number[],
		draft: [CustomerAppointmentStatus.draft],
		fail: [CustomerAppointmentStatus.failed],
		success: [CustomerAppointmentStatus.completed],
		successPrePay: [CustomerAppointmentStatus.completedPrePay],
	}

	dtd: IVerifiableItemDtd<CustomerAppointment> = {
		customerNotes: {type: [String], required: false},
		internalNotes: {type: [String], required: false},
	};
	
}

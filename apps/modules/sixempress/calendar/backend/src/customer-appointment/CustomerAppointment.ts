import { PricedRowsSaleModel } from "@sixempress/be-multi-purpose";

export enum  CustomerAppointmentStatus {
	pending = 1,
	inProgress,
	completed,
	failed,
	completedPrePay,
	draft,
}

export interface CustomerAppointment extends PricedRowsSaleModel<CustomerAppointmentStatus> {
	internalNotes?: string;
	customerNotes?: string;
}

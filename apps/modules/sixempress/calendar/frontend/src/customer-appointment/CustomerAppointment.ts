import { PricedRowsSaleModel } from "@sixempress/multi-purpose";

export enum  CustomerAppointmentStatus {
	pending = 1,
	inProgress,
	completed,
	failed,
	completedPrePay,
	draft,
}

export enum  CustomerAppointmentStatusLabel {
	'Sospeso' = CustomerAppointmentStatus.pending,
	'In Corso' = CustomerAppointmentStatus.inProgress,
	'Completo' = CustomerAppointmentStatus.completed,
	'Fallito' = CustomerAppointmentStatus.failed,
	'Completo, Da Pagare' = CustomerAppointmentStatus.completedPrePay,
	'Bozza' = CustomerAppointmentStatus.draft,
}

export const completedStatus = [
	CustomerAppointmentStatus.completed,
	CustomerAppointmentStatus.failed,
]

export interface CustomerAppointment extends PricedRowsSaleModel<CustomerAppointmentStatus> {
	internalNotes: string;
	customerNotes: string;
}

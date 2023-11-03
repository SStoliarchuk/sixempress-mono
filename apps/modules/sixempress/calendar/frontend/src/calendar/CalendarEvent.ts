import { FetchableField, IBaseModel } from "@sixempress/main-fe-lib";
import { Customer, Sale } from "@sixempress/multi-purpose";
// import { BusinessService } from "../business-services/BusinessService";

export enum CalendarEventType {
	generic = 1,
	saleAppointment, 
}

export interface CalendarEvent extends IBaseModel {
	title: string;
	endDate: number;
	allDay?: boolean;

	data: {
		type: CalendarEventType,
		data?: any,
	};
}

export interface IGenericEvent extends CalendarEvent {
	data: {
		type: CalendarEventType.generic,
		data?: string,
	};
}

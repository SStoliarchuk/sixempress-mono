import { IBaseModel, FetchableField, } from '@sixempress/main-be-lib';

export enum CalendarEventType {
	generic = 1,
	saleAppointment, 
}

export interface CalendarEvent extends IBaseModel {
	title: string;
	endDate: number;
	allDay?: boolean;

	data?: {
		type: CalendarEventType.generic,
		data?: IGenericEventData,
	}
}

export interface SocketUpdateMessage {
	action: "delete" | 'update' | 'create';
	data: Array<string>; // ids
	// data: Array<Pick<CalendarEvent, "_id" | "date" | "endDate">>;
}

export declare type IGenericEventData = string;

import { CustomerAppointment } from "../customer-appointment/CustomerAppointment";
import { ModelClass } from "../enums";
import { CalendarEvent } from "./CalendarEvent";
import { Event } from "react-big-calendar";

export enum Views {
	MONTH = 'month',
	WEEK = 'week',
	WORK_WEEK = 'work_week',
	DAY = 'day',
	AGENDA = 'agenda',
}

export interface SlotSelect {
	start: Date;
	end: Date;
	slots: Date[];
	action: 'select' | 'click' | 'doubleClick';
}

export interface DraggedEvent {
	start: Date;
	end: Date;
	isAllDay: boolean;
	event: CustomCalendarEvent;
}

export interface DragModifyType { 
	direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
	action: 'resize' | 'move';
	event: CustomCalendarEvent;
}

export interface CustomCalendarEvent extends Event {
	resource: CalendarEvent | CustomerAppointment;
	modelClass: ModelClass;
}

export interface ICState {
	events: CustomCalendarEvent[];
	viewingDate: Date;
	timesteps: '1h' | '30min' | '15min';
	timestepsFrom: Date;
	timestepsTo: Date;
	currentView: Views;
	draggedEvent: null | DragModifyType;
	eventDetailPopover?: {
		element: HTMLElement;
		open: boolean;
		data: CustomCalendarEvent;
	};
}


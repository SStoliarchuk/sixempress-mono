import { AbstractDbApiItemController, IVerifiableItemDtd, FetchableField, CS, RequestHelperService, CustomExpressApp } from '@sixempress/main-be-lib';
import { Attribute } from '../enums';
import { ModelClass } from '../enums';
import { BePaths } from '../enums';
import { CalendarEvent, CalendarEventType } from './CalendarEvent';

export class CalendarEventController extends AbstractDbApiItemController<CalendarEvent> {

	modelClass = ModelClass.CalendarEvent;
	collName = ModelClass.CalendarEvent;
	bePath = BePaths.calendarevents;

	Attributes = {
		view: Attribute.viewCalendarEvents,
		add: Attribute.addCalendarEvents,
		modify: Attribute.modifyCalendarEvents,
		delete: Attribute.deleteCalendarEvents,
	};

	addDateField = true;

	dtd: IVerifiableItemDtd<CalendarEvent> = {
		title: { type: [String], required: true, },

		endDate: { type: [Number], required: true, customFn: (v, b: CalendarEvent) => v < b.date && "The end date cannot be lower than the start date" },
		allDay: { type: [Boolean], required: false, },

		data: { type: [Object], required: true, objDef: [{
			type: { type: [Number], required: true, possibleValues: [CalendarEventType.generic] },
			data: { type: [String], required: false, },
		}] },
	};

}

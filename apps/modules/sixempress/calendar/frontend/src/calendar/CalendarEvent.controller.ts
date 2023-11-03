import { CalendarEvent } from "./CalendarEvent";
import { DbObjectSettings, AbstractDbItemController, } from "@sixempress/main-fe-lib";
import { BePaths, ModelClass } from "../enums";

export class CalendarEventController extends AbstractDbItemController<CalendarEvent> {
	
	bePath = BePaths.calendarevents;
	modelClass = ModelClass.CalendarEvent;
	
	protected fetchInfo: DbObjectSettings<CalendarEvent> = {
	};
}

import { ModelClass } from "../../enums";
import { CalendarEvent, CalendarEventType } from "../CalendarEvent";
import { Omit } from "@material-ui/core";


export interface AEMPropsOpen {
	modelClass?: ModelClass,
	updateEvent: () => void,
	onSubmit: (eventData: CalendarEvent) => void;
	edit?: Partial<CalendarEvent>;
}

export declare type ReturningEvent<T extends CalendarEvent> = Omit<T, 'documentLocationsFilter' | "date" | "endDate" | "allDay">;

export declare type AEMProps_INTERNAL = AEMPropsOpen & {
	onClose: () => void;
	onSubmit: (eventData: ReturningEvent<CalendarEvent>) => void;
	canSave: boolean;
};

export interface EEMState {
	type: ModelClass;
	allDay: boolean;
	fromDate: Date;
	toDate: Date;
	position: string;
}

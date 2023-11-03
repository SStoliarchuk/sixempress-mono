import { Component } from "react";
import moment from "moment";
import { Observable } from "rxjs";
import { CalendarEvent, CalendarEventType } from "./CalendarEvent";
import { CalendarCacheKeys } from "../enums";
import { DataStorageService, ObjectUtils, SelectFieldValue, AuthService,   BaseQueryParams, IPatchOperation, SnackbarService, IBaseModel } from "@sixempress/main-fe-lib";
import { ModelClass } from '../enums';
import { Attribute } from '../enums';
import { BePaths } from '../enums';
import { ICState, Views, CustomCalendarEvent } from "./calendar.dtd";
import { SocketService } from "@sixempress/main-fe-lib";
import { SocketCodes, SocketDBObjectChangeMessage } from "@sixempress/main-fe-lib";
import { openEventEditorModal } from "./create-event/create-event";
import { CalendarEventController } from "./CalendarEvent.controller";
import { CustomerAppointmentController } from "../customer-appointment/customer-appointment.controller";
import { CustomerAppointment } from "../customer-appointment/CustomerAppointment";
import { CustomerController } from "@sixempress/multi-purpose";

export function isEvent(i: any): i is CalendarEvent {
	return Boolean((i as CalendarEvent).title);
}

type Ret<M> = M extends ModelClass.CalendarEvent ? CalendarEventController :
M extends ModelClass.CustomerAppointment ? CustomerAppointmentController :
null;

export function getController<M extends ModelClass>(m: M): Ret<M> {
	return m == ModelClass.CalendarEvent ? new CalendarEventController() :
	m == ModelClass.CustomerAppointment ? new CustomerAppointmentController() :
	null as any;
}

export class CalendarLogic extends Component<{}, ICState> {
	
	protected controller = new CalendarEventController();

	constructor(p) {
		super(p);

		const storedTimestepsFrom = DataStorageService.localStorage.getItem(CalendarCacheKeys.calendarStepsFrom);
		const storedTimestepsTo = DataStorageService.localStorage.getItem(CalendarCacheKeys.calendarStepsTo);

		const tsFromToSet = storedTimestepsFrom ? new Date(storedTimestepsFrom) : moment().set({h: 7, m: 0, s: 0}).toDate();
		const tsToToSet = storedTimestepsTo ? new Date(storedTimestepsTo) : moment().set({h: 22, m: 59, s: 59}).toDate();

		this.timestepsFromValues = new Array(23).fill(undefined).map((n, v) => ({value: v, label: v.toString()}));
		this.updateTsToValues(tsFromToSet.getHours());

		this.state = {
			events: [],
			timesteps: DataStorageService.localStorage.getItem(CalendarCacheKeys.calendarSteps) as any || "1h",
			currentView: DataStorageService.localStorage.getItem(CalendarCacheKeys.calendarView) as any || Views.MONTH,
			timestepsFrom: tsFromToSet,
			timestepsTo: tsToToSet,
			viewingDate: new Date(),
			draggedEvent: null,
		};
	}

	protected timestepsFromValues: SelectFieldValue[];
	protected timestepsToValues: SelectFieldValue[];

	private getQuery: BaseQueryParams<CalendarEvent> = {
		projection: {
			title: 1,
			date: 1,
			endDate: 1,
			allDay: 1,
			"data.type": 1,
			// used to add the green/red border
			"data.data.relativeSale.__": 1,
			// used to know if an ite is deleted
			"_deleted.__": 1,
		},
	}
	private getQueryApp: BaseQueryParams<CustomerAppointment> = {
		fetch: [{
			field: 'customer',
		}],
		projection: {
			date: 1,
			endDate: 1,
			customer: 1,
			status: 1,
			// used to know if an ite is deleted
			"_deleted.__": 1,
		},
	}

	componentDidMount() {
		this.updateEventsByDate();
		SocketService.on(SocketCodes.dbObjectChange, this.updateBySocket);
	}

	componentWillUnmount() {
		SocketService.off(SocketCodes.dbObjectChange, this.updateBySocket);
	}

	/**
	 * Checks the data that has been updated, and udpates the calendar if at least 1 new item
	 * is in the current view interval
	 */
	private updateBySocket = (info: SocketDBObjectChangeMessage) => {
		if (([ModelClass.CalendarEvent, ModelClass.CustomerAppointment] as string[]).includes(info.m))
			this.updateEventInState(info.i, info.m, true);
		}

	/**
	 * Changes the available timeframe "to" values
	 */
	private updateTsToValues(tsFromHourValue: number) {
		this.timestepsToValues = new Array(24 - tsFromHourValue).fill(undefined).map((n, v) => ({value: (23 - v), label: (23 - v).toString()}));
		this.timestepsToValues.reverse();
	}


	protected updateEventsByDate(d?: Date) {
		const dateTouse = d || this.state.viewingDate;
		
		this.retrieveEventsInfoByDate(dateTouse).then(r => {
			this.setState({events: r, viewingDate: dateTouse});
		});
	}

	/**
	 * Updates the timeframe visible in the calendar week/day
	 */
	protected changeTimestepsFromTo(isFrom: boolean, hourStr: string) {
		const hour = parseInt(hourStr);
		if (isFrom) {
			const date = moment().set({h: hour, m: 0, s: 0}).toDate();
			DataStorageService.localStorage.setItem(CalendarCacheKeys.calendarStepsFrom, date.toString());
			this.updateTsToValues(hour);
			if (hour >= this.state.timestepsTo.getHours()) {
				const toDate = moment(date).set({m: 59, s: 59}).toDate();
				DataStorageService.localStorage.setItem(CalendarCacheKeys.calendarStepsTo, toDate.toString());
				this.setState({timestepsFrom: date, timestepsTo: toDate});
			} else {
				this.setState({timestepsFrom: date});
			}
		} 
		else {
			const date = moment().set({h: hour, m: 59, s: 59}).toDate();
			// const date = moment().set({h: hour === 23 ? 0 : hour + 1, m: 0, s: 0}).toDate();
			DataStorageService.localStorage.setItem(CalendarCacheKeys.calendarStepsTo, date.toString());
			this.setState({timestepsTo: date});
		}

	}

	/**
	 * Gets the events info from the BE
	 */
	protected async retrieveEventsInfoByDate(date: Date): Promise<CustomCalendarEvent[]> {
		// get only the days missinng to fill the disabled week days in the calendar
		// exagerate a bit to be sure to get the events
		const startMonth = moment(date).startOf('M');
		const startUnix = startMonth.subtract(8, 'd').startOf('d').unix();

		const endMonth = moment(date).endOf('M');
		const endUnix = endMonth.add(8, 'd').endOf('d').unix();

		const [evs, app] = await Promise.all([
			this.controller.getMulti({
				params: { 
					...this.getQuery,
					filter: {$or: [
						// if the beginning is in range
						{'date': {$gte: startUnix, $lte: endUnix}}, 
						// if the end is in range
						{'endDate': {$gte: startUnix, $lte: endUnix}}, 
						// or if both "ends" of the event are outside the current frame
						// but the middle is in current frame
						{'date': {$lte: startUnix}, 'endDate': {$gte: endUnix}}
					]},
				}
			}),
			new CustomerAppointmentController().getMulti({
				params: { 
					...this.getQueryApp,
					filter: {$or: [
						// if the beginning is in range
						{'date': {$gte: startUnix, $lte: endUnix}}, 
						// if the end is in range
						{'endDate': {$gte: startUnix, $lte: endUnix}}, 
						// or if both "ends" of the event are outside the current frame
						// but the middle is in current frame
						{'date': {$lte: startUnix}, 'endDate': {$gte: endUnix}}
					]},
				}
			})
		]);

		const events: CustomCalendarEvent[] = [
			...evs.data.map(this.convertToCalendarEvent),
			...app.data.map(this.convertToCalendarEvent),
		];

		return events;
	}

	/**
	 * Transform a backend event into a react calendar event object
	 */
	protected convertToCalendarEvent(i: CalendarEvent | CustomerAppointment): CustomCalendarEvent {
		if (isEvent(i)) {
			return {
				title: i.title,
				start: new Date(i.date * 1000),
				end: i.endDate ? new Date(i.endDate * 1000) : moment(i.date * 1000).add(30, 'minute').toDate(),
				allDay: i.allDay || false,
				resource: i,
				modelClass: ModelClass.CalendarEvent
			};
		}
		else {
			return {
				title: CustomerController.formatCustomerName(i.customer),
				start: new Date(i.date * 1000),
				end: i.endDate ? new Date(i.endDate * 1000) : moment(i.date * 1000).add(30, 'minute').toDate(),
				allDay: false,
				resource: i,
				modelClass: ModelClass.CustomerAppointment
			};
		}
	}

	/**
	 * updates the given ids in the state
	 */
	protected updateEventInState = async (ids: string | string[], modelClass: string, socketRequest?: boolean) => {
		// if the socket is active
		// then dont update if the function wasnt called from the request
		if (SocketService.isActive && !socketRequest)
			return;

		const idArr = typeof ids === 'string' ? [ids] : ids;

		const inDb = await (modelClass === ModelClass.CalendarEvent 
			? new CalendarEventController().getMulti(({params: {...this.getQuery, filter: {_id: {$in: idArr}}}}))
			: new CustomerAppointmentController().getMulti(({params: {...this.getQueryApp, filter: {_id: {$in: idArr}}}})));

		// check if the date is oc		
		this.setState(s => {
			const inState = [...s.events];

			for (const id of idArr) {
				const mov = (inDb.data as IBaseModel[]).find(i => i._id === id) as CalendarEvent | CustomerAppointment;
				const idx = inState.findIndex(m => m.resource._id === id);
				
				// is deleted 
				if (!mov || mov._deleted) {
					if (idx !== -1) { 
						inState.splice(idx, 1); 
					}
				}
				// if not present in array
				// then add it
				else if (idx === -1) {
					inState.push(this.convertToCalendarEvent(mov));
				}
				// else if present then update
				else {
					inState.splice(idx, 1, this.convertToCalendarEvent(mov));
				}

			}

			return {events: inState};
		});
	}

	/**
	 * Used to update immediately the drag n drop, instead of the lagging effect (eww)
	 * @param items[n].__sync_deleted is used as a _deleted field, but you just set true instead of setting the whole _deleted object
	 */
	private updateEventTimesSync(items: ((CalendarEvent | CustomerAppointment) & {__sync_deleted?: true})[]) {
		
		this.setState(s => {
			const evs = [...s.events];
			
			for (const i of items) {
				const idx = ObjectUtils.indexOfByField(evs, 'resource._id', i._id);
				
				if (i._deleted || i.__sync_deleted) {
					if (idx !== -1) {
						evs.splice(idx, 1);
					}
				}
				else if (idx === -1) { 
					evs.push(this.convertToCalendarEvent(i));
				}
				else {
					const e = {...evs[idx]};

					e.start = new Date(i.date * 1000);
					e.end = new Date(i.endDate * 1000);
					if (isEvent(i))
						e.allDay = i.allDay;

					evs[idx] = e;
				}
			}

			return {events: evs};
		});
	}


	protected openCreateEventModal = (start?: Date, end?: Date) => {
		openEventEditorModal({
			updateEvent: () => {},
			onSubmit: (e) => this.saveEvent(e).then(),
			edit: {
				date: start && Math.floor(start.getTime() / 1000),
				endDate: end && Math.floor(end.getTime() / 1000),
			},
		});
	}

	protected openEditEventModal = (event: CalendarEvent | CustomerAppointment, modelClass: ModelClass) => {
		openEventEditorModal({
			modelClass,
			updateEvent: () => {this.updateEventInState(event._id, modelClass)},
			onSubmit: (e) => this.updateEvenet(event._id, e).then(),
			edit: {...event},
		});
	}

	protected saveEvent(e: CalendarEvent): Promise<void> {
		return new Promise<void>((r, j) => {

			if (!AuthService.isAttributePresent(Attribute.addCalendarEvents))
				return r();

			// craete a temporal id to add it immediately to the 
			// calendaer
			const tempId = Math.random().toString();
			this.updateEventTimesSync([{...e, _id: tempId}]);

			this.controller.post(e).then(r => {
				
				// once we created the event 
				// we update the temp id with the true id
				this.setState(
					(s) => {
						const evs = [...s.events];
						const idx = evs.findIndex(ev => ev.resource._id === tempId);
						const alreadyPresent = evs.find(ev => ev.resource._id === r._id);
						
						// if the temp id is still in the array
						if (idx !== -1) {
							// if the UPDATED id is present, thenr emove the temp event
							// (this is possible as the socket could emit the saved event before we reach here)
							if (alreadyPresent) {
								evs.splice(idx, 1);
							}
							// if it's not yet present then we update the temp id wit the actual id
							// so that later it will be replaced correctly by the GET
							else {
								evs[idx] = {...evs[idx], resource: {...evs[idx].resource, _id: r._id}};
							}
						}

						return {events: evs};
					},
					// and the we udpate the actual event correctly
					() => this.updateEventInState(r._id, ModelClass.CalendarEvent)
				);
			}, (err) => {
				this.updateEventTimesSync([{...e, __sync_deleted: true}]);
				throw err;
			});
		});
	}

	protected updateEvenet(id: string, e: CalendarEvent): Promise<void> {
		return new Promise<void>((r, j) => {
			// ensure it can be modified
			if (!this.canEditEvent(e)) {
				SnackbarService.openSimpleSnack('Non puoi modificare questo evento', {variant: 'error'})
				return r(); 
			}

			// ensure id is assigned always for the sync update
			e._id = id;
			const oldInState = this.state.events.find(ev => ev.resource._id === id);

			this.updateEventTimesSync([e]);
			this.controller.put(id, e).then(() => {
				this.updateEventInState(id, ModelClass.CalendarEvent);
				r();
			}, (err) => {
				if (oldInState) {
					this.updateEventTimesSync([oldInState.resource]);
				} else {
					this.updateEventTimesSync([{...e, __sync_deleted: true}]);
				}
				throw err;
			});
		});
	}

	protected moveEvent(id: string, start: number, end: number, allDay: boolean): Observable<void> {
		return new Observable(obs => {

			const inStateEv = this.state.events.find(e => e.resource._id === id);
			// i dont think you can move an event not in state
			if (!this.canEditEvent(inStateEv.resource) || !inStateEv) { 
				SnackbarService.openSimpleSnack('Non puoi modificare questo evento', {variant: 'error'})
				return obs.complete(); 
			}

			const patchOps: IPatchOperation<any>[] = [
				{op: "set", path: 'date', value: start},
				{op: "set", path: 'endDate', value: end},
			];

			const e = ObjectUtils.cloneDeep(inStateEv).resource;
			e.date = start;
			e.endDate = end;
	
			if (isEvent(e)) {
				if (allDay) {
					e.allDay = true;
					patchOps.push({op: 'set', path: 'allDay', value: true});
				} else {
					delete e.allDay;
					patchOps.push({op: 'unset', path: 'allDay', value: ""});
				}
			}

			this.updateEventTimesSync([e]);
			const controller = getController(inStateEv.modelClass) as any;
			controller.patch(id, patchOps).then(() => {
				this.updateEventInState(id, inStateEv.modelClass);
				obs.next();
			}, (err) => {
				this.updateEventTimesSync([inStateEv.resource]);
				throw err;
			});
		});
	}

	protected canEditEvent(e: CalendarEvent | CustomerAppointment): boolean {
		if (isEvent(e)) {
			if (AuthService.isAttributePresent(Attribute.modifyCalendarEvents))
				return true;
		}
		else {
			if (AuthService.isAttributePresent(Attribute.modifyCustomerAppointment))
				return true;
		}

		// if (e.data) {
		// 	switch (e.data.type) {
		// 		case CalendarEventType.saleAppointment: 
		// 			return true
		// 	}
		// }

		return false;
	}

}

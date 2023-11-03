import React from "react";
import { Calendar as ReactBigCalendar, momentLocalizer, Messages, CalendarProps } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import "./calendar.css";
import "./event-slot-specific.css";
import { AuthService,  DataStorageService, FieldsFactory, SelectFieldValue, UiSettings } from "@sixempress/main-fe-lib";
import { Attribute, ModelClass } from '../enums';
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import { CalendarCacheKeys } from "../enums";
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { CalendarLogic } from "./calendar.logic";
import { SlotSelect, CustomCalendarEvent, DraggedEvent, Views, DragModifyType } from "./calendar.dtd";
import { EventPop } from "./event-pop/event-pop";
import { CustomerAppointment, completedStatus } from "../customer-appointment/CustomerAppointment";

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(ReactBigCalendar);


// we disable dnd on phones cause it's buggy af
// TODO instead of checkgin width we should have a 
// DeviceInfoService or some shit
const BigCalendar: typeof DragAndDropCalendar = UiSettings.moreSm() 
	? DragAndDropCalendar 
	: ReactBigCalendar as any as typeof DragAndDropCalendar;


export default class Calendar extends CalendarLogic {
	
	private scrollToTime = moment().subtract(1, 'h').toDate();

	private messages: Messages = {
		date: "Data",
		time: "Ora",
		event: "Evento",
		allDay: "Giorno intero",
		week: "Settimana",
		// work_week: string,
		day: "Giorno",
		month: "Mese",
		previous: "Precedente",
		next: "Prossimo",
		yesterday: "Ieri",
		tomorrow: "Domani",
		today: "Oggi",
		agenda: "Agenda",
		showMore: (count: number) => "+ altri " + count,
		noEventsInRange: "Non ci sono eventi",
	};

	private timestepsValues: SelectFieldValue[] = [{
		label: "1 ora",
		value: "1h",
	}, {
		label: "30 min",
		value: "30min",
	}, {
		label: "15 min",
		value: "15min",
	}];

	private handleNavigate = (d: Date) => {
		this.updateEventsByDate(d);
	}

	private onViewChanged = (v: Views) => {
		DataStorageService.localStorage.setItem(CalendarCacheKeys.calendarView, v);
		this.setState({currentView: v});
	}

	private onCloseCalendarEvent = () => {
		this.setState({eventDetailPopover: {...this.state.eventDetailPopover, open: false}});
	}

	private onClickCalendarEvent = (ce: CustomCalendarEvent, clickEvent: React.MouseEvent<any>) => {
		this.setState({eventDetailPopover: {element: clickEvent.target as any, data: ce, open: true}});
	}

	private handleSelectSlot = (item: SlotSelect) => {
		// if there is a popup showing, then dont create event
		if (document.getElementsByClassName('rbc-overlay').length !== 0) {
			return;
		}

		// apparently the react-big-calendar passes the Dates as references
		// so when we modify, we fuck up the whole calendar
		// so we reacreate the dates to alter them later with no problem
		item.start = new Date(item.start);
		item.end = new Date(item.end);
		

		// if in the month view, or week view, but chosen multiple days
		// then the creation should be at current hour
		if (
			this.state.currentView === Views.MONTH || 
			(
				this.state.currentView === Views.WEEK && 
				item.start.getDate() !== item.end.getDate()
			)
		) {
			const curr = new Date();
			item.start.setHours(curr.getHours(), curr.getMinutes());
			item.end.setHours(curr.getHours(), curr.getMinutes() + 30);
		}
		// add 30 min for the click event
		if (item.start.getTime() === item.end.getTime()) {
			item.end = moment(item.start).add(30, 'm').toDate();
		}

		// if a simple click then ensure the minimum time is 30 min
		if (item.action === 'click' && moment(item.start).diff(moment(item.end), 'm') < 30) {
			item.end = moment(moment(item.start).add(30, 'm')).toDate(); 
		}

		this.openCreateEventModal(item.start, item.end);
	}


	private handleCreateEvent = (e?: any) => {
		this.openCreateEventModal();
	}

	private handleDragStart = (info: DragModifyType) => {
		this.setState({ draggedEvent: info });
	}

	private handleEventMove = (info: DraggedEvent) => {
		this.moveEvent(
			info.event.resource._id, 
			Math.floor(info.start.getTime() / 1000), 
			Math.floor(info.end.getTime() / 1000), 
			info.isAllDay
		).subscribe();
	}

	// private resizeEvent = (info: DraggedEvent) => {
	// 	const toUpdate =cloneDeep(info.event.resource);
	// 	toUpdate.date = Math.floor(info.start.getTime() / 1000);
	// 	toUpdate.endDate = Math.floor(info.end.getTime() / 1000);

	// 	// ensure it doesnt go less then 30 min
	// 	if (moment(info.end).diff(info.start, 'm') < 30) {
	// 		toUpdate.endDate = moment(info.start).add(30, 'm').unix();
	// 	}
	// 	this.updateEvenet(info.event.resource._id, toUpdate).subscribe();
	// }


	private onChangeTimeteps = (e: React.ChangeEvent<any>) => {
		const val: any = e.target.value;
		DataStorageService.localStorage.setItem(CalendarCacheKeys.calendarSteps, val);
		this.setState({timesteps: val});
	}

	private onChangeTimestepsFrom = (e: React.ChangeEvent<any>) => {
		this.changeTimestepsFromTo(true, e.target.value);
	}

	private onChangeTimestepsTo = (e: React.ChangeEvent<any>) => {
		this.changeTimestepsFromTo(false, e.target.value);
	}

	private customEventStyle = (e: CustomCalendarEvent, start: Date, end: Date): ReturnType<CalendarProps['eventPropGetter']> => {

		let className = '';

		if (new Date().getTime() > end.getTime()) {
			className += ' past ';
		}
		
		if (e.modelClass === ModelClass.CustomerAppointment) {
			className += ' sale-appointment ';
			
			if (completedStatus.includes((e.resource as CustomerAppointment).status)) {
				className += ' sale-completed ';
			}
		}

		return {className};
	}


	render() {

		// default to 1h steps
		let step = 15;
		let timeslots = 4;

		if (this.state.timesteps === '30min') {
			timeslots = 2;
		} else if (this.state.timesteps === '15min') {
			timeslots = 1;
		}

		return (
			<>
				{this.state.eventDetailPopover && (
					<EventPop 
						open={this.state.eventDetailPopover.open}
						anchor={this.state.eventDetailPopover.element} 
						onClose={this.onCloseCalendarEvent}
						// TODO find a better solution to prevent event caching ?
						key={Math.random()}
						id={this.state.eventDetailPopover.data.resource._id}
						modelClass={this.state.eventDetailPopover.data.modelClass}
						canUpdate={this.canEditEvent} 
						onUpdate={this.updateEventInState} 
						onEdit={this.openEditEventModal}
					/>
				)} 
				<Paper>
					<div className='calendar-btns-container'>
						{AuthService.isAttributePresent(Attribute.addCalendarEvents) && (
							<div>
								<Button onClick={this.handleCreateEvent} variant='outlined' color='primary'>Crea</Button>
							</div>
						)}
						{(this.state.currentView === Views.WEEK || this.state.currentView === Views.DAY) && (
							<>
								<FieldsFactory.SelectField
									values={this.timestepsValues}
									label={"Step"}
									onChange={this.onChangeTimeteps}
									value={this.state.timesteps}
								/>
								<FieldsFactory.SelectField
									values={this.timestepsFromValues}
									label={"Da"}
									onChange={this.onChangeTimestepsFrom}
									value={this.state.timestepsFrom.getHours()}
								/>
								<FieldsFactory.SelectField
									values={this.timestepsToValues}
									label={"A"}
									onChange={this.onChangeTimestepsTo}
									value={this.state.timestepsTo.getHours()}
								/>
							</>
						)}
					</div>
					<div className='interventions-calendar-container'>
						<BigCalendar
							localizer={localizer}
							selectable={AuthService.isAttributePresent(Attribute.addCalendarEvents)}
							events={this.state.events}
							defaultView={this.state.currentView}
							defaultDate={new Date()}
							messages={this.messages}
							popup={true}
							popupOffset={30}
							min={this.state.timestepsFrom}
							max={this.state.timestepsTo}

							eventPropGetter={this.customEventStyle as any}
							onSelectEvent={this.onClickCalendarEvent as any}
							onSelectSlot={this.handleSelectSlot as any}
							onNavigate={this.handleNavigate}
							onView={this.onViewChanged as any}
							
							scrollToTime={this.scrollToTime}
							step={step}
							timeslots={timeslots}
							showMultiDayTimes={true}
							
							onEventDrop={this.handleEventMove as any}
							onDragStart={this.handleDragStart}

							// disable is to buggy and weird, for now let's disable it
							// onEventResize={this.resizeEvent as any}
							resizableAccessor={this.rFalse}
							resizable={false}
						/>
					</div>
				</Paper>
			</>
		);
	}
	private rFalse = () => false;
}

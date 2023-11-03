import './create-event.css';
import React from "react";
import moment from "moment";
import { ModalComponentProps, ModalService, DataStorageService, AuthService,  FieldsFactory, BusinessLocationsService, ContextService } from "@sixempress/main-fe-lib";
import { Attribute, ModelClass } from '../../enums';
import { CalendarEvent } from "../CalendarEvent";
import Paper from "@material-ui/core/Paper";
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { GenericEvent } from "./generic-event";
import { CalendarCacheKeys } from "../../enums";
import { AEMPropsOpen, EEMState, ReturningEvent } from "./create-event.dtd";
import Clock from "@material-ui/icons/Schedule";
import Visibility from "@material-ui/icons/Visibility";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import { CustomerAppointmentEditor } from '../../customer-appointment/table/customer-appointment.editor';


export function openEventEditorModal(props: AEMPropsOpen) {
	return ModalService.open({
		title: props.edit && props.edit._id ? "Modifica Evento" : "Crea Evento",
		content: EventEditorModal,
	}, props, {removePaper: true});
}

class EventEditorModal extends React.Component<AEMPropsOpen & ModalComponentProps, EEMState> {

	constructor(p: AEMPropsOpen & ModalComponentProps) {
		super(p);

		const data = p.edit || {};
		const startingType = p.modelClass || DataStorageService.localStorage.getItem(CalendarCacheKeys.calendarCreateEventType) as any || ModelClass.CalendarEvent;

		this.state = {
			type: startingType,
			allDay: typeof data.allDay === 'undefined' ? false : data.allDay,
			fromDate: data.date ? new Date(data.date * 1000) : new Date(),
			toDate: data.endDate ? new Date(data.endDate * 1000) : moment().add(30, 'm').toDate(),
			position: (p.edit && p.edit.documentLocation) || BusinessLocationsService.chosenLocationId || "",
			// visibility: 
			// 	(p.edit && p.edit.documentLocationsFilter) || 
			// 	(BusinessLocationsService.chosenLocationId 
			// 		? [BusinessLocationsService.chosenLocationId] 
			// 		: (AuthService.isAttributePresent(LibAttribute.canSetGlobalLocFilter) 
			// 			? ['*'] 
			// 			: []
			// 		)
			// 	)
		};
	}

	private handleType = (e: React.MouseEvent<any>) => {
		const newType = e.currentTarget.dataset.type;
		DataStorageService.localStorage.setItem(CalendarCacheKeys.calendarCreateEventType, newType.toString());
		this.setState({type: newType});
	}

	private handleAllDay = () => {
		this.setState({allDay: !this.state.allDay});
	}

	private handlePosition = (e: React.ChangeEvent<any>) => {
		this.setState({position: e.target.value});
	}
	
	private handleFromDate = (m: moment.Moment) => {
		if (m) {
			// preserve difference of dates
			const diff = moment(this.state.toDate).diff(moment(this.state.fromDate), 's');
			this.setState({toDate: moment(m).add(diff, 's').toDate(), fromDate: m.toDate()});
		}
		else {
			this.setState({fromDate: m as any});
		}
	}
	
	private handleToDate = (m: moment.Moment) => {
		this.setState({toDate: m && m.toDate()});
	}

	/**
	 * Adds missing fields to the child and then returns to the parent
	 */
	private onChildSubmit = (item: ReturningEvent<CalendarEvent>) => {
		const toReturn: CalendarEvent = this.state.allDay 
		? {
			...item,
			allDay: true,
			date: moment(this.state.fromDate).startOf('d').unix(),
			endDate: moment(this.state.toDate).endOf('d').unix(),
			documentLocation: this.state.position,
			documentLocationsFilter: [this.state.position],
		}
		: {
			...item,
			date: Math.floor(this.state.fromDate.getTime() / 1000),
			endDate: Math.floor(this.state.toDate.getTime() / 1000),
			documentLocation: this.state.position,
			documentLocationsFilter: [this.state.position],
		};
		
		this.props.onSubmit(toReturn);
		this.props.modalRef.close();
	}


	private onChildClose = () => {
		this.props.modalRef.close();
	}

	private Generic = () => {
		const canSave = Boolean(this.state.fromDate && this.state.toDate && this.state.position && this.state.toDate.getTime() >= this.state.fromDate.getTime());

		return (
			<Paper className='def-box'>
				<div>
					<div className="cce-left-icon-padding">
						<FormControlLabel
							control={<Switch color='primary' checked={this.state.allDay} onChange={this.handleAllDay} />}
							label="Giorno intero"
						/>
					</div>
					<div className='cce-body-row'>
						<Clock/>
						<div className='cce-date-picker'>
							<FieldsFactory.DateField
								label={"Da data"}
								value={this.state.fromDate}
								margin={'none'}
								onChange={this.handleFromDate}
								error={!this.state.fromDate || (this.state.toDate && this.state.toDate.getTime() < this.state.fromDate.getTime())}
								pickerType={this.state.allDay ? "date" : "datetime"}
							/>
							<FieldsFactory.DateField
								label={"A data"}
								value={this.state.toDate}
								margin={'none'}
								minDate={this.state.fromDate}
								onChange={this.handleToDate}
								error={!this.state.toDate || (this.state.fromDate && this.state.toDate.getTime() < this.state.fromDate.getTime())}
								pickerType={this.state.allDay ? "date" : "datetime"}
							/>
						</div>
					</div>
				</div>
				{BusinessLocationsService.getLocationsFilteredByUser(false).length !== 1 && (
					<div className='cce-body-row'>
						<Visibility/>
						<FieldsFactory.SelectField
							values={BusinessLocationsService.getDocPosSelectValues()}
							label={"Posizione"}
							fullWidth
							value={this.state.position}
							error={!this.state.position}
							onChange={this.handlePosition}
						/>
					</div>
				)}
				<GenericEvent updateEvent={this.props.updateEvent} edit={this.props.edit} canSave={canSave} onSubmit={this.onChildSubmit} onClose={this.onChildClose}/>
			</Paper>
		);
	}

	render() {

		let calendarWindow: JSX.Element;

		switch (this.state.type) {
			case ModelClass.CustomerAppointment: calendarWindow = (
				<CustomerAppointmentEditor {...{calendar: this.props.edit} as any} idToModify={this.props.edit?._id} extendWrapper modalRef={{close: this.onChildClose, onClickClose: this.onChildClose}}/>
			); break;
			default: calendarWindow = <this.Generic/>;
		}
		
		return (
			<>
				<Paper style={{marginBottom: '10px'}}>
					<Tabs
						value={this.state.type}
						indicatorColor="primary"
						variant="scrollable"
						textColor="primary"
					>
						<Tab label="Evento" value={ModelClass.CalendarEvent} data-type={ModelClass.CalendarEvent} onClick={this.handleType}/>
						<Tab label="Appuntamento" value={ModelClass.CustomerAppointment} data-type={ModelClass.CustomerAppointment} onClick={this.handleType}/>
					</Tabs>
				</Paper>
				{calendarWindow}
			</>
		);
	}

}

import React from "react";
import { AuthService, DataFormatterService, DataStorageService, FieldsFactory, ModalService, ModalComponentProps } from "@sixempress/main-fe-lib";
import { Attribute, ModelClass } from '../../enums';
import { BePaths } from '../../enums';
import Button from "@material-ui/core/Button";
import Clock from "@material-ui/icons/Schedule";
import Popover from "@material-ui/core/Popover";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import Close from "@material-ui/icons/Close";
import Delete from "@material-ui/icons/Delete";
import Edit from "@material-ui/icons/Edit";
import IconButton from "@material-ui/core/IconButton";
import { CalendarCacheKeys } from "../../enums";
// import { CalendarEventType, IHairdresserEvent, CalendarEvent } from "../CalendarEvent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import { Observable } from "rxjs";
import { CalendarEvent, CalendarEventType, IGenericEvent } from "../CalendarEvent";
import { CalendarEventController } from "../CalendarEvent.controller";
import { CustomerAppointmentController } from "../../customer-appointment/customer-appointment.controller";
import { CustomerAppointment } from "../../customer-appointment/CustomerAppointment";
import { getController, isEvent } from "../calendar.logic";
import { CustomerController } from "@sixempress/multi-purpose";


interface EPProps {
	id: string;
	anchor: HTMLElement;
	open: boolean;
	modelClass: ModelClass,
	canUpdate: (e: CalendarEvent | CustomerAppointment) => boolean;
	onUpdate: (id: string, modelClass: ModelClass) => void;
	onEdit: (c: CalendarEvent | CustomerAppointment, modelClass: ModelClass) => void;
	onClose: () => void;
}

interface EPState {
	data?: CalendarEvent | CustomerAppointment;
}

export class EventPop extends React.Component<EPProps, EPState> {

	protected controller = new CalendarEventController();

	state: EPState = {};

	async componentDidMount() {
		if (!this.props.open)
			return;

		const item = await (this.props.modelClass === ModelClass.CalendarEvent
			? new CalendarEventController().getSingle(this.props.id, {disableLoading: true})
			: new CustomerAppointmentController().getSingle(this.props.id, {params: {fetch: [{field: 'customer'}]}, disableLoading: true}));

		this.setState({data: item});
	}

	private closePopover = () => {
		this.props.onClose();
	}

	private handleEditEvent = () => {
		this.closePopover();
		this.props.onEdit(this.state.data, this.props.modelClass);
	}

	private handleDeleteEvent = (e: React.MouseEvent<any>) => {
		this.closePopover();
		ModalService.open(HandleDeleteEvent, {
			event: this.state.data, 
			modelClass: this.props.modelClass,
			onConfirm: () => this.props.onUpdate(this.state.data._id, this.props.modelClass)
		});
	}

	render() {

		return (
			<Popover
				open={Boolean(this.props.open)}
				anchorEl={this.props.anchor}
				onClose={this.closePopover}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center', }}
				transformOrigin={{ vertical: 'top', horizontal: 'center', }}
			>
				{!this.state.data ? <Box p={1}><CircularProgress/></Box> :
				this.props.modelClass === ModelClass.CalendarEvent ? this.getDetail(this.state.data as CalendarEvent) :
				this.props.modelClass === ModelClass.CustomerAppointment ? this.getAppDetail(this.state.data as CustomerAppointment) :
				null
				}
			</Popover>
		);
	}

	private getAppDetail(data: CustomerAppointment) {
		return (
			<div className='calendar-popover-event-detail'>
				<div className='cpe-title'>
					<Typography variant='h4'>
						<IconButton size='small' onClick={this.closePopover}>
							<Close/>
						</IconButton>
						{CustomerController.formatCustomerName(data.customer)}
					</Typography>
					<div>
						{AuthService.isAttributePresent(Attribute.modifyCalendarEvents) && this.props.canUpdate(data) && (
							<IconButton size='small' onClick={this.handleEditEvent} data-event-id={data._id}>
								<Edit/>
							</IconButton>
						)}
						{AuthService.isAttributePresent(Attribute.deleteCalendarEvents) && (
							<IconButton size='small' onClick={this.handleDeleteEvent} data-event-id={data._id}>
								<Delete/>
							</IconButton>
						)}
						</div>
				</div>
				<Divider className='def-mui-divider'/>
				<div className='cpe-time'>
					<Clock fontSize='small'/>
					<span>
						{DataFormatterService.formatUnixDate(data.date, "YYYY/MM/DD") === DataFormatterService.formatUnixDate(data.endDate, "YYYY/MM/DD") 
								? DataFormatterService.formatUnixDate(data.date) + 
									" - " + 
									DataFormatterService.formatUnixDate(data.endDate, "HH:mm")
								: DataFormatterService.formatUnixDate(data.date) + 
									" - " +
									DataFormatterService.formatUnixDate(data.endDate) 
						}
					</span>
				</div>
			</div>
		)
	}

	private getDetail(data: CalendarEvent) {
		return (
			<div className='calendar-popover-event-detail'>
				<div className='cpe-title'>
					<Typography variant='h4'>
						<IconButton size='small' onClick={this.closePopover}>
							<Close/>
						</IconButton>
						{data.title}
					</Typography>
					<div>
						{AuthService.isAttributePresent(Attribute.modifyCalendarEvents) && this.props.canUpdate(data) && (
							<IconButton size='small' onClick={this.handleEditEvent} data-event-id={data._id}>
								<Edit/>
							</IconButton>
						)}
						{AuthService.isAttributePresent(Attribute.deleteCalendarEvents) && (
							<IconButton size='small' onClick={this.handleDeleteEvent} data-event-id={data._id}>
								<Delete/>
							</IconButton>
						)}
						</div>
				</div>
				<Divider className='def-mui-divider'/>
				<div className='cpe-time'>
					<Clock fontSize='small'/>
					<span>
						{data.allDay 
							? <span>Giorno intero<br/>{DataFormatterService.formatUnixDate(data.date, "YYYY/MM/DD")} - {DataFormatterService.formatUnixDate(data.endDate, "YYYY/MM/DD")}</span>
							: DataFormatterService.formatUnixDate(data.date, "YYYY/MM/DD") === DataFormatterService.formatUnixDate(data.endDate, "YYYY/MM/DD") 
								? DataFormatterService.formatUnixDate(data.date) + 
									" - " + 
									DataFormatterService.formatUnixDate(data.endDate, "HH:mm")
								: DataFormatterService.formatUnixDate(data.date) + 
									" - " +
									DataFormatterService.formatUnixDate(data.endDate) 
						}
					</span>
				</div>
				{data.data && (
					<>
						<Divider className='def-mui-divider'/>
						<div>{data.data.data || ''}</div>
					</>
				)}
			</div>
		)
	}
}


function HandleDeleteEvent(p: {event: CalendarEvent | CustomerAppointment, modelClass: ModelClass, onConfirm: () => void} & ModalComponentProps) {

	if (isEvent(p.event)) {
		if (!AuthService.isAttributePresent(Attribute.deleteCalendarEvents)) { 
			p.modalRef.close();
			return (null); 
		}
	}
	else {
		if (!AuthService.isAttributePresent(Attribute.deleteCustomerAppointment)) {
			p.modalRef.close();
			return (null); 
		}
	}
		

	const onClickConfirm = async () => {
		// const contObs: Observable<any> = delSale && isSaleEventToDelete 
		// 	? GenericController.delete(BePaths.sales, (p.event as IHairdresserEvent).data.data.relativeSale.id) 
		// 	: new Observable(o => o.next())

		const controller = getController(p.modelClass) as any;
		await controller.deleteSingle(p.event._id);
		p.onConfirm();
		p.modalRef.close();
	}


	return (
		<>
			<DialogTitle>
				Conferma Eliminazione
			</DialogTitle>
			<DialogContent>
				Sei sicuro di voler eliminare l'evento ?
			</DialogContent>
			<DialogActions>
				<Button color='primary' onClick={() => p.modalRef.close()}>Annulla</Button>
				<Button color='primary' onClick={onClickConfirm}>Conferma</Button>
			</DialogActions>
		</>
	)
}
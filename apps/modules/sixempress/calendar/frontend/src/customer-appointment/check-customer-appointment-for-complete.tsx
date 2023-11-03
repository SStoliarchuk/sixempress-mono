import React from 'react';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Button from '@material-ui/core/Button';
import { ModalService, IPatchOperation, FieldsFactory, ModalComponentProps } from '@sixempress/main-fe-lib';
import { CustomerAppointment, CustomerAppointmentStatus } from "./CustomerAppointment";
import { Observable } from "rxjs";
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Divider from '@material-ui/core/Divider';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import { CustomerAppointmentController } from './customer-appointment.controller';
import { IconButton } from '@material-ui/core';
import { Close } from '@material-ui/icons';


/**
 * This component is used to confirm that a repair is in state "repaired/not repaired" and returns the repair back
 * 
 * If the repair is not in one of those states, it opens a dialog to set the state
 */
export function checkCustomerAppointmentForCompleate(item: CustomerAppointment): Observable<CustomerAppointment | void> {
	return new Observable<CustomerAppointment | void>(obs => {
		if (item.status === CustomerAppointmentStatus.completed || item.status === CustomerAppointmentStatus.failed) {
			obs.next(item);
			obs.complete();
		}
		else {
			ModalService.open(SetCompletedState, {item}, {fullWidth: true, maxWidth: 'sm', onClosed: (d) => {obs.next(d); obs.complete()}});
		}
	});
}

function SetCompletedState(props: {item: CustomerAppointment} & ModalComponentProps) {


	// create state handlers
	const [repState, setRepState] = React.useState<CustomerAppointmentStatus>(props.item.status);
	const [priceEst, setPriceEst] = React.useState<number>(props.item.totalPrice || '' as any);

	const handleRepState = (e?: React.ChangeEvent<any>, val?: string) => setRepState(parseInt(val));
	const handlePriceChange = (e?: React.ChangeEvent<HTMLInputElement>) => setPriceEst(e.target.value as unknown as number);
	
	const saveBtnEnabled = () => {
		if (props.item.status === CustomerAppointmentStatus.completed || props.item.status === CustomerAppointmentStatus.failed) {
			return true;
		}
		return false;
	};

	/**
	 * save fn
	 */
	const updateState = (e?: any) => {

		const newStateToSet = repState;
		let newPriceToSet: number = props.item.totalPrice;

		// update state
		const patchOps: IPatchOperation<CustomerAppointment>[] = [
			{op: 'set', path: 'status', value: repState}
		]

		if (priceEst !== props.item.totalPrice) {
			const toSet = priceEst || 0;
			patchOps.push({op: 'set', path: 'totalPrice', value: toSet});
			newPriceToSet = toSet;
		}



		new CustomerAppointmentController().patch(props.item._id, patchOps).then(
			r => {
				props.item.status = newStateToSet;
				props.item.totalPrice = newPriceToSet;
				props.modalRef.close(props.item);
			},
		);

	}

	return (
		<React.Fragment>
			<DialogTitle>
				<IconButton onClick={props.modalRef.onClickClose}>
					<Close/>
				</IconButton>
				Per continuare dichiarare lo stato
			</DialogTitle>
			<DialogContent>

				<div id='check-repair-for-delivery-repair-container-info'>
					<CustomerAppointmentController.FullDetailJsx id={props.item._id}/>
				</div>
				<Divider className='def-mui-divider' />

				Stato da impostare:
				<RadioGroup style={{display: 'block'}} value={repState.toString()} onChange={handleRepState}>
					<FormControlLabel value={CustomerAppointmentStatus.completed.toString()} control={<Radio color='primary'/>} label="Completato con successo" />
					<FormControlLabel value={CustomerAppointmentStatus.failed.toString()} control={<Radio color='primary'/>} label="Fallito" />
				</RadioGroup>


				<FieldsFactory.PriceField
					label={'Preventivo'}
					value={priceEst}
					onChange={handlePriceChange}
				/>

			</DialogContent>
			<DialogActions>
				<Button color='primary' disabled={!saveBtnEnabled()} onClick={updateState}>
					Salva cambiamenti
				</Button>
			</DialogActions>
		</React.Fragment>
	);

}

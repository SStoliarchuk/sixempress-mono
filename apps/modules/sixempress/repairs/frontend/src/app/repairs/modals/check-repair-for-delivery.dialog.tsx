import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Button from '@material-ui/core/Button';
import { ModalService, IPatchOperation, FieldsFactory, ModalComponentProps } from '@sixempress/main-fe-lib';
import { Repair, RepairStatus, RepairStatusLabel } from "../Repair";
import { Observable } from "rxjs";
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Divider from '@material-ui/core/Divider';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import { RepairController } from '../repair.controller';


/**
 * This component is used to confirm that a repair is in state "repaired/not repaired" and returns the repair back
 * 
 * If the repair is not in one of those states, it opens a dialog to set the state
 */
export function checkRepairForDelivery(repair: Repair): Observable<Repair | void> {
	return new Observable<Repair | void>(obs => {
		if (RepairController.getFinalStatuses().includes(repair.status)) {
			obs.next(repair);
			obs.complete();
		}
		else {
			ModalService.open(SetRepairedState, {rep: repair}, {fullWidth: true, maxWidth: 'sm', onClosed: (d) => {obs.next(d); obs.complete()}});
		}
	});
}

type SRSState = {
	status: RepairStatus,
	price: number,
}
class SetRepairedState extends React.Component<{rep: Repair} & ModalComponentProps, SRSState> {

	state: SRSState = {
		status: this.props.rep.status,
		price: this.props.rep.totalPrice || '' as any,
	}

	controller = new RepairController();

	private handleRepState = (e?: React.ChangeEvent<any>, val?: string) => this.setState({status: parseInt(val)});
	private handlePriceChange = (e?: React.ChangeEvent<HTMLInputElement>) => this.setState({price: e.target.value as unknown as number});
	
	private saveBtnEnabled = () => {
		return RepairController.getFinalStatuses().includes(this.state.status);
	};

	/**
	 * save fn
	 */
	private updateState = (e?: any) => {

		const newStateToSet = this.state.status;
		let newPriceToSet: number = this.props.rep.totalPrice;

		// update state
		const patchOps: IPatchOperation<Repair>[] = [
			{op: 'set', path: 'status', value: this.state.status}
		]

		if (this.state.price !== this.props.rep.totalPrice) {
			const toSet = this.state.price || 0;
			patchOps.push({op: 'set', path: 'totalPrice', value: toSet});
			newPriceToSet = toSet;
		}


		new RepairController().patch(this.props.rep._id, patchOps).then(
			r => {
				this.props.rep.status = newStateToSet;
				this.props.rep.totalPrice = newPriceToSet;
				this.props.modalRef.close(this.props.rep) 
			},
		);

	}

	render() {
		const Detail = this.controller.FullDetailJsx;
		return (
			<React.Fragment>
				<DialogTitle>
					Per continuare dichiarare lo stato della riparazione
				</DialogTitle>
				<DialogContent>

					<div id='check-repair-for-delivery-repair-container-info'>
						<Detail id={this.props.rep._id} controller={this.controller}/>
					</div>
					<Divider className='def-mui-divider' />

					Consegna riparazione in stato:
					<RadioGroup style={{display: 'block'}} value={this.state.status.toString()} onChange={this.handleRepState}>
						<FormControlLabel value={RepairStatus.deliveredFailure.toString()} control={<Radio color='primary'/>} label={RepairStatusLabel[RepairStatus.deliveredFailure]}/>
						<br/>
						<FormControlLabel value={RepairStatus.delivered.toString()} control={<Radio color='primary'/>} label={RepairStatusLabel[RepairStatus.delivered]}/>
						<br/>
						<FormControlLabel value={RepairStatus.deliveredWillPay.toString()} control={<Radio color='primary'/>} label={RepairStatusLabel[RepairStatus.deliveredWillPay]}/>
					</RadioGroup>


					<FieldsFactory.PriceField
						label='Preventivo'
						variant='standard'
						value={this.state.price}
						fullWidth={false}
						onChange={this.handlePriceChange}
					/>

				</DialogContent>
				<DialogActions>
					<Button color='primary' onClick={this.props.modalRef.onClickClose}>
						Chiudi
					</Button>
					<Button color='primary' variant='contained' disabled={!this.saveBtnEnabled()} onClick={this.updateState}>
						Salva cambiamenti
					</Button>
				</DialogActions>
			</React.Fragment>
		)
	}

}

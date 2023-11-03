import React from 'react';
import Box from '@material-ui/core/Box';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import moment from 'moment';
import { FieldsFactory } from '../../../fields/fields-factory';
import { TimeService } from '../../../../services/time-service/time-service';
import { FDTDPProps, FDTDPState, dateTimeOutput } from './dtd';

/**
 * this component has two date pickers, one for the FROM date, and one for the TO date,
 */
export class FromDateToDatePicker extends React.PureComponent<FDTDPProps, FDTDPState> {


	private canDisable = true;

	constructor(props: FDTDPProps) {
		super(props);

		const value: FDTDPProps['value'] = props.value || {} as any;
		this.state = {
			from: value.from ? value.from : TimeService.getCorrectMoment().startOf('d').toDate(),
			to: value.to ? value.to : TimeService.getCorrectMoment().endOf('d').toDate(),
			enabled: typeof props.enabled === 'undefined' ? false : props.enabled,
		};

		if (typeof props.canDisable !== 'undefined') {
			this.canDisable = props.canDisable;
		}
	}

	
	private handleDateFrom = (date: moment.Moment | null) => {
		const toSet = date ? date.startOf('d').toDate() : null;
		this.setState({from: toSet});
		this.output({from: toSet, to: this.state.to});
	}
	private handleDateTo = (date: moment.Moment | null) => {
		const toSet = date ? date.endOf('d').toDate() : null;
		this.setState({to: toSet});
		this.output({from: this.state.from, to: toSet});
	}
	private toggleEnableDateFilter = (e?: any) => {
		const newState = !this.state.enabled;
		this.setState({enabled: newState});
		
		// if enable
		if (newState) {
			this.output({from: this.state.from, to: this.state.to}, newState);
		} else {
			this.output({from: null, to: null}, newState);
		}
	}

	private output(el: dateTimeOutput, enabled: boolean = this.state.enabled) {
		if (this.props.onChange) { 
			this.props.onChange({value: el, enabled}); 
		}
	}


	render() {
		return (
			<>
				<Box mt={2}>
					{this.canDisable && (
						<FormControlLabel
							value="start"
							control={<Switch onChange={this.toggleEnableDateFilter} checked={this.state.enabled} color="primary" />}
							label={this.props.label}
							labelPlacement="start"
						/>
					)}
				</Box>
				<Box display='flex' flexWrap='wrap' width='100%' justifyContent='center'>
					<Box mx={2}>
						<FieldsFactory.DateField
							label='Da data'
							onChange={this.handleDateFrom}
							value={this.state.from}
							error={!this.state.from || this.state.from > this.state.to}
							disabled={!this.state.enabled}
							showTodayButton={true}
							pickerType='date'
						/>
					</Box>
					<Box mx={2}>
						<FieldsFactory.DateField
							label='Fino a data'
							onChange={this.handleDateTo}
							value={this.state.to}
							error={!this.state.to || this.state.to < this.state.from}
							disabled={!this.state.enabled}
							showTodayButton={true}
							pickerType='date'
						/>
					</Box>
				</Box>
			</>
		);
	}
}

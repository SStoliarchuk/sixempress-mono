import React from 'react';
import {  FDTDFProps, dateTimeOutput, DtTimeFilterField } from './dtd';
import { FromDateToDatePicker } from './date-to-date.picker';
import moment from 'moment';

export class FromDateToDateFilter<T = any> extends React.PureComponent<FDTDFProps<T>> {
	

	constructor(props: FDTDFProps<T>) {
		super(props);

		for (const field of props.timeFields) {
			
			// restore the values
			if (
				typeof props.inputData[field.modelPath as string] !== 'undefined' &&
				props.inputData[field.modelPath as string].$gte && 
				props.inputData[field.modelPath as string].$lte
			) {
				field.enabled = true;
				field.value = {
					from: new Date(props.inputData[field.modelPath as string].$gte * 1000),
					to: new Date(props.inputData[field.modelPath as string].$lte * 1000),
				};
			} 
			// is disabled
			else if (field.canDisable) {
				field.enabled = false;
			}

		}

		this.updateOutput();
	}

	/**
	 * Controls if the date timefraeme is valid
	 */
	private isDateFilterValid(timeOutput: dateTimeOutput): boolean {
		if (!timeOutput.from || !timeOutput.to) { return false; }
		return true;
	}

	private updateOutput() {
		for (const time of this.props.timeFields) {
			if (time.enabled && time.value && this.isDateFilterValid(time.value)) { 
				this.props.outputData[time.modelPath as string] = {
					$gte: moment(time.value.from).startOf('d').unix(),
					$lte: moment(time.value.to).endOf('d').unix(),
				};
			}
			else {
				delete this.props.outputData[time.modelPath as string];
			}
		}
	}

	private onChange = (time: DtTimeFilterField<any>) => (data: {value: dateTimeOutput, enabled: boolean}) => {
		time.value = data.value;
		time.enabled = data.enabled;
		this.updateOutput();
	}

	render() {
		return (
			<>
				{this.props.timeFields.map(time => (
					<FromDateToDatePicker
						key={time.modelPath.toString()}
						value={time.value} 
						label={time.label}
						canDisable={time.canDisable} 
						enabled={time.enabled} 
						onChange={this.onChange(time)}
					/>
				))}
			</>
		);
	}

}
import React from 'react';
// if i spread this line to @material-ui/pickers/{sub_lib}
// when i compile it requires a default import from @material-ui/core
// so keep this line this way
import { 
	MuiPickersUtilsProvider, 
	KeyboardDatePicker, DatePicker, KeyboardDatePickerProps, 
	KeyboardTimePicker, TimePicker, KeyboardTimePickerProps, 
	KeyboardDateTimePicker, DateTimePicker, KeyboardDateTimePickerProps,
} from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import moment from 'moment';
import { Omit, TextFieldProps } from '@material-ui/core';

export interface DateFieldProps extends Omit<KeyboardDateTimePickerProps, 'onChange'| 'inputVariant' | 'variant' | 'value'> {
	/**
	 * simple prefix means no keyboard support
	 */
	pickerType?: 'date' | 'datetime' | 'time' | 'simple_date' | 'simple_datetime' | 'simple_time';
	
	pickerVariant?: KeyboardDatePickerProps['variant'];

	// ensure the linter gives moment.Moment
	onChange?: (m: moment.Moment, string?: string) => void;
	
	value?: Date | number;

	locale?: string;

	variant?: TextFieldProps['variant'];

	// replace ParsableDate with Date
	minDate?: Date;

	// replace ParsableDate with Date
	maxDate?: Date;
}

export function DateField(p: DateFieldProps) {

		const {
			pickerType: fieldType,
			locale,
			pickerVariant,
			variant,
			value,
			...other
		} = p;
		
		// set defualt value

		const defaultProps: KeyboardDatePickerProps | KeyboardDateTimePickerProps | KeyboardTimePickerProps = {
			todayLabel: 'OGGI',
			invalidDateMessage: 'Formato data invalido',
			invalidLabel: 'Valore non valido',
			inputVariant: variant,
			variant: pickerVariant,
			minDateMessage: 'Data minima superata',
			maxDateMessage: 'Data massima superata',
			showTodayButton: true,
			margin: 'normal',
			format: "DD/MM/YYYY",
			onChange: () => {},
			["ampm" as keyof KeyboardTimePickerProps as any]: false,
			value: typeof value === 'number' ? new Date(value * 1000) : value || null,
		};
		
		
		let PickerToUse: React.FunctionComponent<any>;

		switch (fieldType) {
			default:
			case "date": 
				PickerToUse = KeyboardDatePicker;
				break;
			
			case 'simple_date':
				PickerToUse = DatePicker;
				break;
			
			case 'time':
				PickerToUse = KeyboardTimePicker;
				defaultProps.format = "DD/MM/YYYY HH:mm";
				break;

			case 'simple_time':
				PickerToUse = TimePicker;
				defaultProps.format = "DD/MM/YYYY HH:mm";
				break;
				
			case "datetime": 
				PickerToUse = KeyboardDateTimePicker;
				defaultProps.format = "DD/MM/YYYY HH:mm";
				break;

			case 'simple_datetime':
				PickerToUse = DateTimePicker;
				defaultProps.format = "DD/MM/YYYY HH:mm";
				break;
			
		}

		// return the chosen picker wrapped inside the util-provider
		return (
			<MuiPickersUtilsProvider utils={MomentUtils} locale={locale || 'it'}>
				<PickerToUse data-testid={fieldType} {...defaultProps} {...other}/>
			</MuiPickersUtilsProvider>
		);

}

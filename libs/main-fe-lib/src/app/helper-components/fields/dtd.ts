import { IAsyncModelSelectProps } from '../async-model-table-select/dtd';
import { TextFieldProps } from '@material-ui/core/TextField';
import { FormControl } from 'react-reactive-form';
import { DateFieldProps } from './date.field';

export declare type ICalendarPickerProps = DateFieldProps;

export interface SelectFieldValue {
	label: string | number;
	value: string | number;
	menuLabel?: string | number | JSX.Element;
}

export interface AmtsFieldProps<T> {
	/**
	 * Renders the object to a value
	 */
	renderValue: (val: T) => string;
	/**
	 * The input configuration of the popover that choses the model
	 */
	amtsInput: IAsyncModelSelectProps<T>;
	/**
	 * Additional props to pass to the text field
	 */
	textFieldProps: TextFieldProps;
	/**
	 * callback triggered when the popover is opened
	 * @param control is present only if the field is generated from getAmts_formControl function
	 */
	onOpen?: (e: React.MouseEvent<any> | React.KeyboardEvent<any>, control?: FormControl) => void;
	/**
	 * Callback triggered when the popover is closed
	 */
	onClose?: () => void;
	/**
	 * If true allows the field to be cleared
	 * when the field is cleared, then it emits onChose with a undefined value
	 * @default false
	 */
	canClearField?: boolean;
	/**
	 * If true, then the popover is closed when the user selects a model
	 * @default true
	 */
	closePopoverOnSelect?: boolean;
}

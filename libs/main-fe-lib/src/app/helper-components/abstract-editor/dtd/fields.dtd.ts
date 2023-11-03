import { AbstractControl, ValidatorFn, AbstractControlOptions } from "react-reactive-form";
import { TextFieldProps } from "@material-ui/core/TextField";
import { SelectProps } from "@material-ui/core/Select";
import { CheckboxProps } from "@material-ui/core/Checkbox";
import { SelectFieldValue } from "../../fields/dtd";
import { EditorAmtsConfig } from "./abstract-editor.dtd";
import { DateFieldProps } from "../../fields/date.field";
import { SwitchProps } from "@material-ui/core";

export declare type IEditorFormControlOptions =
	ManualField |
	SelectField |
	MultiSelectField |
	CheckboxField |
	SwitchField |
	NumberField |
	PriceField |
	TextField |
	TextAreaField |
	SelectAsyncModelField |
	TimePickerField |
	DatePickerField |
	DateTimePickerField;


export interface RawField {
	/**
	 * The key/fieldName of this field
	 */
	key: string;
	/**
	 * A manual abstractControl to use for the field
	 */
	control?: AbstractControl;
	/**
	 * Custom validators for the field 
	 */
	validators?: (ValidatorFn | ValidatorFn[] | AbstractControlOptions | null);
	/**
	 * Adds a validator.required
	 */
	required?: boolean;
	/**
	 * The manual value to set the control to, instead of the automatic one
	 */
	value?: any;
	/**
	 * When this field is inside the formArray, this function is
	 * Used to manually create an abstractControl to give to the formArray when a new row is added
	 */
	controlFnFormArray?: (val?: any) => AbstractControl;
}

export interface ManualField extends RawField {
	component: ((control: AbstractControl) => JSX.Element);
}





export interface BaseField extends RawField {
	/**
	 * The label of the field to show
	 */
	label: string;
	/**
	 * The component field to show
	 */
	component: string;
	/**
	 * Props for the field to show
	 */
	props?: any;
}

export interface SelectField extends BaseField {
	component: "SelectField";
	values: SelectFieldValue[];
	props?: SelectProps;
}
export interface MultiSelectField extends BaseField {
	component: "MultiSelectField";
	values: SelectFieldValue[];
	props?: SelectProps;
}
export interface CheckboxField extends BaseField {
	component: 'Checkbox';
	props?: CheckboxProps;
}
export interface SwitchField extends BaseField {
	component: 'Switch';
	props?: SwitchProps;
}
export interface NumberField extends BaseField {
	component: 'NumberField';
	props?: TextFieldProps;
	min?: number;
	max?: number;
}
export interface PriceField extends BaseField {
	component: 'PriceField';
	props?: TextFieldProps;
}
export interface TextField extends BaseField {
	component: 'TextField';
	props?: TextFieldProps;
}
export interface TextAreaField extends BaseField {
	component: 'TextArea';
	props?: TextFieldProps;
}
export interface SelectAsyncModelField extends BaseField {
	component: 'SelectAsyncModel';
	props: EditorAmtsConfig<any>;
}
export interface TimePickerField extends BaseField {
	component: 'TimePicker';
	props?: DateFieldProps;
}
export interface DatePickerField extends BaseField {
	component: 'DatePicker';
	props?: DateFieldProps;
}
export interface DateTimePickerField extends BaseField {
	component: 'DateTimePicker';
	props?: DateFieldProps;
}

import React from 'react';
import MUITextField, { TextFieldProps } from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import Select, { SelectProps } from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlMUI, { FormControlProps } from '@material-ui/core/FormControl';
import FormControlLabel, { FormControlLabelProps } from '@material-ui/core/FormControlLabel';
import { AbstractControl } from 'react-reactive-form';
import { IBaseModel } from '../../services/controllers/IBaseModel';
import "moment/locale/it";
import { SelectFieldValue, AmtsFieldProps } from './dtd';
import moment from 'moment';
import { AmtsField } from './amts-field-component';
import { DataFormatterService } from '../../services/data-formatter.service';
import { DateField, DateFieldProps } from './date.field';
import MUICheckbox, { CheckboxProps } from '@material-ui/core/Checkbox';
import MUISwitch, { SwitchProps } from '@material-ui/core/Switch';
import MUIRadio, { RadioProps } from '@material-ui/core/Radio';

/**
 * This class contains various fields to use in the application
 */
export class FieldsFactory {


	public static getDateField_FormControl(props: DateFieldProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => {
			const handlers = control.handler();
			return (
				<FieldsFactory.DateField
					{...handlers}
					{...props}
					error={control.invalid}
					onChange={(date: moment.Moment | null) => {
						const valToUse = date && date.unix() ? date.unix() : null;
						handlers.onChange(valToUse);
						if (props && props.onChange) {
							props.onChange(date);
						}
					}}
				/>
			);
		};
	}

	public static getAmtsField_FormControl<T extends IBaseModel>(props: AmtsFieldProps<T>): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => {

			if (!props.textFieldProps) {
				props.textFieldProps = {};
			}
			props.textFieldProps = {
				...props.textFieldProps,
				error: control.invalid,
				...control.handler(),
			};

			return (
				<FieldsFactory.AmtsField 
					{...props} 
					onOpen={props.onOpen ? (e) => props.onOpen(e, control as any) : undefined}
				/>
			);
		};
	}

	public static getCheckbox_FormControl(props: CheckboxProps & {label: any}, formControlLabelProps?: Partial<FormControlLabelProps>): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => {
			const evts = control.handler();
			return (
				<FieldsFactory.Checkbox
					onChange={evts.onChange}
					onFocus={evts.onFocus}
					onBlur={evts.onBlur}
					disabled={evts.disabled}
					checked={evts.value ? true : false}
					{...props}
					formControlProps={formControlLabelProps}
				/>
			);
		};
	}

	public static getSwitch_FormControl(props: SwitchProps & {label: any}, formControlLabelProps?: Partial<FormControlLabelProps>): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => {
			const evts = control.handler();
			return (
				<FieldsFactory.Switch
					onChange={evts.onChange}
					onFocus={evts.onFocus}
					onBlur={evts.onBlur}
					disabled={evts.disabled}
					checked={evts.value ? true : false}
					{...props}
					formControlProps={formControlLabelProps}
				/>
			);
		};
	}

	public static getRadio_FormControl(props: RadioProps & {label: any}, formControlLabelProps?: Partial<FormControlLabelProps>): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => {
			const evts = control.handler();
			return (
				<FieldsFactory.Radio
					onChange={evts.onChange}
					onFocus={evts.onFocus}
					onBlur={evts.onBlur}
					disabled={evts.disabled}
					checked={evts.value ? true : false}
					{...props}
					formControlProps={formControlLabelProps}
				/>
			);
		};
	}
	
	public static getTextField_FormControl(props: TextFieldProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => <FieldsFactory.TextField error={control.invalid} {...control.handler()} {...props}/>;
	}

	public static getTextArea_FormControl(props: TextFieldProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => <FieldsFactory.TextArea error={control.invalid} {...control.handler()} {...props}/>;
	}

	public static getNumberField_FormControl(props: TextFieldProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => <FieldsFactory.NumberField error={control.invalid} {...control.handler()} {...props}/>;
	}

	public static getPriceField_FormControl(props: TextFieldProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => <FieldsFactory.PriceField error={control.invalid} {...control.handler()} {...props}/>;
	}

	public static getSelectField_FormControl(values: SelectFieldValue[], props: SelectProps & {label: string}, formControlMUIProps?: FormControlProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => <FieldsFactory.SelectField values={values} error={control.invalid} {...control.handler()} {...props} formControlProps={formControlMUIProps}/>;
	}

	public static getMultiSelectField_FormControl(values: SelectFieldValue[], props: SelectProps & {label: string}, formControlMUIProps?: FormControlProps): (control: AbstractControl) => JSX.Element {
		return (control: AbstractControl) => <FieldsFactory.MultiSelectField values={values} error={control.invalid} {...control.handler()} {...props} formControlProps={formControlMUIProps}/>;
	}
	


	public static DateField = DateField;

	/**
	 * Returns a field that estetically is like a normal Outlined Input
	 * But is used to select a model in async from the BE
	 */
	public static AmtsField = AmtsField;


	public static Checkbox = function Checkbox(p: CheckboxProps & {label?: any, formControlProps?: Partial<FormControlLabelProps>}) {
		const {
			formControlProps,
			label,
			...other
		} = p;

		return (
			<FormControlLabel
				control={<MUICheckbox color="primary" {...other}/>}
				label={label}
				value={other.value}
				{...(formControlProps || {})}
			/>
		);
	}

	public static Switch = function Switch(p: SwitchProps & {label?: any, formControlProps?: Partial<FormControlLabelProps>}) {
		const {
			formControlProps = {},
			label,
			...other
		} = p;

		if (!formControlProps.labelPlacement) {
			formControlProps.labelPlacement = 'start';
		}
		
		return (
			<FormControlLabel
				control={<MUISwitch color="primary" {...other}/>}
				label={label}
				value={other.value}
				{...formControlProps}
			/>
		);
	}

	public static Radio = function Radio(p: RadioProps & {label?: any, formControlProps?: Partial<FormControlLabelProps>}) {
		const {
			formControlProps,
			label,
			...other
		} = p;

		return (
			<FormControlLabel
				control={<MUIRadio color="primary" {...other}/>}
				label={label}
				value={other.value}
				{...(formControlProps || {})}
			/>
		);
	}

	public static TextField = function TextField(p: TextFieldProps) {
		return <MUITextField margin='normal' {...p}/>;
	}
	
	public static TextArea = function TextArea(p: TextFieldProps) {
		// using "rows in p" as to check if there is present rows={undefined}
		// with normal const { b = 3 } = p, b won't be undefined
		return <FieldsFactory.TextField {...p} rows={"rows" in p ? p.rows : 3} multiline={true}/>
	}
	
	public static NumberField = function NumberField(p: TextFieldProps) {

		// parse the number on change
		const onChange = (e?: React.ChangeEvent<any>) => {
			const val = e.currentTarget.value;
			const parsed = val === '0' || !val ? 0 : parseInt(val.toString());

			// if it is not Nan 
			// and if the value is the same length after the parse
			if (!isNaN(parsed)) {
				// override the old value with the new one
				// use the spread operator as you cant change value of an event
				e.target = {...e.target, value: parsed};
				e.currentTarget = {...e.currentTarget, value: parsed};
				// trigger the parent onChange action
				if (p.onChange) { p.onChange(e); }
			}
		}

		return <FieldsFactory.TextField {...p} type="number" value={p.value && (p.value as any).toString()} onChange={onChange}/>;
	}
	
	public static PriceField = function PriceField(p: TextFieldProps) {

		// formats the text value present into a string into a number
		const onBlur = (e?: React.FocusEvent<any>) => {
			// get current text value
			const val = e.currentTarget.value;
			// set it to cents
			const parsed = DataFormatterService.stringToCents(val);

			if (!isNaN(parsed)) {
				// override the old value
				e.target = {...e.target, parentElement: e.target.parentElement, value: parsed};
				e.currentTarget = {...e.currentTarget, parentElement: e.currentTarget.parentElement, value: parsed};
				// trigger onChange as the value has changed
				if (p.onChange) { 
					p.onChange(e);
					// ensure the HTML view changes, this line is required for Firefox, in Chrome it is not required
					e.currentTarget.value = DataFormatterService.centsToScreenPrice(parsed);
				}
			}

			// trigger default onBlur
			if (p.onBlur) { p.onBlur(e); }
		}

		// format the value to human readable format
		// keep this typeof === 'number' as it's a sure way to know that the focus is blurred
		// because the value is a number only on blur
		// then it's barck to normal
		//
		// TODO instead of doing this monstruosity,
		// (as we're force to do the monstruosity above for this to work too)
		// we can add a new prop "formattedValue" or something like that :]
		const value = (p.value || p.value === 0) && typeof p.value === 'number' ? DataFormatterService.centsToScreenPrice(p.value) : p.value || '';

		return <FieldsFactory.TextField {...p} value={value} onBlur={onBlur}/>;
	}

	public static SelectField = function SelectField(p: SelectProps & {values: SelectFieldValue[], formControlProps?: FormControlProps}) {

		const {
			values,
			formControlProps = {},
			fullWidth,
			error,
			margin = 'normal',
			variant,
			...other
		} = p;

		const datasetObject = {};
		for (const k in other) {
			if (k.indexOf('data-') === 0) {
				datasetObject[k] = other[k];
			}
		}

		// calculate if its not full width, as it's already at max width
		// and calculate if the label is present as a string
		const minWidth = !p.fullWidth && p.label && typeof p.label === 'string' && {minWidth: p.label.length * 15 + 'px'};

		return (
			<FormControlMUI style={minWidth || undefined} variant={variant} fullWidth={fullWidth} error={error} margin={margin} {...formControlProps}>
				{typeof p.label === 'undefined' ? false : <InputLabel>{p.label}</InputLabel>}
				<Select 
					renderValue={p.multiple 
							? FieldsFactory.multiSelectRender(values) 
							: (v) => {
								const f = values.find(vv => (vv.value === v))
								return f ? f.label : ''
							}
					}
					fullWidth={fullWidth} 
					error={error}
					{...other}
					// dense is smaller than none.. what ?
					margin={margin === 'none' ? 'dense' : margin as 'dense' | 'none'}
				>
					{values.map((availableValue, idx) => (
						<MenuItem key={"" + idx + (availableValue.value as string)} value={availableValue.value as string} {...datasetObject}>
							{availableValue.menuLabel || availableValue.label}
						</MenuItem>
					))}
				</Select>
			</FormControlMUI>
		);
	}

	public static MultiSelectField = function MultiSelectField(p: SelectProps & {values: SelectFieldValue[], formControlProps?: FormControlProps}) {
		return <FieldsFactory.SelectField {...p} multiple={true} value={p.value || []} />
	}
	


	private static multiSelectRender = (allAvailableValues: SelectFieldValue[]) => {

		// save hm of values for performance
		const valHm: {[val: string]: any} = {};
		for (const v of allAvailableValues) {
			if (valHm[v.value.toString()]) { throw new Error("Identical values fields found in Select Field"); }
			valHm[v.value] = v.label as any;
		}

		// return the fn
		return val => (val as Array<any>).map(vv => valHm[vv]).join(', ');
	}


	// private static style = { margin: 2, height: 'auto', borderRadius: '7px' };
	// /**
	//  * A function that renders the values as chips 
	//  * it is used for multi-select fields
	//  */
	// private static multiSelectRender = (allAvailableValues: SelectFieldValue[]) => {

	// 	// save hm of values for performance
	// 	const valHm: {[val: string]: SelectFieldValue} = {};
	// 	for (const v of allAvailableValues) {
	// 		if (valHm[v.value.toString()]) { throw new Error("Identical values fields found in Select Field"); }
	// 		valHm[v.value] = v;
	// 	}

	// 	// return the fn
	// 	return (fieldValues: string[]) => (
	// 		<Box display='flex' flexWrap='wrap'>
	// 			{fieldValues.map((value, idx) => (
	// 				<Chip key={value} label={valHm[value] ? valHm[value].label : "UNDEFINED"} style={FieldsFactory.style} />
	// 			))}
	// 		</Box>
	// 	);
	// }


}

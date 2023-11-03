import './select-filter.component.css';
import React from 'react';
import { ErrorFactory } from '../../../../utils/errors/error-factory';
import { FieldsFactory } from '../../../fields/fields-factory';
import { ISelectFilterOptions, DSFProps } from './dtd';


interface Internal_ISelectFilterOptions<T> extends ISelectFilterOptions<T> {
	/**
	 * Allows you to track which values has to be casted
	 */
	_availableValuesTypeofObjectIdx?: number[];

	_addedEmptyFieldForSingleSelect?: boolean;
}


/**
 * Generates multi-select based on the config input and updates the ouputData object
 * with a custom filter to send to the BE
 * @param props.config The configuration of the component
 * @param props.outputData the output data object reference
 */
export class DtSelectFilter<T = any> extends React.PureComponent<DSFProps<T>> {

	/**
	 * Updates the value in the outputData object
	 */
	private static updateOutputDate(field: Internal_ISelectFilterOptions<any>, ouputData: object) {
		// no value
		if (typeof field.value === "undefined" || field.value === "" || (field.multiple && (!field.value || field.value.length === 0))) {
			delete ouputData[field.modelPath as string];
			return;
		}

		const value = DtSelectFilter.getFieldValue(field);

		if (field.multiple) {
			ouputData[field.modelPath as string] = {$in: value};
		} else {
			ouputData[field.modelPath as string] = value;
		}
	}
	

	/**
	 * Transforms the value to object/number if necessary
	 */
	private static getFieldValue(field: Internal_ISelectFilterOptions<any>): any {

		const valsArr: any[] = field.multiple ? field.value : [field.value];

		// check if the value has to be parsed
		// by comparing the string value with the array of automatically parsed values
		// if there's a match, then parse to object
		if (field._availableValuesTypeofObjectIdx && field._availableValuesTypeofObjectIdx.length !== 0) {
			for (let i = 0; i < valsArr.length; i++) {
				for (const idx of field._availableValuesTypeofObjectIdx) {
					if (valsArr[i] === field.availableValues[idx].value) {
						valsArr[i] = JSON.parse(valsArr[i]);
					}
				}
			}
		}


		if (field.castToInt) {
			for (let i = 0; i < valsArr.length; i++) {
				if (typeof valsArr[i] !== 'object') {
					const parsed = parseInt(valsArr[i], 10);
					if (!isNaN(parsed)) { valsArr[i] = parsed; }
				}
			}
		}

		return field.multiple ? valsArr : valsArr[0];

	}

	/**
	 * transfors objects to strings sets the output data and some other magic stuff
	 */
	private static setInitialData(fields: ISelectFilterOptions<any>[], inputData: object, outputData: object) {
	
		for (const field of (fields as Internal_ISelectFilterOptions<any>[])) {

			// add empty value for single select
			if (!field.multiple && !field._addedEmptyFieldForSingleSelect) {
				field._addedEmptyFieldForSingleSelect = true;
				field.availableValues.unshift({label: '<VUOTO>', value: ''});
			}

			if (!field._availableValuesTypeofObjectIdx) {
				field._availableValuesTypeofObjectIdx = [];
			}
			const fieldAValues = [];
			
			// cast objects and track them
			for (let i = 0; i < field.availableValues.length; i++) {

				if (typeof field.availableValues[i].value === 'object') {
					field._availableValuesTypeofObjectIdx.push(i);
					field.availableValues[i].value = JSON.stringify(field.availableValues[i].value);
				}
				if (fieldAValues.includes(field.availableValues[i].value)) {
					throw ErrorFactory.make("DtSelectFilter cannot contain two identical available values: " + field.availableValues[i].value);
				}

				fieldAValues.push(field.availableValues[i].value);
			}

			// restore the old value
			if (typeof inputData[field.modelPath as string] === 'undefined') {
				field.value = undefined;
			} 
			else {
				if (field.multiple) {
					if (inputData[field.modelPath as string].$in) {
						field.value = inputData[field.modelPath as string].$in;
					}
				} else {
					field.value = inputData[field.modelPath as string];
				}
			}
			
			// fix the value
			if (typeof field.value !== "undefined") {
				const valsArr: any[] = field.multiple ? field.value : [field.value];
				for (let i = 0; i < valsArr.length; i++) {

					if (typeof valsArr[i] === 'object') {
						valsArr[i] = JSON.stringify(valsArr[i]);
					}
					// ensure that the value is available in the select
					let valueIsInAvailableValues = false;
					for (const av of field.availableValues) {
						if (av.value === valsArr[i]) {
							valueIsInAvailableValues = true;
							break;
						}
					}

					// remove value if not present
					if (!valueIsInAvailableValues) {
						valsArr.splice(i, 1);
						i--;
						continue;
					}

				}

				field.value = field.multiple ? valsArr : valsArr[0] || '';
			}
			
			// add initial data to output
			DtSelectFilter.updateOutputDate(field, outputData);
		}
	}


	// set the initial data
	constructor(props: DSFProps<any>) {
		super(props);
		DtSelectFilter.setInitialData(props.fields, props.inputData, props.outputData);
	}

	
	/**
	 * Returns an event handler for a multiselect field
	 * @param idx The idx of the cicled multiselect
	 */
	private getChangeHandler = (e: React.ChangeEvent<any>) => {
		const idx = e.currentTarget.dataset.idx;
		this.props.fields[idx].value = (e.target as any).value;
		DtSelectFilter.updateOutputDate(this.props.fields[idx], this.props.outputData);
		this.forceUpdate();
	}



	render() {
		return (
			<div className='select-filter-component-container'>
				{(this.props.fields as Internal_ISelectFilterOptions<any>[]).map((field, idx) => {
					const Field = field.multiple ? FieldsFactory.MultiSelectField : FieldsFactory.SelectField;
					return (
						<Field
							key={field.label} 
							values={field.availableValues} 
							label={field.label}
							value={field.value || field.value === 0 ? field.value : ''}
							data-idx={idx}
							onChange={this.getChangeHandler}
							fullWidth={true}
							variant={'standard'}
						/>
					);
				})}
			</div>
		);
	}

}

import { SelectFieldValue } from "../../../fields/dtd";

export declare interface ISelectFilterOptions<T> {

	/**
	 * The label to show on the select
	 */
	label: string;
	/**
	 * The field that the select affects.
	 */
	modelPath: keyof T | (string & {});
	/**
	 * Selects values, this component allows for objects as values
	 * (they are stringified/parsed automatically)
	 */
	availableValues: {
		label: SelectFieldValue['label'];
		menuLabel?: SelectFieldValue['menuLabel'];
		value: any;
	}[];

	/**
	 * The starting value of the item
	 * can be an object
	 * you can pass the object without stringifing it
	 */
	value?: any;
	/**
	 * The generated select will be multiple
	 */
	multiple?: true;
	/**
	 * Parses the value to integer before creating the object
	 */
	castToInt?: true;

}

export interface DSFProps<T = any> { 
	/**
	 * The fields to show in the component 
	 */
	fields: ISelectFilterOptions<T>[];
	
	inputData: object;

	/**
	 * This object is passed as a "two-way binding"
	 * as it's a reference, the component modifies it directly
	 */
	outputData: object;
}

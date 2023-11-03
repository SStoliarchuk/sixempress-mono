import { IAsyncModelSelectProps } from "../../../async-model-table-select/dtd";
import { Omit, TextFieldProps } from "@material-ui/core";
import { AmtsFieldProps } from "../../../fields/dtd";
import { IBaseModel } from "../../../../services/controllers/IBaseModel";

export declare interface AFCField<T, A = any> extends Omit<AmtsFieldProps<A>, 'amtsInput'> {
	// omit the choseFn as it's automatically added
	amtsInput: Omit<IAsyncModelSelectProps<A>, 'choseFn'>;	
	
	textFieldProps: Omit<TextFieldProps, 'value'>;
	
	modelPath: keyof T | (string & {});

	value?: IBaseModel;

	/**
	 * Omits .id suffix to the modelPath
	 * useful for some particular be fields
	 * like _parentsTree in the categories
	 */
	useOnlyModelPath?: true;
}

export interface AFCProps<T = any> { 
	/**
	 * The fields to show in the component 
	 */
	fields: AFCField<T>[];

	inputData: object;

	/**
	 * This object is passed as a "two-way binding"
	 * as it's a reference, the component modifies it directly
	 */
	outputData: object;

}

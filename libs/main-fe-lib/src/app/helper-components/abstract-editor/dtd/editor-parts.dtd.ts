import { AbstractControl } from "react-reactive-form";
import { GridProps } from "@material-ui/core/Grid";
import { IEditorFormControlOptions, RawField } from "./fields.dtd";

/**
 * Parts of the editor that are available only on the root of the editor tree
 */
export declare type TopLevelEditorPart<T = any> = (CutPart | IEditorPart<T>);

/**
 * Basic parts
 */
export declare type IEditorPart<T> = 
	DividerPart<T> | 
	JSXPart<T> |  
	IEditorLogicPart<T>;

/**
 * Parts with logic
 */
export declare type IEditorLogicPart<T> =
	AbstractControlPart<T> |
	FormArrayPart<T> |
	FormGroupPart<T> |
	FormControlPart<T>; 

export interface RawPart<T> {
	/**
	 * Assigned interally after the generation
	 */
	parent?: TopLevelEditorPart<T> | IEditorPart<T>;

	attributes?: {
		required?: number[],
	};
}

export interface CutPart extends RawPart<any> {
	type: 'cut';
	/**
	 * this is useful for manual jsx elements, simply removes/adds the paper wrap
	 * 
	 * @false => all the items before the cut are put as root items
	 * @true => all the items before the cut are put as <Paper/> child
	 * @default true
	 */
	usePaperForBeforeCut?: boolean;
}

export interface AbstractControlPart<T> extends RawPart<T> {
	type: 'abstractControl';
	logic: RawField;
}

/**
 * The base interface that every different part of the editor should extend
 */
export interface BasePart<T> extends RawPart<T> {
	/**
	 * props for the grid item that contains the editor part
	 */
	gridProp?: GridProps;

}

export interface UiPart<T> extends BasePart<T> {
	/**
	 * Manually render the field
	 * @param render it is the render function to render the field
	 */
	wrapRender?: (render: JSX.Element) => JSX.Element;
}


export interface DividerPart<T> extends BasePart<T> {
	type: "divider";
}

export interface JSXPart<T> extends BasePart<T> {
	type: "jsx";
	component: JSX.Element | (() => JSX.Element);
}

export interface FormGroupPart<T> extends UiPart<T> {
	type: 'formGroup';
	logic: RawField & {
		parts: IEditorPart<T>[],
	};
}

export interface FormControlPart<T> extends UiPart<T> {
	type: 'formControl';
	logic: IEditorFormControlOptions;
}

/**
 * Will automatically cast to formgroup if the render contains more than 1 formControl
 * if it contains only 1 form control, it will not cast
 */
export interface FormArrayPart<T> extends UiPart<T> {
	type: 'formArray';
	logic: RawField & {
		/**
		 * The list of parts that compose the formArray
		 */
		parts: IEditorPart<T>[],
		/**
		 * When you give only 1 form control, it is by default a field,
		 * this transforms it to an object
		 */
		forceFormGroup?: true,
		/**
		 * this function is called for every child that the formArray contains
		 * if it returns true, then that row can be deleted
		 * if it returns false, then that row CANNOT be deleted
		 */
		canDeleteChild?: (childValue?: any) => boolean,
		/**
		 * The function to generate MANUALLY the abstractControl that controls the row of the formArray
		 */
		generateControl?: (value?: any) => AbstractControl,
		/**
		 * Returns the value to use for the control generation
		 */
		getRowValueForControl?: (currentValue?: any) => any;
		/**
		 * The minimum amount of rows in the formArray
		 */
		min?: number,
		/**
		 * The maximum amount of rows in the formArray
		 */
		max?: number,
		/**
		 * The addBtn settings for the new row in formArray
		 */
		addBtn?: false | string | (() => JSX.Element),

	};
}

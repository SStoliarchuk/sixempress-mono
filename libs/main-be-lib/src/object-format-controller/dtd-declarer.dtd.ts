import { LibModelClass } from "../utils/enums";
import { VerifyError } from "./communication-object.interface";
import { FetchableField } from "./fetchable-field";

export interface IDeletedCreatedData {
	_timestamp: number;
	/**
	 * It is not present when the item is created/deleted not with a request
	 * but from the DB
	 * AKA reqOrDb is db, not req
	 */
	_author: FetchableField<string>;
}

// TODO create a better type ??
export declare type IVerifiableItemDtd<T> = {
	[A in keyof T]?: IDtdTypes<T[A]> | (() => IDtdTypes<T[A]>);
	// [A in Exclude<keyof T, keyof any[]>]?: IDtdTypes<T[A]>;
};

export declare type IVerifiableItemDtdStatic<T> = {
	[A in keyof T]?: IDtdTypes<T[A]>;
};

export type IArrayDef<T> = Omit<IDtdTypes<T[keyof T]>, 'required'>;
// export declare type ObjectHashmapDefinition = 'string' | 'number' | 'array' | 'object' | '';


export interface IDtdTypes<T = {}> {
	/**
	 * The types that the value can have
	 */
	// type: (RootTypes | Array<any>)[];
	type: (String | Number | Boolean | Object | Array<any> | 'any')[];
	/**
	 * Flag if the value is required or not
	 */
	required: boolean | ((body: any) => boolean);

	/**
	 * A custom function to execute
	 * 
	 * This function is executed as the last test (but before checking the required fields)
	 * So all types are matched
	 */
	customFn?: ((val: T, body: any) => VerifyError | string | void);

	/**
	 * If the type is an object
	 * and this is true,
	 * if the object has additional fields that are not present
	 * in the dtd
	 * then it doesn't error
	 */
	// ignoreAdditionalObjectFields?: boolean;
	/**
	 * The possible values that it can have
	 */
	possibleValues?: any[];
	/**
	 * A regex exp that is executed if the value is a string or a number 
	 * (
	 * 	if the value is a number, then to check it with regex
	 * 	you need to enable the flag
	 *  it's temporary converted to string
	 * )
	 */
	regExp?: RegExp;

	/**
	 * If the value is a number checks that the number is in ALL of the given possible intervalls
	 * 
	 * // TODO instead of matching in ALL, do it as an OR like objDef
	 */
	minMaxNumber?: {
		min?: number,
		max?: number
	}[];

	/**
	 * Minimum array length
	 */
	minArrN?: number;
	/**
	 * Maximum array length
	 */
	maxArrN?: number;

	/**
	 * The array definition used if the type is an array
	 * The values in the array can match one of the given values to pass
	 */
	arrayDef?: IArrayDef<T>;
	/**
	 * The definition of the possible object if the value is an object
	 * The value can match one of the given possibilities to pass
	 * 
	 * If you pass a IVerifiableItemDtd, then it will be checking each object normally
	 * If you pass one of the RootTypes (String, Array, Number, Object, 'any', Boolean)
	 * 
	 * It will check the object as a hashmap where the value is the RootType specified
	 *
	 */
	// objDef?: IVerifiableItemDtd<T>[];
	// TODO add hashmap object possibility
	// what is wrong with typescript here ??..
	objDef?: (IVerifiableItemDtd<T> | String | Number | Boolean | NumberConstructor | StringConstructor | BooleanConstructor)[];
}

// interface Model extends IBaseModel {
// 	list: {
// 		a: 1,
// 		b: {
// 			c: 3
// 		}
// 	}[];
// }

// const d: IVerifiableItemDtd<Model> = {
// 	list: {arrayDef: {objDef: [{
		 
// 	}]}}
// }
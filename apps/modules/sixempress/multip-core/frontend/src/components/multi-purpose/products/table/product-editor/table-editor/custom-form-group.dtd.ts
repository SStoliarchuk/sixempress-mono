import { FormGroup, FormArray, FormControl } from "react-reactive-form";

// TODO export this to the @sixempress/main-fe-lib

/**
 * Transforms a Model to an object to pass to the FormGroup
 */
export declare type ModelToFormGroupData<T> = {
	[A in keyof T]: 
	FormControl |
	(
		T[A] extends Array<any> 
			? CFormArray<T[A][0]>
			: CFormGroup<T[A]>
	)
		// T[A] extends Array<any>
		// 	? CFormArray<T[A]>
		// 	: FormControl
		// T[A] extends number | string | boolean
		// ? FormControl
		// : T[A] extends Array<any> 
		// 	? CFormArray<T[A][0]>
		// 	: CFormGroup<T[A]>
};

/**
 * Transforms an object to it's form array counterpart
 */
export declare type ModelToFormArray<T> = T extends object ? CFormGroup<T>[] : FormControl[];

interface A<T> {
	value: T
}

/**
 * Custom formGroup with types overriden
 */
export class CFormGroup<T> extends FormGroup implements A<T> {
	
	// eslint-disable-next-line
	constructor(val: ModelToFormGroupData<T>) { 
		super(val); 
	}

	// value: T;
	// // some strange workaround
	// // when you add the typed value field (value: T)
	// // the formgroup can't assign the value,
	// // so formgroup.value is undefined
	// set value(v: T) { (this as any)._value = v; }
	// get value(): T { return (this as any)._value; }
}

/**
 * Custom form array with the types overriden
 */
export class CFormArray<T> extends FormArray implements A<T> {
	// disabling eslint as it says the constructor is useless
	// eslint-disable-next-line
	constructor(val: ModelToFormArray<T>) { 
		super(val); 
	}
}


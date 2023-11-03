import { FormControl, AbstractControl } from 'react-reactive-form';
import { ObjectUtils } from '@sixempress/utilities';

export class CustomValidators {

	/**
	 * Compares the form control to the form control of the same name that is given as input
	 * @param referenceFieldName the name of the formControl to compare to (same parent)
	 * @returns null if they are identical, else returns {notMatch: true}
	 */
	public static isIdentical(referenceFieldName: string) {
		let confirmFieldControl: FormControl;
		let referenceFieldControl: FormControl;

		return (selfControl: AbstractControl) => {
			const control = selfControl as FormControl;

			// If not part of a form group return null
			if (!control.parent) {
				return null;
			}

			// Setting the fields to control
			if (!confirmFieldControl) {
				confirmFieldControl = control;
				referenceFieldControl = control.parent.get(referenceFieldName) as FormControl;
				referenceFieldControl.valueChanges.subscribe(() => {
					confirmFieldControl.updateValueAndValidity();
				});
			}

			if (referenceFieldControl.value && confirmFieldControl.value) {
				// if values are different return error
				if (referenceFieldControl.value.toLowerCase() !== confirmFieldControl.value.toLowerCase() ) {
					return { notMatch: true };
				}
			} else {
				if (referenceFieldControl.value !== confirmFieldControl.value) {
					return { notMatch: true };
				}
			}

			// else return null
			return null;
		};
	}


	/**
	 * Returns false if the reference field value doesn't match any valuesToMatch given
	 * @param valuesToMatch an array of values regex/string to match (you can match null and undefined too) \
	 * if a regex string is given then the value is parsed to string with .toString() or JSON.parse()
	 */
	public static requiredByOtherFieldValue(referenceFieldName: string, valuesToMatch: any[]) {
		let currentField: FormControl;
		let referenceFieldControl: FormControl;

		return (selfControl: AbstractControl) => {
			const control = selfControl as FormControl;

			// If not part of a form group return null
			if (!control.parent) {
				return null;
			}

			// Setting the fields to control
			if (!currentField) {
				currentField = control;
				referenceFieldControl = control.parent.get(referenceFieldName) as FormControl;
				referenceFieldControl.valueChanges.subscribe(() => {
					currentField.updateValueAndValidity();
				});
			}

			// if there is value then it's oc, don't check
			if (currentField.value) { 
				if (currentField.value.constructor === Array) {
					if (currentField.value.length !== 0) {
						return null; 
					}
				} 
				else {
					return null; 
				}
			}

			const refValue = referenceFieldControl.value;

			// find a value that matches
			for (const v of valuesToMatch) {
				// handle regexp
				if (v instanceof RegExp) {
					let toCompare: string;

					// make string
					if (refValue === null) { toCompare = 'null'; } 
					else if (refValue === undefined) { toCompare = 'undefined'; }
					else if (typeof refValue === 'object') { toCompare = JSON.stringify(refValue); }
					else { toCompare = refValue.toString(); }
			
					if (v.test(toCompare)) {
						return { isRequired: true };
					}
				}
				// handle rest
				else if (ObjectUtils.areVarsEqual(refValue, v)) {
					return { isRequired: true };
				}
			}

			// else return null
			return null;
		};
	}


	/**
	 * Checks if the every field that match the regex has a different value
	 * @param fieldNameByRegex the regex expression to search for other fields to match
	 */
	public static differentFromFieldByRegex(fieldNameByRegex: RegExp) {
		let currentField: FormControl;
		let referenceFields: FormControl[];

		return (selfControl: AbstractControl) => {
			const control = selfControl as FormControl;
			
			// If not part of a form group return null
			if (!control.parent) {
				return null;
			}

			// Setting the fields to control
			if (!referenceFields) {
				// sets current field
				currentField = control;
				// gets the reference field by calling every formcontrol name that matches the regex
				// but is not the form control that has this validation
				referenceFields = Object.keys(control.parent.controls).reduce((carry, controlName) => {
					const r: AbstractControl = control.parent.controls[controlName];
					if (controlName.match(fieldNameByRegex) && control !== r) {
						carry.push(r);
						r.valueChanges.subscribe(o => currentField.updateValueAndValidity({onlySelf: true}));
					}
					return carry;
				}, []);
			}

			// checks if any of the reference controls has the same value
			for (const refControl of referenceFields) {
				if (refControl.value === currentField.value) {
					return { sameValue: true };
				}
			}

			// else return null
			return null;
		};
	}


}

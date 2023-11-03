import { PatchOperation } from "../utils/dtd";
import { IVerifiableItemDtd, IDtdTypes } from "./dtd-declarer.dtd";
import { ObjectUtils } from '../utils/object-utils';
import { VerifyError } from "./communication-object.interface";
import { MongoUtils } from "../utils/mongo-utils";

export abstract class VerifiableObject<T = {}> {

	public allowExtraFields = true;

	/**
	 * verifies the object and returns the info
	 * @param object object to test
	 * @param dtd the dtd to pass
	 */
	public static verify<T>(object: object, dtd: IVerifiableItemDtd<T>, validatePrivateFields?: boolean): VerifyError[] | void {
		// TODO fix this
		class Temp extends VerifiableObject {
			canSkipField(f: string) { return !validatePrivateFields && f.startsWith('_'); }
			getDtd() { return dtd; }
		}
		return new Temp().verifyObject(object);
	}

	/**
	 * The object that is currently being checked;
	 */
	private currentlyChecking: any;

	/**
	 * Declares the dtd of the saveable item
	 */
	protected abstract getDtd(): IVerifiableItemDtd<T>;

	/**
	 * These fields will be ignored when verifying them
	 */
	protected ignoreFields: string[];

	/**
	 * A function that checks if a field can be skipped or not
	 */
	protected canSkipField(fieldName: string, dtdPath: string): boolean {
		return this.ignoreFields && this.ignoreFields.includes(fieldName);
	}


	verifyObject(obj: Object): VerifyError[] | void {

		this.currentlyChecking = obj;

		// clone the object to prevent data altering
		const toCheck = ObjectUtils.cloneDeep(obj);

		const verifyError = this.internalVerifyAndCast(toCheck);
		if (verifyError) {
			this.fixFieldPaths(verifyError);
			return verifyError; 
		}

		const requiredError = this.verifyRequired(toCheck);
		if (requiredError) { 
			this.fixFieldPaths(requiredError);
			return requiredError; 
		}
	}


	/**
	 * Patches the object from the BE and then verifies it as it was a POST/PUT
	 * the patches will be applied to the object so we clone it before hand
	 */
	verifyPatchOps(objToVerify: any, patchOps: PatchOperation<T>[], alreadyCloned?: boolean): VerifyError[] | void {
		
		// clone the object to prevent data altering
		const obj = alreadyCloned ? objToVerify : ObjectUtils.cloneDeep(objToVerify);

		// apply the patches
		const applied = VerifiableObject.applyPatchOperationToObject(obj, patchOps);
		if (applied) { return applied; }

		// verify that the object is correct
		const verifyObjErr = this.verifyObject(obj);
		if (verifyObjErr) { return verifyObjErr; }

	}

	/**
	 * Applies PatchOperations to a given object
	 * @returns errors if there are errors with the patchoperation for the relative obj
	 */
	public static applyPatchOperationToObject(obj: object, patchOps: PatchOperation<any>[]): VerifyError[] | void {
		return MongoUtils.applyPatchOperationToObject(obj, patchOps, true);
	}

	/**
	 * Removes .objDef and .arrayDef from field names in the errors array
	 * @param errors The errors where to remove the words
	 */
	private fixFieldPaths(errors: VerifyError[]): void {
		for (const err of errors) {
			// recursive check
			if (err.possibleErrors) {
				for (const p of err.possibleErrors) { this.fixFieldPaths(p); }
			}

			err.field = err.field.replace(/\.objDef\.[0-9]+/gi, '').replace(/\.arrayDef/gi, '.N');
		}
	}

	/**
	 * Private function because it's used recusevly and it should not expose the dtdPath param
	 * @param obj Object to verify
	 * @param dtdPath Path to reach nested validation in dtd
	 */
	private internalVerifyAndCast(obj: any, dtdPath: string = ''): VerifyError[] | void {
		
		// prepare array of errors to return
		const errors: VerifyError[] = [];
		
		// get the dtd array to check
		const dtd: IVerifiableItemDtd<any> = dtdPath ? ObjectUtils.getValueByDotNotation(this.getDtd(), dtdPath) : this.getDtd();


		// add dot to the end of the dtd path for the recursive
		if (dtdPath) dtdPath += '.';

		// fn to add faster the err
		let keyName: string;
		const addError = (message: string) => errors.push({
			field: dtdPath + keyName, message
		});

		
		for (const key in obj) {

			if (this.canSkipField(key, dtdPath)) 
				continue;
			
			const keyDtdInfo = typeof dtd[key] === 'function' ? (dtd[key] as () => IDtdTypes<any>)() : dtd[key] as IDtdTypes<any>;

			keyName = key;
			const value = obj[key];
			
			// check if field is present in dtd
			if (!keyDtdInfo) {
				if (!this.allowExtraFields)
					addError('Field not present in Model DTD'); 
				continue; 
			}
			
			// check if the value is undefined
			if (value === undefined || value === null) { 
				addError('Value cannot be undefined OR null'); 
				continue; 
			}

			// compare the value that the item should have
			// if there is the value property, else do normal check
			if (keyDtdInfo.possibleValues && !this.isInPossibleValues(value, keyDtdInfo.possibleValues)) {
				addError('The required value for this field, does not match with the given one'); 
			} 
			// this else is used as no need to verify the value is in possible values
			// but we still need to check the customFn :D
			else {
				// begin normal check
				const err = this.verifyValue(obj[key], keyDtdInfo, dtdPath + key);
				if (typeof err === 'string') {
					addError(err);
				} 
				else if (typeof err === 'object') {
					errors.push(...err);
				}
			}


			// execute custom check
			if (keyDtdInfo.customFn) {
				const customErr = keyDtdInfo.customFn(obj[key], this.currentlyChecking);
				if (customErr) { 
					if (typeof customErr === 'string') {
						addError(customErr);
					}
					else if (typeof customErr === 'object') {
						errors.push(customErr); 
					}
				}
			}

		}
		// return errors if there are
		if (errors.length !== 0) { return errors; }
	}

	/**
	 * Checks if a given value is present in the possible values or not
	 * @param value the value to search in the possible values
	 * @param possibleValues The possible values that the object can have
	 */
	private isInPossibleValues(value: any, possibleValues: any[]): boolean {
		// return a simple check if not an object element
		if (typeof value !== 'object') { 
			return possibleValues.includes(value); 
		}

		// else cicle every object until one that has no diff
		for (const val of possibleValues) {
			if (typeof val === 'object' && !ObjectUtils.objectDifference(value, val)){
				return true;
			}
		}

		// not found in possibilities
		return false;
	}

	/**
	 * Verifies a value from the object with a given dtd
	 * @param value the value to verify
	 * @param dtd the dtd of that value
	 * @param dtd The path from the root of the object to this value
	 */
	private verifyValue(value: any, dtd: IDtdTypes, dtdPath: string): string | VerifyError[] | void {

		// check any type
		if (dtd.type.includes('any')) { return; }

		// check the given type
		if (!dtd.type.includes(value.constructor)) { 
			return 'Type not allowed for this field'; 
		}

		// check regex
		if (dtd.regExp) {
			if (
				(typeof value === 'object' && !dtd.regExp.test(JSON.stringify(value))) || // object
				!dtd.regExp.test(value.toString()) // not-object
			) {
				return 'The value does not pass the RegExp: ' + dtd.regExp.toString();
			}
		}

		switch (value.constructor) {

			case String:
			case Boolean:
				break;

			case Number:
				
				// TODO add a "allowFloat" flags to the DTD
				if (!Number.isSafeInteger(value)) { return "The value is not a safe integer"; }

				if (isNaN(value)) { return 'The value is NaN'; }

				// TODO instead of matching in ALL, do it as an OR like objDef
				if (dtd.minMaxNumber) {
					for (const poss of dtd.minMaxNumber) {
						if (typeof poss.min !== 'undefined' && poss.min > value) {
							return 'The value does not match the minimum required: ' + poss.min;
						}
						if (typeof poss.max !== 'undefined' && value > poss.max) {
							return 'The value does not match the maximum allowed: ' + poss.max;
						}
					}
				}
				break;

			// check array before object as
			// Array === Object
			// but Object !== Array
			// inheritance stuff
			case Array:

				if (dtd.minArrN !== undefined && value.length < dtd.minArrN) { return 'The array does NOT have the minimum required length: ' + dtd.minArrN; } 
				if (dtd.maxArrN !== undefined && value.length > dtd.maxArrN) { return 'The array exceedes the maximum allowed length: ' + dtd.maxArrN; } 

				const arrErr = this.checkArrayDef('validate', value, dtd.arrayDef as any as IDtdTypes<any>, dtdPath);
				if (arrErr) { return arrErr; }
				break;

			case Object:
				// recursive check for errors
				const errs = this.checkObjDefArray('validate', value, dtd.objDef, dtdPath);
				if (errs) { return errs; }
				break;

			
		}

	}


	/**
	 * This function checks if all the required fields are present. IT DOES NOT CHECK FOR TYPES
	 * So execute this function after checking that the types are correct
	 * 
	 * Otherwise you can try catch this ??
	 * 
	 * @param obj Object to check
	 * @param dtdPath dtdpath for recursivness
	 */
	private verifyRequired(obj: any, dtdPath: string = ''): VerifyError[] | void {

		// prepare array of errors to return
		const errors: VerifyError[] = [];

		// get the dtd array to check
		const dtd: IVerifiableItemDtd<any> = dtdPath ? ObjectUtils.getValueByDotNotation(this.getDtd(), dtdPath) : this.getDtd();

		// add dot to the end of the dtd path for the recursive
		if (dtdPath) { dtdPath += '.'; }

		// fn to add faster the err
		let keyName: string;
		const addError = (msg: string) => errors.push({
			field: dtdPath + keyName,
			message: msg
		});


		for (const key in dtd) {


			// set the keyname for the err function
			keyName = key;
			const keyDtdInfo = typeof dtd[key] === 'function' ? (dtd[key] as () => IDtdTypes<any>)() : dtd[key] as IDtdTypes<any>;


			let required = keyDtdInfo.required;
			if (typeof keyDtdInfo.required === 'function') {
				required = ((keyDtdInfo.required) as (b: any) => boolean)(this.currentlyChecking);
			}

			// check that the value is present and not null/undefined
			if (required && (obj[key] === undefined || obj[key] === null)) { 
				addError('Field cannot be undefined / Field has to be present'); 
			}
			else if (obj[key] && !this.acceptsAnyType(keyDtdInfo)) {

				if (keyDtdInfo.possibleValues && !this.isInPossibleValues(obj[key], keyDtdInfo.possibleValues)) {
					addError('The required value for this field, does not match with the given one');
					continue;
				}

				// not compatibile with this objDef types
				if (!keyDtdInfo.type.includes(obj[key].constructor)) { 
					addError('Type not allowed for this field'); 
					continue;
				}

				switch (obj[key].constructor) {
					case Array:
						const arrErrs = this.checkArrayDef('required', obj[key], keyDtdInfo.arrayDef as any as IDtdTypes, dtdPath + key);
						if (arrErrs) { errors.push(...arrErrs); }
						break;

					case Object:
						const errs = this.checkObjDefArray('required', obj[key], keyDtdInfo.objDef, dtdPath + key);
						if (errs) { errors.push(...errs); }
						break;


				} 
			}

		}

		// return errors if there are
		if (errors.length !== 0) { return errors; }
	}

	/**
	 * Controls that the array has the correct values types or that the required fields are present
	 * @param mode The mode to check the array
	 * @param arrayToCheck The array to check
	 * @param dtd the arrayDef for this array
	 * @param pathToArray The path to this array from the root of the object
	 */
	private checkArrayDef(
		mode: 'required' | 'validate', 
		arrayToCheck: any[], 
		dtd: IDtdTypes<any>,
		dtdPath: string,
	): VerifyError[] | void {
		if (!dtd) { throw new Error('No arrayDef found in dtd declaration'); }

		// TODO refactor code for this and objDef to use directly internal verify 
		// as basically i have doubled the code ....

		// check if accepts any
		if (this.acceptsAnyType(dtd)) { return; }

		const errsToR: VerifyError[] = [];

		// check each value in the array
		for (let i = 0; i < arrayToCheck.length; i++) {
			const val = arrayToCheck[i];

			// check that the value is not undefined or null
			if (val === undefined || val === null) {
				errsToR.push({field: dtdPath + '.' + i, message: 'Value cannot be undefined or null'});
				continue;
			}

			// check type
			if (mode === 'validate') { 
				if (!dtd.type.includes(val.constructor)) {
					errsToR.push({field: dtdPath + '.' + i, message: 'Type not allowed for this field'});
				}
				if (dtd.possibleValues && !this.isInPossibleValues(val, dtd.possibleValues)) {
					errsToR.push({field: dtdPath + '.' + i, message: 'The required value for this field, does not match with the given one'});
				}
			}

			// if array recursive check
			if (val.constructor === Array && dtd.type.includes(val.constructor)) {
				const errs = this.checkArrayDef(mode, val, dtd.arrayDef as IDtdTypes<any>, dtdPath + '.' + i);
				if (errs) { errsToR.push(...errs); }
			}
			// if a val is an object then check the object's required fields
			else if (val.constructor === Object && dtd.type.includes(val.constructor)) {
				const errs = this.checkObjDefArray(mode, val, dtd.objDef, dtdPath + '.arrayDef');
				if (errs) { errsToR.push(...errs); }
			} 
		}

		return errsToR.length === 0 ? undefined : errsToR;

	}

	/**
	 * Checks an array of possible dtd and returns void if one of them doesnt error
	 * @param mode The mode to check the obj array
	 * @param dtd The array of the dtd to check
	 * @param key The key of the field of which the value is being checked
	 * @param dtdPath The path to this point of the object tree
	 */
	private checkObjDefArray(
		mode: 'required' | 'validate', 
		val: object,
		dtd: (IVerifiableItemDtd<any> | String | Number | Boolean | NumberConstructor | StringConstructor | BooleanConstructor)[],
		dtdPath: string,
	): VerifyError[] | void {

		if (!dtd) { throw new Error('No objDef found in dtd declaration. dtdPath: ' + dtdPath); }

		const toR: VerifyError[][] = [];

		if (mode === 'required') {
			for (let i = 0; i < dtd.length; i++) {
				// no need to check required for hashmap, (unless the value is an object)
				// TODO add hashmap object check...
				if (typeof dtd[i] !== 'object')
					return;
				
				// if the objDef is an object (AKA NOT A HASHMAP), do deep check

				const errs = this.verifyRequired(val, dtdPath + '.objDef.' + i);
				if (errs) {
					toR.push(errs);
					continue;
				}
				
				// no other dtd to check 
				// this one is good
				if (dtd.length === 1)
					return;

				// if you have multiple object definition, 
				// one of the definition allows for a value with no field  => val: {}
				// amd another requires a value inside another object => val: {inObj: {a: "string"}}
				// then if the inObj.a value is missing there is no error => val: {inObj: {}} == NO ERROR !!!
				//
				// this ensures that the object inside the object are controlled too
				const objVals = Object.values(val).filter(v => typeof v === 'object');
				if (objVals.length === 0) { return; }
				
				const specialErrors: VerifyError[][] = [];
				for (const k in val) {
					if (dtd[i][k] && this.acceptsAnyType(dtd[i][k]))
						continue;

					if (val[k].constructor === Array) {
						// if no objDef then the value can't be an object
						if (!dtd[i][k] || !dtd[i][k].arrayDef) {
							specialErrors.push([{field: dtdPath + '.' + k, message: "Type not allowed for this field"}]);
						}
						else {
							// check the object normally
							const errsI = this.checkArrayDef(mode, val[k], dtd[i][k].arrayDef, dtdPath + '.' + k);
							if (errsI) { specialErrors.push(errsI); }
						}
					}
					else if (typeof val[k] === 'object') {
						// if no objDef then the value can't be an object
						if (!dtd[i][k] || !dtd[i][k].objDef) {
							specialErrors.push([{field: dtdPath + '.' + k, message: "Type not allowed for this field"}]);
						}
						else {
							// check the object normally
							const errsI = this.checkObjDefArray(mode, val[k], dtd[i][k].objDef, dtdPath + '.' + k);
							if (errsI) { specialErrors.push(errsI); }
						}
					}
				}

				
				if (specialErrors.length === 0)
					return;
				
				toR.push(...specialErrors);
			}
		}
		else {

			// flag that permits to push the error of the hashmap only once
			let hashMapErrorPushed = false;

			for (let i = 0; i < dtd.length; i++) {
				// if normal object deifition (AKA NOT HASHMAP)
				if (typeof dtd[i] === 'object') {
					const errs = this.internalVerifyAndCast(val, dtdPath + '.objDef.' + i);
					if (!errs) { return; }
					toR.push(errs);
				}
				// else is hashmap
				else if (dtd[i] !== 'any') {
					let errPresent = false;
					// check the allowed types
					for (const k in val) {
						// if the constructor is different
						if (val[k].constructor !== dtd[i]) {
							errPresent = true;
							break;
						}
					}

					// push error
					if (errPresent) {
						if (!hashMapErrorPushed) {
							toR.push([{field: dtdPath, message: 'The hashmap contains a value that is not allowed'}]);
							hashMapErrorPushed = true;
						}
					}
					// no error, then return
					else {
						return;
					}
				}
			}
		}

		if (toR.length === 0) {
			return;
		}
		else if (toR.length === 1) {
			return toR[0];
		}
		else {
			return [{field: dtdPath, message: 'The given object has multiple possible solution to the errors', possibleErrors: toR}];
		}
	}

	/**
	 * Checks if a value can be any type
	 */
	private acceptsAnyType(dtd: IDtdTypes | IDtdTypes[]): boolean {
		// if array
		if (dtd.constructor === Array) {
			for (const d of dtd as IDtdTypes[]) {
				return d.type.includes('any');
			}
		} 
		// if not array
		else {
			return (dtd as IDtdTypes).type.includes('any');
		}
	}

}

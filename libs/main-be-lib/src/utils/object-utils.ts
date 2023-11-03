import { MongoUtils } from "./mongo-utils";

export class ObjectUtils {
	/**
	 * splits a given path by "." and traverses safely the object
	 * @returns the end value of the path, or undefined if no value found
	 */
	static getValueByDotNotation(obj: any, path: string): any {
		const split = path.split('.');
		for (const p of split)
			obj = obj && obj[p];

		return obj;
	}

	/**
	 * splits a given path by "." and traverses safely the object
	 * If there is an end value, the it sets that value, otherwise nothing happens
	 * 
	 * // TODO remove return, it's useless
	 */
	static setValueByDotNotation(obj: any, path: string | string[], value: any): void {
		if (typeof path === 'string')
			return ObjectUtils.setValueByDotNotation(obj, path.split('.'), value);

		if (path.length === 1)
			return obj[path[0]] = value;

		if (path.length === 0)
			return obj;

		// force object type like mongodb
		if (typeof obj[path[0]] !== 'object')
			obj[path[0]] = {};

		return ObjectUtils.setValueByDotNotation(obj[path[0]], path.slice(1), value);
	}

	/**
	 * Checks if two arrays are different
	 * 
	 * @warning
	 * This version checks the arrays on by doing a shallow comparison
	 * if you need a deeper comparison use objectDifference
	 * 
	 * this function is primarly used for string | numbers | boolean
	 * because it's faster
	 * 
	 * @param sameOrder default = false\
	 * if the order of the items should be the same
	 */
	static areArraysEqual(arr1: any[], arr2: any[], sameOrder: boolean = false): boolean {

		// check length 
		if (arr1.length !== arr2.length) {
			return false;
		}

		// remove the reference, so you can splice
		arr1 = [...arr1];
		arr2 = [...arr2];

		// splicing after check, to be sure that each element
		// matches only ONCE in the other array
		// [1, 2, 2]
		// [1, 1, 2]
		// does not give error..
		if (sameOrder) {
			for (let i = 0; i < arr1.length; i++) {
				if (arr2.indexOf(arr1[i]) === i) { 
					return false; 
				}
				arr2.splice(i, 1);
			}
		}
		else {
			for (const c of arr1) {
				const idx = arr2.indexOf(c);
				if (idx === -1) { return false; }

				arr2.splice(idx, 1);
			}
		}

		return true;
	}

	/**
	 * Simple quick check
	 * @param opts.ignorePrivateFields DEFAULT: true \
	 * skips fields that start with underscore
	 * @param opts.skipObjectCheck DEFAULT: false \
	 * if TRUE => checks only the type and boolean values of the vars given \
	 * if FALSE => check recursevly that the two object are the same
	 */
	static areVarsEqual(v1: any, v2: any, opts: {ignorePrivateFields?: boolean, skipObjectCheck?: boolean} = {}): boolean {

		// diff type
		if ((Boolean(v1) !== Boolean(v2)) || (typeof v1 !== typeof v2)) {
			return false;
		}

		// primitive check
		if (typeof v1 !== 'object') {
			if (v1 !== v2) { return false; }
		}
		// now we know the two vars are the same type
		// so if the first is an object, then the second is too
		else if (opts.skipObjectCheck !== true && v1) {
			// check that they have the same keys
			if (!ObjectUtils.areArraysEqual(Object.keys(v1), Object.keys(v2))) {
				return false;
			}

			// now that we know they have the same keys
			// check that each key is the same
			for (const k in v1) {
				// skip private field
				if (opts.ignorePrivateFields) {
					if (k.indexOf('_') === 0) { continue; }
				}

				const eq = this.areVarsEqual(v1[k], v2[k], opts);
				if (!eq) { return false; }
			}
		}

		return true;
	}

	/**
	 * Compares deeply two object
	 *
	 * @warning
	 * if two arrays have the same elements, but in different order, it counts as error
	 * 
	 * @returns false if they are the same
	 * @returns an object with the fields and the value difference it has
	 *
	 * @param obj1 First object to compare
	 * @param obj2 Second object to compare
	 * @param opts.returnFullArray default true // input: [1, 2, 3], [1, 2, 4].  If param is true, then result is {2: 4}, if param is false, then result is [1, 2, 4]
	 * @param opts.ignorePrivateFields default false // skips field that starts with underscore
	 */
	static objectDifference(obj1: any, obj2: any, opts: {returnFullArray?: boolean, ignorePrivateFields?: boolean} = {}) {

		// check for type
		if (!obj1 || !obj2 || typeof obj1 !== typeof obj2) { throw new Error("Accepts only objects as values"); }


		// return the full array mode
		if (opts.returnFullArray && (obj1.constructor === Array || obj2.constructor === Array)) {
			const arr1: any[] = obj1.constructor === Array ? obj1 : [];
			const arr2: any[] = obj2.constructor === Array ? obj2 : [];

			if (arr1.length !== arr2.length) { 
				return obj2; 
			}

			for (let k = 0; k < arr1.length; k++) {

				if (opts.ignorePrivateFields && (k.toString()).indexOf('_') === 0) { 
					continue; 
				}

				// do a base non deep check
				if (!this.areVarsEqual(arr1[k], arr2[k], {skipObjectCheck: true})) {
					return arr2;
				}

				// now that we know they are equal
				// and if object that they have the same keys
				// we recursively check the objects
				else if (arr1[k] && typeof arr1[k] === 'object') {
					const kDiff = this.objectDifference(arr1[k], arr2[k], opts);
					if (kDiff) { return obj2; }
				}
			}

			return false;
		}


		// diff to return
		const diff: any = {};

		// check front-to-back and back-to-front
		for (const toCheck of [obj1, obj2]) {
			for (const k in toCheck) {

				if (opts.ignorePrivateFields && (k.toString()).indexOf('_') === 0) { continue; }

				// do a base non deep check
				if (!this.areVarsEqual(obj1[k], obj2[k], {skipObjectCheck: true})) {
					diff[k] = obj2[k];
				}
				// now that we know they are equal
				// and if object that they have the same keys
				// we recursively check the objects
				else if (obj1[k] && typeof obj1[k] === 'object') {
					const kDiff = this.objectDifference(obj1[k], obj2[k], opts);
					if (kDiff) { diff[k] = kDiff; }
				}
			}
		}

		return Object.keys(diff).length ? diff : false;
	}



	/**
	 * Returns a hashmap of "path: value" of an object
	 * example: {a: {b: {c: 0} } } becomes  {a.b.c: 0}
	 *
	 * NOTE: particular case where it doesnt work: {'a.b': 1, {a: {b: 2}}} becomes {a.b: 2} and NOT {a.b: 1, a.b: 2} (Obviously)
	 * @param object The object to transform
	 * @param traverseArray default => FALSE\
	 * TRUE: it traverses them to reach a primitive\
	 * FALSE: treats array as values
	 * @param emptyObjectAsValue default => FALSE\
	 * TRUE: if an end path is an empty objects then it traverses that path to search for inner primitive values
	 * FALSE: it treats the empty object as a value so it sets it\
	 */
	 static objToPathAndValueHM(object: object, traverseArray?: boolean, emptyObjectAsValue?: boolean) {

		const recursive = (o: any, prefix = '', toReturn: any = {}) => {
			for (const k in o) {
				// if an object or array
				// and that object has values
				// then traverse it
				if (o[k] && (o[k].constructor === Object || (traverseArray && typeof o[k] === 'object')) && (!emptyObjectAsValue || Object.keys(o[k]).length)) {
					recursive(o[k], prefix + k + '.', toReturn);
				}
				// else use the empty object as the value itself
				// or a non object value
				else {
					toReturn[prefix + k] = o[k];
				}
			}
			return toReturn;
		};

		return recursive(object);
	}
	/**
	 * Returns the path to a value in the object
	 * it returns the first matched path in the object
	 * 
	 * it does a strict "===" check, so if you are searching an object as a value inside another object
	 * you need to pass the first object as a reference
	 * 
	 * @param object The object where to search
	 * @param valueToFind The value to search in the object
	 * @param looseCheck WARNING COULD BE SLOW IF TRUE as it checks all objects multiple times \
	 * if true, then it chekcs the difference of the objects instead of a strict "===" check
	 */
	static getPathToValue(object: any, valueToFind: any, looseCheck?: true): string {
		// static getPathToValue<A extends boolean = false>(object: any, valueToFind: any, getAllMatches?: A): A extends true ? string[] : string {
	
		let toR: string = '';

		for (const k in object) {
				
			// find value so return to array
			if (object[k] === valueToFind || (looseCheck && ObjectUtils.areVarsEqual(object[k], valueToFind))) {
				toR += '.' + k;
				break;
			}

			// deeply check the objects
			if (object[k] && typeof object[k] === 'object') {
				const p = ObjectUtils.getPathToValue(object[k], valueToFind, looseCheck);
				if (p) {
					toR += '.' + k + '.' + p;
				}
			}

		}

		return toR ? toR.substr(1) : toR;
	}

	/**
	 * Copies the object by doing JSON.stringify and then JSON.parse on the object
	 *
	 *  !! WARNING !! Doesn't work for object with circular reference
	 * @returns a copy of the object you gave it
	 * @param toClone Object to clone
	 */
	static cloneDeepJSON<T = any>(toClone: T): T {
		return JSON.parse(JSON.stringify(toClone));
	}

	/**
	 * Clones the object by cylcing the properites one by one conversing properties like null and undefined
	 * @param toClone the boject to clone
	 */
	static cloneDeep<T extends Object = any>(toClone: T, circular = []): T {
		// primitive
		if (typeof toClone !== 'object')
			return toClone;

		// if we clone this it breaks
		if (MongoUtils.isObjectId(toClone))
			return toClone.toString() as any;

		// prevent circular dependency
		if (circular.includes(toClone))
			return toClone;
		circular.push(toClone);

		// array
		if (Array.isArray(toClone)) {
			const cloned: any = [];
			for (const k of (toClone as any))
				cloned.push(ObjectUtils.cloneDeep(k, circular));
			return cloned;
		}

		// object
		const cloned: any = {};
		for (const k in (toClone as any))
			cloned[k] = ObjectUtils.cloneDeep(toClone[k], circular);
		return cloned;
	}

	// /**
	//  * this function clones a class instance to an object, but it copies only the properties not functions
	//  * 
	//  * it supports circular references, 
	//  * 
	//  * @param toClone object clone
	//  */
	// static clonePrototypeToJson<T = any>(toClone: T): T {
	// 	throw new Error('not tested');

	// also this is broken
	// navigator.plugins[0][0].enabledPlugin === navigator.plugins[0][0].enabledPlugin[0].enabledPlugin
	// on chrome it's true
	// on safari it's false
	//
	// both pc

	// 	throw new Error('on recursive already passed instead of returnin the original object we should return the cloned relative object');
	// 	throw new Error('but if we do so, wont it be circular reference and so it cant be json straiangify() ?');


	// 	// we store all the objects we pass to prevent a circular references loop
	// 	let rectrack = [];
		
	// 	function _gen(o) {
			
	// 		// if we already passed the object, the we return it simply
	// 		if (rectrack.includes(o)) 
	// 			return o;
	// 		rectrack.push(o);


	// 		const r = {};
	// 		for (let i in o) {
	// 			const v = o[i]
		
	// 			// clone object
	// 			if (typeof v === 'object')
	// 				r[i] = _gen(v)
	// 			// ignore functions
	// 			else if (typeof v !== 'function')
	// 				r[i] = v
	// 		}

	// 		return r;
	// 	}

	// 	return _gen(toClone);
	// }

	/**
	 * Returns the index of a field that you are searching inside an array of objects
	 * @param array Array where to find the object
	 * @param field The field to match (if the field is 'a.b', the program will search a field named b inside the object in the field a)
	 * @param value The value that the field should match
	 */
	static indexOfByField(array: any[], field: string, value: any): number {
		for (let i = 0; i < array.length; i++) {
			if (ObjectUtils.getValueByDotNotation(array[i], field) === value) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Tranforms an array into a hashmap with a specified key
	 * @param array The array to transform
	 * @param keyPath The path in the object inside the array to use as the key
	 * @param valuePath The path for the value to set as the value in the hashmap, if omitted will set the object as value
	 */
	 static arrayToHashmap<A, T>(array: T[], keyPath: string, valuePath?: A): A extends string ? {[key: string]: any;} : { [key: string]: T} {
	 	const car = {};
		for (const cur of array) {
			const k = ObjectUtils.getValueByDotNotation(cur, keyPath as string);
			const key = k && k.toString();
			car[key] = valuePath ? ObjectUtils.getValueByDotNotation(cur, valuePath as any as string) : cur;
		}
		return car as A extends string ? {[key: string]: any;} : { [key: string]: T};
	}
	
	/**
	 * Controls that an array of object does not contain the same object more than once
	 * If it finds identical objects (by value) then it deletes one of them
	 * @param items the array of object to merge
	 * @returns another array emptied from duplicates
	 */
	static removeDuplicates<T>(items: T[]): T[] {

		if (items.length === 0) { return items; }

		// start with the first object
		const emptied = [items[0]];

		for (const i of items) {
			
			let alreadyInArray = false;
			for (const inArr of emptied) {
				if (inArr === i || this.areVarsEqual(inArr, i)) {
					alreadyInArray = true; 
					break;
				}
			}

			if (!alreadyInArray) { 
				emptied.push(i); 
			}

		}

		return emptied;
	}

	/**
	 * Checks the array to search for ANY value present in valuesToSearch, if it finds at least 1 item present
	 * then retursn true, else false
	 * @param whereToSearch The array where to search for the values
	 * @param valuesToSearch The values to search in the whereToSearch array
	 */
	static includesAnyOfArray(whereToSearch: any[], valuesToSearch: any[]): boolean {
		for (const v of valuesToSearch)
			if (whereToSearch.includes(v)) 
				return true;

		return false;
	}

	/**
	 * find() but starting at the end
	 * @param array The array to search
	 * @param condition The condition to apply
	 */
	static findLast<T extends any[]>(array: T, condition: (item: T extends Array<infer U> ? U : any) => any): T extends Array<infer U> ? U : any {
		return array[ObjectUtils.findLastIndex(array, condition)];
	}

	/**
	 * findIndex() but starting at the end
	 * @param array The array to serach
	 * @param condition The condition to apply
	 */
	static findLastIndex<T extends any[]>(array: T, condition: (item: T extends Array<infer U> ? U : any) => any): number {
		for (let i = array.length - 1; i !== -1; i--)
			if (condition(array[i]))
				return i;

		return -1;
	}

}

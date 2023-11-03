import { all } from "async";
import { UpdateFilter, ObjectId, Filter } from "mongodb";
import { VerifyError } from "../object-format-controller/communication-object.interface";
import { PatchOperation } from "./dtd";
import { Error403, Error422 } from "./errors/errors";
import { ObjectUtils } from "./object-utils";

export class MongoUtils {

	/**
	 * A regex that matches ObjectId.toString()
	 */
	public static objectIdRegex = /^[abcdef0123456789]{24}$/;

	/**
	 * Checks if an object is an objectId
	 */
	public static isObjectId(i: any): i is ObjectId {
		return i && Boolean(i instanceof ObjectId || (i._bsontype || '').toLowerCase() === 'objectid');
	}

	/**
	 * It simulates mongo default projections as closely as possible
	 * @param objs Array of items to project
	 * @param proj The projection to use 
	 */
	public static manualProjection(objs: object[], proj: any) {
		
		const type = MongoUtils.getProjectionType(proj as any);
		if (type === null) { return; }

		if (type === 0) {
			for (const o of objs) {
				for (const p in proj) {
					MongoUtils.negativeProj(o, p);
				}
			}
		}
		else {
			for (let i = 0; i < objs.length; i++) {
				
				// we need to keep this object out here 
				// so that each projection affect this object
				// as we pass it to the function
				const newO: object = {};
				for (const p in proj) {
					MongoUtils.positiveProj(newO, objs[i], p);
				}
				// reassign _id
				if (proj._id !== 0) { 
					(newO as any)._id = (objs[i] as any)._id; 
				}
				objs[i] = newO;

			}
		}
	}

	private static negativeProj(o: object, path: string) {

		// handle recursive array searches
		if (Array.isArray(o)) {
			if (o.length) {
				for (const i of o) {
					if (typeof i === 'object') {
						MongoUtils.negativeProj(i, path);
					}
				}
			}

			return;
		}

		// handle end paths
		if (!path.includes('.')) {
			delete o[path];
		}
		
		// handle recursive search
		else {
			const field = path.substr(0, path.indexOf('.'));
			const remPath = path.substr(path.indexOf('.') + 1);
			MongoUtils.negativeProj(o[field], remPath);
		}
	}

	private static positiveProj(toR: object, o: object, path: string): object {
		// handle recursive array searches
		if (Array.isArray(o)) {
			const arr = [];

			if (o.length) {
				for (let i = 0; i < o.length; i++) {
					if (typeof o[i] === 'object') {
						arr.push(MongoUtils.positiveProj(toR[i] || {}, o[i], path));
					}
				}
			}

			return arr;
		}

		// handle end paths
		if (!path.includes('.')) {
			if (path in o) {
				toR[path] = o[path];
			}
		}
		
		// handle recursive search
		else {
			const field = path.substr(0, path.indexOf('.'));
			const remPath = path.substr(path.indexOf('.') + 1);
			toR[field] = o[field] ? MongoUtils.positiveProj(toR[field] || {}, o[field], remPath) : {};
		}

		return toR;
	}
	
	/**
	 * as _id can be the opposite of the other projections
	 * here i just take the other keys value before _id
	 * if none is present i return _id
	 * @returns null if object is empty, else the value of the object
	 */
	public static getProjectionType(proj: {[path: string]: 1 | 0}): 1 | 0 | null {
		const k = Object.keys(proj);
		
		return k.length === 0 
			? null 
			: k[0] === '_id' 
				? proj[k[1] || k[0]] 
				: proj[k[0]];
	}

	/**
	 * This function merges projection and returns the most "negative" projection possible
	 * In other word. if the projcetions have 0, then they are ENFORCED and it is sure that the final projection
	 * will NOT have the negative given projection
	 * 
	 * BUT if a projection has a positive key, then it is ignored
	 * 
	 * The first given projection is the "base" projection where the merge starts, so all the projection in the first projection
	 * will be passed appropriately
	 * 
	 * THEREFORE the first projection should be the user given projection
	 */
	public static mergeProjection<T = any>(...projs: Array<{[A in keyof T]?: 1 | 0} & {_id?: 1 | 0}>): {[key: string]: 1 | 0} {
		if (projs.length === 0) { 
			return {}; 
		}

		// we use the first non empty projection
		let projToR = {...projs[0]};

		for (let i = 1; i < projs.length; i++) {
			
			const currProj = projs[i];
			const toRType = MongoUtils.getProjectionType(projToR);
			const currType = MongoUtils.getProjectionType(currProj);
			if (currType === null) { continue; }

			if (toRType === null) {
				// set only if the to add is negative
				if (currType === 0) {
					projToR = currProj;
				}
			}
			else if (toRType === 0) {
				// if the proj to add are also negative, then concat them
				if (currType === 0) { 
					projToR = {...projToR, ...currProj}; 
				}
				// if the proj to add are positive then simply ignore them
			} 
			// else if the projToR are positive
			else {
				// if the proj to add are negative, then make sure that the keys are not present
				if (currType === 0) { 
					for (const key in currProj) {
						if (typeof projToR[key] !== 'undefined') {
							delete projToR[key];
						}
					}
				}
				// if the proj to add are positive, add them
				else {
					projToR = {...projToR, ...currProj}; 
				}

			}

		}

		return projToR;
	}


	/**
	 * Checks if two projection are the same
	 */
	public static equalProjection(proj1: undefined | any, proj2: undefined | any): boolean {
		// case where btoh are undefined
		if (!proj1 && !proj2) { return true; }
		// case where one of the is undefined
		if ((!proj1 && proj2) || (proj1 && !proj2)) { return false; }
		// if different keys amount
		if (Object.keys(proj1).length !== Object.keys(proj2).length) { return false; }
		
		// check every key have same values in proj1 and proj2
		for (const k in proj1){
			if (proj1[k] !== proj2[k]) { return false; }
		}
		for (const k in proj2){
			if (proj2[k] !== proj1[k]) { return false; }
		}

		// are true
		return true;
	}

	/**
	 * When you have a projection like {"data.type": 1, "data": 1}\
	 * mongo throws an error "Path Collision" WACK\
	 * 
	 * this function fixes this error by deleting "data.type" as it's redundant
	 */
	public static fixProjectionsPathCollision(proj: object) {
		const allKeys = Object.keys(proj);

		// we just delete the keys that start with the same path but with dot, as they are the parents
		// of the current k
		for (const k in proj)
			if (allKeys.find(ref => k.indexOf(ref + '.') === 0))
				delete proj[k]
	}

	/**
	 * Transofrms a _id filter that has a string as a value into an object id
	 * @param reverse from object id to string id
	 */
	public static idToObjectId(filter: Filter<any>, reverse?: boolean) {

		function transform(p: string | ObjectId) {
			// reverse if object id
			if (reverse)
				return MongoUtils.isObjectId(p) 
					? p.toString() 
					: p;

			// parse to object id if string
			return typeof p === 'string' && MongoUtils.objectIdRegex.test(p)
				? new ObjectId(p)
				: p;
		}

		for (const k in filter) {
			if (k === '_id') {
				// delete if null value
				// and continue to search for other _id fields
				if (!filter[k]) { 
					delete filter[k];
					continue;
				}

				// simple value  ObjectId <--> string
				if (typeof filter[k] === 'string' || MongoUtils.isObjectId(filter[k])) {
					filter[k] = transform(filter[k]);
				}
				// complex values
				else {
					const key = Object.keys(filter[k])[0];
					// array
					// so stuff like $nin $in
					if (Array.isArray(filter[k][key])) {
						for (let i = 0; i < filter[k][key].length; i++) {
							filter[k][key][i] = transform(filter[k][key][i]);
						}
					}
					// simple object
					// so stuff like $ne $eq
					else {
						filter[k][key] = transform(filter[k][key]);
					}
				}
			}
			// if it's a special object ($or, $in, $elemMatch, ...etc)
			// then we need to go deeper
			else if (typeof filter[k] === 'object' && k[0] === '$') {
				// map array 1 by 1
				if (Array.isArray(filter[k])) {
					for (const i of filter[k])
						MongoUtils.idToObjectId(i, reverse);
				}
				// else pass complex object
				else {
					MongoUtils.idToObjectId(filter[k], reverse);
				}
			} 
		}
	}

	/**
	 * Generates the operations for mongodb from the patchoperation given
	 */
	public static generatePatchOpForMongo<A = any>(patchOps: PatchOperation<any>[]): null | UpdateFilter<A> {
		// create operations to do on DB
		const opsToDo: any = {
			$set: {},
			$unset: {},
			$push: {}
		};
		for (const op of patchOps) {
			
			// add set operation
			if (op.op === 'set') {
				opsToDo.$set[op.path] = op.value;
			} 
			// delete op
			else if (op.op === 'unset') {
				opsToDo.$unset[op.path] = "";
			}
			// add push
			else if (op.op === 'push') {
				// create new push array
				if (!opsToDo.$push[op.path]) {
					opsToDo.$push[op.path] = { $each: [op.value] };
				} 
				// push to push
				else {
					opsToDo.$push[op.path].$each.push(op.value);
				}
			} 
		}

		// remove an empty action object if the actions are empty
		for (const key in opsToDo) {
			if (Object.keys(opsToDo[key]).length === 0) {
				delete opsToDo[key];
			}
		}

		return Object.keys(opsToDo).length === 0 ? null : opsToDo;
	}


	/**
	 * Applies PatchOperations to a given object
	 * @throws Error422 if there is an error with the patching
	 * @param returnErrors instead of trhowing Error422 it returns the errors
	 */
	public static applyPatchOperationToObject(obj: object, patchOps: PatchOperation<any>[], returnErrors?: boolean): VerifyError[] | void {

		const errors: VerifyError[] = [];

		// update the be object with the new values
		for (const op of patchOps as PatchOperation[]) {

			switch (op.op) {

				case 'push':
					const targetArray = ObjectUtils.getValueByDotNotation(obj, op.path);
					// TODO add objectutils.setvaluebydotnotation to create the end array
					if (!targetArray) { errors.push({field: op.path, message: 'The path does NOT exists'}); break; }
					if (targetArray.constructor !== Array) { errors.push({field: op.path, message: 'The value is not an Array'}); break; }

					targetArray.push(op.value);
					break;

				case 'set':
					ObjectUtils.setValueByDotNotation(obj, op.path, op.value);
					break;

				case 'unset':
					// if inside an object
					if ((op.path as string).includes('.')) {
						// split the path to get the parameters parent
						const results = (op.path as string).match(/(.*)\.([^.]+$)/),
						pathToParent = results[1], 
						paramName = results[2];
						// get the object that contains the value
						const parentObj = ObjectUtils.getValueByDotNotation(obj, pathToParent);
						// delete the parameter required
						if (parentObj) {
							delete parentObj[paramName];
						}
					} 
					// else in the root of the object
					else {
						delete obj[op.path];
					}
					break;

			}
		}

		if (errors.length !== 0) {
			if (returnErrors) {
				return errors;
			} else {
				throw new Error422(errors);
			}
		}
	}

	/**
	 * as in the system we do only patch if the request is from the user, that means that we need to transform a put into a patch
	 * @param keepPrivate default = false\
	 * if true adds private fields to update too
	 */
	public static generatePatchOpFromDiff<T>(oldObject: T, newObject: T, keepPrivate?: boolean): PatchOperation<T>[] {

		const patchOps: PatchOperation<T>[] = [];
		
		// create a diference obj with be and fe objects
		const diff = ObjectUtils.objectDifference(oldObject, newObject, {returnFullArray: true});

		if (diff) {
			const toIter = ObjectUtils.objToPathAndValueHM(diff);
			for (const key in toIter) {

				// ignore special fields
				if (
					key === '_id' ||
					// if a fetched diff (could happen if it's not cleared or something)
					key.indexOf('.fetched') !== -1 || 
					// if a patch on an private field inside object
					(key as string).match(/(([^a-z]|^)_(?!id$|modelClass$))/i) || 
					// if a patch on a root private field
					(!keepPrivate && key.indexOf('_') === 0)
				) {
					continue;
				}

				// set or unset based on path value
				if (toIter[key] === undefined || toIter[key] === null) {
					patchOps.push({op: 'unset', path: key as keyof T, value: ""});
				} else {
					patchOps.push({op: 'set', path: key as keyof T, value: toIter[key]});
				}

			}
		}

		return patchOps;
	}

	// /**
	//  * Deletes all the private (^_) fields from the new item
	//  * and assigns thos found in from the reference item
	//  * @param referenceItem the item of which to read the values of the private fields
	//  * @param newItem the item where to set the fields
	//  */
	// public static reassignPrivateFields(referenceItem: any, newItem: any) {

	// }



	
}

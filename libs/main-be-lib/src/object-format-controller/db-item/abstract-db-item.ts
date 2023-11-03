import { Filter, Collection, Db, ObjectId, DeleteResult, InsertManyResult } from "mongodb";
import { Request } from "express";
import { LibAttribute, LibModelClass } from "../../utils/enums";
import { IVerifiableItemDtd } from '../dtd-declarer.dtd';
import { VerifiableObject } from '../verifiable-object.abstract';
import { RequestHelperService } from "../../services/request-helper.service";
import { Error401, Error403, GenError } from "../../utils/errors/errors";
import { AuthHelperService } from "../../services/auth-helper.service";
import { IBaseModel } from "../IBaseModel.dtd";
import { DBSaveReturnValue, FilterControlOpts, PatchOptions, PatchResult, SaveOptions } from '../dtd';
import { ObjectUtils } from "../../utils/object-utils";
import moment from "moment";
import { FetchableField } from "../fetchable-field";

export abstract class AbstractDbItem<T extends IBaseModel> extends VerifiableObject<T> {

	public abstract bePath: string;
	public abstract collName: string;
	public abstract modelClass: string;

	public abstract dtd: IVerifiableItemDtd<T>;

	public projectionToUse?: {[A in keyof this]: 1} | {[A in keyof this]: 0};

	/**
	 * Require physical location
	 */
	public requirePhysicalLocation = false;

	/**
	 * A flag that says if the document location is a required field or not
	 * // this is the origin of the creation of the document :D
	 */
	public requireDocumentLocation = true;

	/**
	 * IF false anyone can set this to global
	 */
	public requireDocumentLocationsFilter = true;

	/**
	 * Creates a date field if not present set to moment().unix()
	 */
	protected addDateField = false;


	getDtd() { 
		// add physical location dtd
		this.dtd.physicalLocation = { type: [String], required: this.requirePhysicalLocation };

		// add document location dtd
		this.dtd.documentLocation = { type: [String], required: this.requireDocumentLocation };

		// array of ids or (a single wildcard) to signal where the place can be viewed :D
		// this field will be alway present in the saved object
		// it is added in the preSave function
		// so here we can dont require this field
		this.dtd.documentLocationsFilter = {type: [Array], required: this.requireDocumentLocationsFilter, minArrN: 1, arrayDef: { 
			type: [String],
		}};

		if (this.addDateField && !this.dtd.date) { 
			this.dtd.date = {type: [Number], required: true}; 
		}

		return this.dtd; 
	}


	/**
	 * this function skips the private fields
	 */
	public canSkipField(fieldName: string): boolean {
		return fieldName[0] === '_' ;
	}

	/**
	 * Returns the databse to use
	 * 
	 * the function is present here to be overwritten\
	 * OR to use it withouth crud updates (i dont know why you should but ok)
	 */
	public getDbToUse(reqOrSlug: Request): Db {
		return RequestHelperService.getClientDbBySlug(reqOrSlug);
	}

	/**
	 * Returns the mongodb collection withouth CRUD updates enabled
	 */
	public getRawCollection(reqOrSlug: Request): Collection<any> { 
		const coll = this.getDbToUse(reqOrSlug).collection<T>(this.collName);

		// as we use STLSe and not mongoclient, the _id fields are not remapped, thus we do it manually
		if (!(coll as any).__insertManyOverride) {
			(coll as any).__insertManyOverride = true;
			const old = coll.insertMany.bind(coll);
			coll.insertMany = async (items, ...args) => {
				const d = await old(items, ...args);
				for (const idx in d.insertedIds)
					items[idx]._id = new ObjectId(d.insertedIds[idx]);
				(d as any).ops = items;
				return d;
			}
		}

		return coll;
	}

	/**
	 * Returns the mongo collection to use to operate on documents
	 * every create/update/delete action gets logged to the crud service
	 */
	public getCollToUse<X = any>(req: Request): Collection<X> {
		const coll = this.getRawCollection(req);
		
		// add a safe guard to ensure that when we execute bulk operations with no instrunction, there is no error
		if (!(coll as any).__bulkOvverride) {
			(coll as any).__bulkOvverride = true;
			const old = coll.bulkWrite.bind(coll);
			(coll as any).bulkWrite = async (ops: any[], ...opts: any) => ops.length === 0 ? AbstractDbItem.getEmptyDbSaveReturn() : old(ops, ...opts);
		}

		return coll;
	}

	/**
	 * Returns the NEXT incremental code of a collection, if the count is currently 0, it will return 1
	 * @param itemsToMap the amount of items that will be inserted (aka the amount to increment the counter)
	 * by defualt it is one
	 */
	protected async getNextIncrementalValue(reqOrSlug: Request, itemsToMap: number): Promise<number> {
		return (await this.getDbToUse(reqOrSlug).collection<{count: number}>(LibModelClass.Counters).findOneAndUpdate(
			{ _id: this.modelClass as any },
			{ $inc: { count: itemsToMap } },
			{
				// TODO add proper mongodb driver version
				['returnDocument' as any]: 'after',
				upsert: true,
			}
		)).count;
	}

	/**
	 * Executes some data modification and test before an object is saved
	 * 
	 * this functions should be dempotent as it's used for insert and update
	 * 
	 * @returns Error403 sometimes :D
	 */
	public preInsertFunction( req: Request, toSave: T[], options: SaveOptions = {} ): void | GenError {

		let docIdToSet: string;

		// get the info of the doc To Set
		const data = AuthHelperService.getAuthzBody(req);
		if (!data) return new Error401('Invalid Token received');

		const userLocs = data.locs;
		const allLocs = data.alllocs;
		const userWildCardLocs = userLocs.includes('*');

		// if the whole system has only 1 location
		if (allLocs && allLocs.length === 1) { 
			docIdToSet = allLocs[0];
		}
		// or if the user can access only 1 location
		// and it is NOT a wildcard
		else if (userLocs.length === 1 && userLocs[0] !== '*') { 
			docIdToSet = userLocs[0]; 
		}

		for (const s of toSave) {

			if (this.addDateField && !s.date) {
				s.date = moment().unix();
			}

			if (!s._created) {
				s._created = RequestHelperService.getCreatedDeletedObject(req);
			}
			
			// add document location if required
			if (!s.documentLocation && this.requireDocumentLocation && docIdToSet) {
				s.documentLocation = docIdToSet; 
			}

			// inherit physical Location from the document location
			if (!s.physicalLocation && this.requirePhysicalLocation && s.documentLocation) {
				s.physicalLocation = s.documentLocation; 
			}

			if ((!s.documentLocationsFilter || s.documentLocationsFilter.length === 0)) {
				// ensure the array alwasy exists
				s.documentLocationsFilter = [];

				// if the doc loc is not required, then we set to global by default, if value is not given
				if (!this.requireDocumentLocationsFilter) {
					s.documentLocationsFilter = ["*"];
				}
				// if the loc is required, then add the one in the object if present
				else if (s.documentLocation || docIdToSet) {
					s.documentLocationsFilter = [s.documentLocation || docIdToSet];
				}
			}

			// collapse as the other info are useless
			if (s.documentLocationsFilter.length !== 1 && s.documentLocationsFilter.includes("*")) {
				s.documentLocationsFilter = ['*'];
			}

			if (options.skipValidation !== true) {
				const errs = this.verifyObject(s);
				if (errs) { return new Error403(errs); }
			}


			// ensure locations are accessible
			if (options.allowAllLocations !== true) {

				// Physical
				if (s.physicalLocation) {
					if (allLocs && !allLocs.includes(s.physicalLocation))
						return new Error403("The documentLocation ID " + s.physicalLocation + " is not present in the locations of the system"); 
					if (!userWildCardLocs && !userLocs.includes(s.physicalLocation))
						return new Error403("The documentLocation ID " + s.physicalLocation + " set is not allowed to the user"); 
				}
				
				// Creation
				if (s.documentLocation) {
					if (allLocs && !allLocs.includes(s.documentLocation))
						return new Error403("The documentLocation ID " + s.documentLocation + " is not present in the locations of the system"); 
					if (!userWildCardLocs && !userLocs.includes(s.documentLocation))
						return new Error403("The documentLocation ID " + s.documentLocation + " set is not allowed to the user"); 
				}
	
				// Filter
				if (s.documentLocationsFilter.includes('*')) {
					if (!AuthHelperService.isAttributePresent(LibAttribute.canSetGlobalLocFilter, req) && this.requireDocumentLocationsFilter)
						return new Error403("User is not allowed to set global visibility on elements");
				} else {
					for (const l of s.documentLocationsFilter) {
						if (allLocs && !allLocs.includes(l))
							return new Error403("The documentLocationsFilter ID " + l + " is not present in the locations of the system"); 
						if (!userWildCardLocs && !userLocs.includes(l))
							return new Error403("The documentLocationFilter ID " + l + " is not allowed for the user"); 
					}
				}

			}

		}

	}

	public async prePatchFunction(req: Request, toSave: T, old: T, options: PatchOptions): Promise<void | T> {
		if (options.allowAllLocations !== true)
			if (!AuthHelperService.isAttributePresent(LibAttribute.canChangeDocLocFilter, req))
				if (!ObjectUtils.areArraysEqual(toSave.documentLocationsFilter, old.documentLocationsFilter))
					throw new Error403('The user is not allowed to change "documentLocation" field');
	}

	/**
	 * Checks that no key in an object to post has a private field (a field that start with the underscore)
	 * or special field with .
	 */
	public static checkNoPrivateFieldInObject(toSave: any): boolean {
		
		for (const key in toSave) {
			// check if there is an underscore at the beggining (and it's not modelclass or id)
			if (key.indexOf('_') === 0 || key.includes('.')) {
				return false; 
			}
			// check recursive obj
			if (toSave[key] && typeof toSave[key] === 'object') {
				if (!AbstractDbItem.checkNoPrivateFieldInObject(toSave[key])) {
					return false;
				}
			}
		}

		return true;
	}


	/**
	 * used to ensure during PUT there are no errors
	 * @param allowUndefinedInNew permits the newItem to remove the private fields
	 */
	public static ensurePrivateFieldsDidntChange(referenceItem: any, newItem: any, allowUndefinedInNew?: boolean): boolean {
		// ensure no new private fields are added
		for (const k in newItem) {
			// skip ids
			if (k === '_id')
				continue;
			
			// ensure the private field is equal
			if (k.indexOf('_') === 0) {
				if (!ObjectUtils.areVarsEqual(referenceItem[k], newItem[k]))
					return false;
			}
			// deep check non-private field
			else if (typeof newItem[k] === 'object' && newItem[k]) {
				const e = AbstractDbItem.ensurePrivateFieldsDidntChange(referenceItem[k] || {}, newItem[k], allowUndefinedInNew);
				if (!e)
					return false;
			}
		}

		// ensure all old fields are present
		for (const k in referenceItem) {
			if (k === '_id')
				continue;

			if (k.indexOf('_') === 0) {
				if (allowUndefinedInNew && typeof newItem[k] === 'undefined')
					continue;

				if (!ObjectUtils.areVarsEqual(referenceItem[k], newItem[k]))
					return false;
			}
			else if (typeof referenceItem[k] === 'object' && referenceItem[k]) {
				const e = AbstractDbItem.ensurePrivateFieldsDidntChange(referenceItem[k], newItem[k] || {}, allowUndefinedInNew);
				if (!e)
					return false;
			}

		}

		return true;
	}


	/**
	 * Sometimes it happens we forget to remove the .fetched field, so this function ensures the fields are deleted :]
	 */
	public static clearFetchedFields(obj: any) {
		for (const k in obj) {
			if (typeof obj[k] === 'object' && obj[k]) {
				// found the field
				if (
					((obj[k] as FetchableField<any>).fetched || obj[k].hasOwnProperty('fetched')) &&
					(obj[k] as FetchableField<any>).modelClass &&
					(obj[k] as FetchableField<any>).id
				) {
					delete obj[k].fetched;
				}
				// else its just a normal object so go ahead
				else {
					AbstractDbItem.clearFetchedFields(obj[k]);
				}
			}
		}
	}


	/**
	 * Contrls the filters by adding documentLocation filter
	 * and the _deleted field if necessary and some other stuff ???
	 */
	protected controlFilters(req: Request, filters: Filter<T> = {}, skipDeletedCheck?: boolean, opts: FilterControlOpts = {}): Filter<T> | false {

		// manage _deleted
		if (!skipDeletedCheck) {
			if (filters['_deleted'] === null)
				delete filters._deleted;
			else if (typeof filters['_deleted'] === 'undefined')
				filters['_deleted'] = {$exists: false};
		}

		// some queries filters are passed directly from the server
		// so when the user filters the stuff for the location he is seeing
		// the query does not take the information
		// so this is a fallback to ensure that if a user filters for a location
		// then that loctaion is added to the filters
		if (!filters.documentLocationsFilter && req.qs.globalDocumentLocationFilter && !opts.skipLocFilter)
			filters.documentLocationsFilter = {$in: [req.qs.globalDocumentLocationFilter, '*']} as any;

		if (!filters.documentLocation && req.qs.globalDocumentLocationContent && !opts.skipLocContent)
			filters.documentLocation = req.qs.globalDocumentLocationContent as any;

		// TODO add here a cast of _id from string to object

		/**
		 * Add document location filter
		 */
		const authzData = AuthHelperService.getAuthzBody(req);
		if (!authzData) return false;

		const userLocs = authzData.locs;
		const allLocs = authzData.alllocs;
		const documentLocFilter = filters.documentLocationsFilter;

		// if the  user can see every place
		if (userLocs.includes('*') || (allLocs && ObjectUtils.areArraysEqual(allLocs, userLocs)))
			return filters;

		// check if there is a filter on a docLoc
		if (typeof documentLocFilter === 'string')
			return userLocs.includes(documentLocFilter) ? filters : false;

		// TODO can be improved ??
		// check this (it was the previous version) eae50e3966ff666dd60e7b6ce4716f7e8b60f305
		// https://github.com/SStoliarchuk/main-be-lib/commit/eae50e3966ff666dd60e7b6ce4716f7e8b60f305

		// wrap the filters in an $and with magic
		// basically it cheks the or on the right, that maybe exists and in one of the permitted location
		// and then applies the user filters
		return { $and: [filters, {documentLocationsFilter: {$in: [...userLocs, '*']}}] } as Filter<T>;

	}


	/**
	 * Returns the base response for the mongo ops
	 */
	 protected static getEmptyDbSaveReturn<T = any>(): PatchResult & DeleteResult & InsertManyResult & DBSaveReturnValue<T> {
		return {
			insertedCount: 0, 
			insertedIds: {}, 
			matchedCount: 0, 
			modifiedCount: 0, 
			acknowledged: true,
			deletedCount: 0,
			upsertedCount: 0, 
			upsertedId: null,
			ops: [],
		};
	}


}

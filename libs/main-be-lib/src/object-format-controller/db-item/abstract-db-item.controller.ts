import { Filter, UpdateFilter, CountDocumentsOptions, ObjectId, FindOptions } from "mongodb";
import { Request } from "express";
import to from "await-to-js";
import { IVerifiableItemDtd } from '../dtd-declarer.dtd';
import { RequestHelperService } from "../../services/request-helper.service";
import { Error403 } from "../../utils/errors/errors";
import { PatchOperation } from "../../utils/dtd";
import { IBaseModel } from "../IBaseModel.dtd";
import { SaveOptions, ReplaceOptions, PatchOptions, DeleteOptions, PatchResult, DeleteResult, ReplaceResult, InsertResult, FindDbOptions, FindOneDbOptions, CountDbOptions, AggregateDbOptions, DBGetOptions, DBGetOptionsMethods, DBGetReturnValue, DBSaveOptions, DBSaveReturnValue, DBSaveOptionsMethods, RestoreDeletedOptions } from '../dtd';
import { AbstractDbItem } from './abstract-db-item';
import { MongoUtils } from '../../utils/mongo-utils';
import { ObjectUtils } from "../../utils/object-utils";
import { LogService } from "../../services/log.service";
import { CrudType } from "./crud-collection";

/**
 * This class has to be used with every object that is exposed to the FE
 * i.e. Every item that the user can post/patch
 * 
 * It has ESSENTIAL validation on both operations to ensure that the database
 * won't wbe malformed
 * 
 * 
 * if you give a db name in the constructor you can pass req in the db functions as null|undefined
 * 
 * TODO change the method names to transform this into a christian dao
 * saveToDb => insert_Db || insert_dao
 * patchSingle => updateOne_Db
 * findForUser => find_Db
 */
export abstract class AbstractDbItemController<T extends IBaseModel> extends AbstractDbItem<T> {


	public abstract bePath: string;
	public abstract collName: string;
	public abstract modelClass: string;

	public abstract dtd: IVerifiableItemDtd<T>;

	/**
	 * Creates a increamental value field called _progCode
	 */
	protected addIncrementalValue = false;

	/**
	 * This function returns the builded models
	 * if you need the cursor use findAndGetCursor()
	 * 
	 * @warning calls controlFilters
	 */
	public async findForUser(req: Request, filters?: Filter<T>, opts: FindDbOptions = {}): Promise<T[]> {
		return this.executeDbGet(req, filters, {method: 'find', base: opts});
	}
	
	/**
	 * @warning calls controlFilters
	 */
	public async findOneForUser(req: Request, filters?: Filter<T>, opts: FindOneDbOptions = {}): Promise<T> {
		return this.executeDbGet(req, filters, {method: 'findOne', base: opts});
	}

	/**
	 * @warning calls controlFilters
	 */
	public async countForUser(req: Request, filters?: Filter<T>, opts: CountDbOptions = {}): Promise<number> {
		return this.executeDbGet(req, filters, {method: 'count', base: opts});
	}

	/**
	 * @warning calls controlFilters
	 */
	public async aggregateForUser<A = T>(req: Request, pipeline: object[], opts: AggregateDbOptions = {}): Promise<A[]> {
		return this.executeDbGet(req, pipeline, {method: 'aggregate', base: opts});
	}

	/**
	 * Saves the items to the correct database after some checks
	 */
	public async saveToDb( req: Request, items: T[],  options: SaveOptions = {} ): Promise<InsertResult<T>>	{

		// no items inserte
		if (items.length === 0) { 
			return AbstractDbItemController.getEmptyDbSaveReturn();
		}

		// test
		if (!options.skipPresaveFn) {
			const errs = this.preInsertFunction(req, items as T[], options);
			if (errs) { throw errs; }
		}

		// add incremental
		if (this.addIncrementalValue) {
			let incremental = await this.getNextIncrementalValue(req, items.length);
			for (let i = items.length - 1; i > -1; i--) {
				items[i]._progCode = incremental;
				incremental--;
			}
		}

		// write to db
		const [errInsert, success] = await to(this.executeDbSave(req, {method: 'insert', base: options}, items as T[], undefined));
		if (errInsert) { throw errInsert; }

		return success;
	}

	/**
	 * Executes patch operation on a model
	 */
	public async patchSingle(req: Request, objFromBe: T, patchOps: PatchOperation<T>[], options: PatchOptions = {}): Promise<PatchResult> {

		if (patchOps.length === 0) {
			return AbstractDbItemController.getEmptyDbSaveReturn();
		}

		const cloned = ObjectUtils.cloneDeep(objFromBe);
		if (!options.skipVerifyPatchOps) {
			const errors = this.verifyPatchOps(cloned, patchOps, true);
			if (errors) { throw new Error403(errors); }
		}

		const [err, patchSuccess] = await to(this.executeDbSave(req, {method: "update", base: options}, cloned, objFromBe));
		if (err) { throw err; }
		
		return patchSuccess;
	}

	/**
	 * @WARNING This function does not actually calls mongo.replace
	 * instead it callss saveToDB or patchSingle\
	 * this is to prevent having to duplicate verification logic etc
	 * 
	 * so you should not override this function or really do anything with it
	 * you have to only add your custom logic to saveToDB/patchSingle :]\
	 * OR BETTER YET straight to executeDbSave() :D
	 * 
	 * if no item is matched\
	 * This function calls saveToDB if upsert === true\
	 * if an item is matched\
	 * This function calls patchSingle\
	 * 
	 * when this function modifies a target, then it updates only the NON PRIVATE FIELDS\
	 * so you can safely call it for User :]
	 */
	public async replaceItem__READ_DESCRIPTION( req: Request, filter: Filter<T>, doc: T, options: ReplaceOptions = {} ): Promise<ReplaceResult<T>> {

		// get be object
		const beObject = options.objFromBe || await this.findOneForUser(req, filter);

		// if object in be is present we patch it
		if (beObject) {
			const patchOperations = MongoUtils.generatePatchOpFromDiff(beObject, doc);

			const [err, done] = await to(this.patchSingle(req, beObject, patchOperations));
			if (err) { throw err; }

			return { matchedCount: 1, modifiedCount: 1, ops: [doc], upsertedCount: 0, upsertedId: null };
		}
		// create
		else {
			// if no upsert then we return
			if (!options.base || !options.base.upsert) {
				return { matchedCount: 0, modifiedCount: 0, ops: [], upsertedCount: 0, upsertedId: null, };
			}
			// if upsert, then we save it
			else {	
				const [errSave, doneSave] = await to(this.saveToDb(req, [doc]));
				if (errSave) { throw errSave; }
				return { matchedCount: 0, modifiedCount: 0, ops: doneSave.ops, upsertedCount: 1, upsertedId: doneSave.ops[0]._id as ObjectId} ;
			}
		}
	}


	/**
	 * @warning calls controlFilters
	 */
	public async deleteForUser(req: Request, filters: Filter<T>, options: DeleteOptions = {}): Promise<DeleteResult> {

		// check filters
		if (options.skipFilterControl !== true) {
			const updatedFilters = this.controlFilters(req, filters, true);
			if (!updatedFilters) { return {deletedCount: 0}; }
			filters = updatedFilters;
		}


		// completely remove
		if (options.completeDelete) {
			return options.deleteMulti === true 
				? this.getCollToUse(req).deleteMany(filters) 
				: this.getCollToUse(req).deleteOne(filters);
		}
		// set as deleted with update op
		else {
			const [err, done] = await to(options.deleteMulti === true 
				? this.getCollToUse(req).updateMany(filters, this.getDeletePatchOp(req, filters, options))
				: this.getCollToUse(req).updateOne(filters, this.getDeletePatchOp(req, filters, options))
			);
			if (err) { throw err; }

			return { deletedCount: done.modifiedCount };
		}
	}

	/**
	 * When an item is not completely removed, but only hidden with the _deleted field,
	 * then you can use this function to restore that item
	 */
	public async restoreDeletedForUser(req: Request, filters: Filter<T>, options: RestoreDeletedOptions = {}): Promise<DeleteResult> {

		throw new Error(`
			when restoring _deleted in any part of the system there is A LOT of trouble because i do not UNDO what i did in deleteForUser()
			for example in saleable model i delete the reserved product amounts..
			
			goddamn it...
			maybe we can solve it by creating a new copy if the document with saveToDb() but with the _id given from the old object
			and the we permanently delete the old object? could work. we should see.

			the process:
			1 find() 																				items to restore
			2 const bkp = ObjectUtils.cloneDeep([items]) 		to restore in case there is an error on save()
			3 processBeforeRestore() 												to delete fields and just patch the object for example the barcode possible conflicts in products
			4 getCollToUse().delete({the items to restore}) this is to be able to reinsert them with the same _id
			5 saveToDb([items])															we re-add the object as to trigger the executeDbSave() middlewares
			6 ???
			7 Profit.
		`);

		// // check filters
		// if (options.skipFilterControl !== true) {
		// 	const updatedFilters = this.controlFilters(req, filters, true);
		// 	if (!updatedFilters) { return {deletedCount: 0}; }
		// 	filters = updatedFilters;
		// }

		// const [err, done] = await to(options.restoreMulti === true 
		// 	? this.getCollToUse(req).updateMany(filters, this.getRestoreDeletedPatchOp(req, filters, options))
		// 	: this.getCollToUse(req).updateOne(filters, this.getRestoreDeletedPatchOp(req, filters, options))
		// );
		// if (err) { throw err; }

		// return { deletedCount: done.modifiedCount };
	}

	/**
	 * Returns the patch operation to use to mark a model as deleted
	 */
	protected getDeletePatchOp(req: Request, filters: Filter<T>, options: DeleteOptions = {}): UpdateFilter<T> | Partial<T> {
		return {
			$set: {_deleted: RequestHelperService.getCreatedDeletedObject(req) } 
		} as UpdateFilter<T>
	}

	/**
	 * Returns the patch operation to restore a _deleted model
	 */
	protected getRestoreDeletedPatchOp(req: Request, filters: Filter<T>, options: RestoreDeletedOptions = {}): UpdateFilter<T> {
		return { $unset: {_deleted: 1 as 1 } } as any as UpdateFilter<T>;
	}

	/**
	 * Finds the items that has to be deleted from the system
	 * used just as QOL 
	 */
	protected async findItemsToDelete(req: Request, filter: Filter<T>, options: DeleteOptions | RestoreDeletedOptions = {}): Promise<T[]> {
		// TODO maybe access the coll directly instead of passing throught find/findOne as it modifes the object
		if ((options as DeleteOptions).deleteMulti || (options as RestoreDeletedOptions).restoreMulti) {
			const [err, objsToDel] = await to(this.findForUser(req, filter, {skipDeletedControl: true, skipFilterControl: options.skipFilterControl}));
			if (err) { throw err; }
			return objsToDel;
		} 
		else {
			const [err, objsToDel] = await to(this.findOneForUser(req, filter, {skipDeletedControl: true, skipFilterControl: options.skipFilterControl}));
			if (err) { throw err; }
			// find one could be null, so we pass empty array instead of array with null in it
			return objsToDel ? [objsToDel] : [];
		}
	}

	
	//
	//
	//
	// these function are the ones called from all the other functions above
	// so if you're overriding, do it here
	//
	//
	//

	protected async executeDbGet<A extends DBGetOptionsMethods>(
		req: Request, 
		filterOrPipeline: A extends 'aggregate' ? object[] : Filter<T>, 
		opts: DBGetOptions<A>
	): Promise<DBGetReturnValue<A, T>> {

		// check filters
		if (opts.base.skipFilterControl !== true) {

			if (opts.method === 'aggregate') {
				const obj = filterOrPipeline.find(o => o.hasOwnProperty('$match'));

				const filters = obj ? obj['$match'] : {};
				const updatedFilters = this.controlFilters(req, filters, opts.base.skipDeletedControl, opts.base);
				if (!updatedFilters) { return [] as DBGetReturnValue<A, T>; }

				// update the filters
				if (obj) { 
					obj['$match'] = updatedFilters; 
				}
				// if no filter then we need to add one
				else { 
					filterOrPipeline.unshift({$match: updatedFilters}); 
				}
			}
			else {
	
				const skipDeleted = opts.method === 'findOne'
					? typeof opts.base.skipDeletedControl === 'undefined' ? true : opts.base.skipDeletedControl
					: opts.base.skipDeletedControl;
				
				const updatedFilters = this.controlFilters(req, filterOrPipeline as Filter<T>, skipDeleted, opts.base);
	
				if (!updatedFilters) { 
					switch (opts.method) {
						case 'count': return 0 as DBGetReturnValue<A, T>;
						case 'find' : return [] as DBGetReturnValue<A, T>;
						case 'findOne': return null as DBGetReturnValue<A, T>;
					}
					return;
				}
	
				filterOrPipeline = updatedFilters as any;

			}
		}

		// execute query
		switch (opts.method) {
			case 'count': 
				return this.getCollToUse(req).countDocuments(filterOrPipeline, opts.base.base as CountDocumentsOptions) as Promise<DBGetReturnValue<A, T>>;
			case 'find' : 
				return this.getCollToUse(req).find(filterOrPipeline, opts.base.base as FindOptions<any>).toArray() as Promise<DBGetReturnValue<A, T>>;
			case 'findOne':
				return this.getCollToUse(req).findOne(filterOrPipeline, opts.base.base as FindOptions<any>) as Promise<DBGetReturnValue<A, T>>;
			case 'aggregate':
				return this.getCollToUse(req).aggregate(filterOrPipeline as object[], opts.base.base).toArray() as Promise<DBGetReturnValue<A, T>>;
		}

	}

	/**
	 * @WARNING
	 * This function is used by patch/post/put so remember if you make an override and change data of the object to save
	 * make the override be **Idempotent**
	 * 
	 * to make changes, simply alter the object toSave and it will be magically updated
	 * :]
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, T>, 
		toSave: A extends "insert" ? T[] : T, 
		beObjInfo:  A extends "insert" ? undefined : T
	): Promise<DBSaveReturnValue<T>> {
		
		// write
		const _id = beObjInfo && new ObjectId(beObjInfo._id.toString());
		let dbRes: DBSaveReturnValue<T> = AbstractDbItemController.getEmptyDbSaveReturn();
		if (opts.method === 'insert') {
			dbRes = {
				...dbRes, 
				...(await this.getCollToUse(req).insertMany(toSave as T[])),
			};
		}
		else {
			// prepatch
			const ret = await this.prePatchFunction(req, toSave as T, beObjInfo, opts.base as PatchOptions);
			if (ret) toSave = ret as A extends 'insert' ? T[] : T;

			dbRes = {
				...dbRes, 
				...(await this.getCollToUse(req).replaceOne({_id}, {...toSave, _id})),
				ops: [toSave as T],
			};
			await LogService.logChange(req, this.modelClass, [beObjInfo], [toSave as T]);
		}
		
		return {...AbstractDbItemController.getEmptyDbSaveReturn(), ...dbRes};
	}


	/**
	 * This function is static as it's triggered by the crud-updates service
	 * we add this static just as a QOL to allow us to write the action inside the controller
	 * instead of doing each time CrudUpdatesService.registerAction(); etc..etc..
	 * 
	 * @warning
	 * When overriding in child remember to call the parent function always, by statically AbstractDbItemController.onCrudAction\
	 * because for now it's empty but in the future we probbably will move socket to main-be-lib
	 */
	public static onCrudAction(req: Request | string, type: CrudType, modelClass: string, ids: string[]) {
		// nothing
	}

}

import { UpdateResult, InsertManyResult, ObjectId, DeleteResult as _DeleteResult, FindOptions as MongoFindOptions, CountOptions, AggregateOptions } from "mongodb";
import { IBaseModel } from "./IBaseModel.dtd";


export interface FilterControlOpts {
	skipLocContent?: true, 
	skipLocFilter?: true,
}

interface BaseGetQueryOptions extends FilterControlOpts {
	// isFetching?: boolean;
	skipFilterControl?: boolean;
	skipDeletedControl?: boolean;
}
export interface FindDbOptions extends BaseGetQueryOptions {
	base?: MongoFindOptions<any>, 
}
export interface FindOneDbOptions extends BaseGetQueryOptions {
	base?: MongoFindOptions<any>, 
}
export interface CountDbOptions extends BaseGetQueryOptions {
	base?: CountOptions, 
}
export interface AggregateDbOptions extends BaseGetQueryOptions {
	base?: AggregateOptions, 
}


export interface PatchOptions {
	/**
	 * skips the check to see if a user is permitted to post the location of an objec
	 */
	allowAllLocations?: boolean;
	
	skipVerifyPatchOps?: boolean;
}

export interface SaveOptions {
	/**
	 * skips the check to see if a user is permitted to post the location of an objec
	 */
	allowAllLocations?: boolean;
	/**
	 * @default FALSE
	 */
	skipValidation?: boolean;
	/**
	 * @default FALSE
	 */
	skipPresaveFn?: boolean;
}

export interface ReplaceOptions {
	base?: {upsert?: boolean};
	objFromBe?: any;
	saveOptions?: SaveOptions;
}

export interface RestoreDeletedOptions {
	restoreMulti?: boolean;
	/**
	 * Useful for when you want to update _deleted withouth worrying about the visiblity of the end items for the user
	 */
	skipFilterControl?: boolean;
}

export interface DeleteOptions {
	completeDelete?: boolean;
	deleteMulti?: boolean;
	/**
	 * Useful for when you want to update _deleted withouth worrying about the visiblity of the end items for the user
	 */
	skipFilterControl?: boolean;
}

export interface PatchResult extends Pick<UpdateResult, 'matchedCount' | 'modifiedCount' | 'upsertedCount' | 'upsertedId'> { }
export interface InsertResult<T extends IBaseModel> extends Pick<InsertManyResult<any>, 'insertedCount' | 'insertedIds'> { ops: T[]; }
export interface DeleteResult extends Pick<_DeleteResult, 'deletedCount'> { }
export interface ReplaceResult<T extends IBaseModel> extends Pick<UpdateResult, 'matchedCount' | 'modifiedCount' | 'upsertedCount' | 'upsertedId'> { ops: T[]; }


export type DBGetOptionsMethods = "find" | "findOne" | "count" | "aggregate";
export type DBGetReturnValue<A extends DBGetOptionsMethods, T extends IBaseModel> = A extends 'find' ? T[] : A extends 'findOne' ? T : A extends 'count' ? number : any[];
export interface DBGetOptions<A extends DBGetOptionsMethods> {
	method: A;
	base: A extends 'find' ? FindDbOptions : A extends 'findOne' ? FindOneDbOptions : A extends 'count' ? CountDbOptions : AggregateDbOptions;
}

export interface DBSaveReturnValue<T> {
	matchedCount: number;
	modifiedCount: number;
	upsertedCount: number;
	upsertedId: null | ObjectId;
	insertedCount: number;
	ops: T[];
	insertedIds: { [key: number]: ObjectId };
}

export type DBSaveOptionsMethods = "insert" | "update";
// export type DBSaveOptionsMethods = "insert" | "patch" | "replace";
export interface DBSaveOptions<A extends DBSaveOptionsMethods, T> {
	method: A;
	// base: A extends 'insert' ? SaveOptions : A extends 'patch' ? PatchOptions : ReplaceOptions;
	base: A extends 'insert' ? SaveOptions : PatchOptions;
}

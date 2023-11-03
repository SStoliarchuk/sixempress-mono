import { Filter, FindOptions } from "mongodb";
import { Request } from "express";
import { GenError } from "../../utils/errors/errors";
import { PatchOperation, MongoDBFetch } from "../../utils/dtd";
import { IBaseModel } from "../../object-format-controller/IBaseModel.dtd";

export type MongoProjection<T> = (({[A in keyof T]?: 1} & {[key: string]: 1}) | ({[A in keyof T]?: 0} & {[key: string]: 0})) & {_id?: 1 | 0};
type aggSort<T> = {$sort: {[A in keyof T]?: 1 | -1} & {[key: string]: 1 | -1}};
type aggSkip = {$skip: number};
type aggLimit = {$limit: number};
type aggProject<T> = {$project: MongoProjection<T>};

export declare type aggQueryOpts<T> = {
	objs: Partial<(aggSort<T> & aggSkip & aggLimit & aggProject<T>)>, 
	arr: (aggSort<T> | aggSkip | aggLimit | aggProject<T>)[]
};

export interface RequestQueryParamsParsed {
	skip?: number;
	sort?: {[key: string]: 1 | -1};
	filter?: Filter<any>;
	limit?: number;
	projection?: object;
	options?: {fetch?: MongoDBFetch[]};
	fetch?: MongoDBFetch[];
	/**
	 * globally filter documentLocationFilter
	 */
	globalDocumentLocationFilter?: string;
	/**
	 * globally filter documentLocation
	 */
	globalDocumentLocationContent?: string;
	/**
	 * Used for get multi\
	 * if true it returns the total items in back end and the filtered items
	 */
	getCount?: boolean;
}

export interface RequestQueryParams {
	fetch?: string // JSON
	sort: string; // JSON
	skip?: string;
	filter?: string; // JSON
	limit?: string;
	projection?: string; // JSON
	options?: string; // JSON
	getCount?: string; // should be true
}


export interface IGetMulti<T extends IBaseModel> {

	skipFilters?: true,

	/**
	 * Ovveride the normal quey with a custom one
	 */
	customQuery?: (req: Request, filters: Filter<T>, qOpts: FindOptions<T>) => Promise<T[]>;
	/**
	 * Allows to iterate through the items resulted from the query
	 */
	middleware?: (req: Request, body: T[]) => void | Promise<void> | GenError;

	/**
	 * A custom count function of documents in the array
	 */
	customCount?: (req: Request, filters: Filter<T>) => Promise<number>;
	/**
	 * A custom count for the FILTERED objects in the result
	 * IF FALSE then there will be no count for the filtered items
	 */
	customCountFiltered?: false |  ((req: Request, filters: Filter<T>) => Promise<number>);
	/**
	 * Custom options for the query/count
	 * 
	 * it overrides the defaults only if the object is present in the returns
	 * {projection} => uses only the given projection
	 * {filters} => uses only the given filters
	 * {projection, filters} => uses both
	 */
	customOptions?: (req: Request, filtersToUse: Filter<T>) => CustomOptionsReturn<T> | Promise<CustomOptionsReturn<T>>;

}

export type CustomOptionsReturn<T> = {
	/**
	 * The filters for the get query
	 */
	filters?: Filter<T>,
	/**
	 * Query projection
	 */
	projection?: MongoProjection<T> | MongoProjection<T>[],
	/**
	 * If this is true, then it forces the given projections ignoring the user request projections
	 */
	forceProjections?: boolean
}

/**
 * Same
 */
export interface IGetSingle<T extends IBaseModel> {

	useId?: string | ((req: Request) => string);

	/**
	 * Allows to modify the result
	 */
	middleware?: (req: Request, body: T) => void | Promise<void> | GenError;
	
	/**
	 * @doc IGetMulti.customOptions
	 */
	customOptions?: IGetMulti<T>['customOptions'];

	/**
	 * Ovveride the normal quey with a custom one
	 */
	customQuery?: (req: Request, filters: Filter<T>, qOpts: FindOptions<T>) => Promise<T>;

}



export interface IPost<T extends IBaseModel> {
	
	skipPresaveFn?: boolean;
	/**
	 * Skips the validation of the object
	 */
	skipValidation?: boolean;
	/**
	 * If TRUE then when a user does a POST with an array it throws a 403
	 * If FALSE then nothing happens
	 * 
	 * DEFAULT: FALSE (undefined)
	 */
	denyArrayPost?: boolean;
	/**
	 * IF TRUE the post accepts only array as body
	 * IF FALSE accept everything
	 */
	acceptOnlyArray?: boolean;

	/**
	 * Allows you to alter the respone body of the request
	 */
	responseBody?: (saved: T | T[]) => any;
}

export interface IPut<T extends IBaseModel> {

}


export interface IPatch<T extends IBaseModel> {
	
	// TODO add this here OR add this to abstract-db-item in the dtd ????;
	// patchableFields?: MongoProjection;
	
	verifyPatchOp?: (req: Request, patchOp: PatchOperation<T>[]) => GenError | void | Promise<void>;
}


export interface IDelete<T extends IBaseModel> {

}

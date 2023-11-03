import { RequestParams } from "../request-service/request.dtd";
import { FetchableField } from "./dtd";

// export interface FetchableField<T> {
// 	id: string,
// 	modelClass: string,
// 	fetched?: T,
// }

export interface IBaseModel {
	_generatedFrom?: FetchableField<any>;
	_id?: string;
	_progCode?: number;
	_created?: IDeletedCreatedData;
	_deleted?: IDeletedCreatedData;
	date?: number;
	physicalLocation?: string;
	documentLocation?: string;
	documentLocationsFilter?: string[];
}

export interface IDeletedCreatedData {
	_timestamp: number;
	_author: FetchableField<any>;
}

export declare type DbObjectInfo<T> = {
	// fetch?: {}
};

export type DbObjectSettings<T> = {
	[A in keyof T]?: T[A] extends FetchableField<any> 
		? DbObjectInfo<T> 
		: T[A] extends object 
			? T[A] extends Array<any> 
				? T[A][0] extends FetchableField<any>
					? [DbObjectInfo<T>]
					: [DbObjectSettings<T[A][0]>]
				: DbObjectSettings<T[A]>
			: undefined
};

/**
 * the {_: 1} is used to fetch only the object withouth its content
 */
export type DbItemSchema<T> = {_: 1} | {
	[A in keyof T]?: 1 | (
		T[A] extends object
			? T[A] extends Array<any>
				? [DbItemSchema<T[A][0]>]
				: DbItemSchema<T[A]>
			: 1
	)
};


/**
 * Filter for get requests
 */
export type QueryFilter<T> = {[A in keyof T]: any} | {[key: string]: any};

/**
 * The way to fecth a field
 */
export interface QueryFetch<T> {
	field: keyof T | (string & {});
	projection?: { [key: string]: 1 } | { [key: string]: 0 };
}

export declare type QueryProjection<T> =
	({ [A in keyof T]?: 1 } & { [key: string]: 1 }) |
	({ [A in keyof T]?: 0 } & { [key: string]: 0 });


export interface QueryParameters<T> {
	/**
	 * Returns total and filterd count for get multi
	 */
	getCount?: true;
	/**
	 * globally filter documentLocationFilter
	 */
	globalDocumentLocationFilter?: string;
	/**
	 * globally filter documentLocation
	 */
	globalDocumentLocationContent?: string;

	filter?: QueryFilter<T>,
	projection?: QueryProjection<T>;
	limit?: number;
	skip?: number;
	fetch?: QueryFetch<T>[];
	sort?: { [key: string]: 1 | -1 };

	[key: string]: any;
}

export type ControllerQueryOpts<T> = 
	RequestParams<T> |
	Omit<RequestParams<T>, 'params' | 'filter'> & { 
		params?: Omit<RequestParams<T>['params'], 'fetch' | 'filter'> & {
			filter?: RequestParams<T>['params']['filter'] | RequestParams<T>['params']['filter'][],
			/**
			 * If `true` fetches all the fields
			 */
			fetch?: RequestParams<T>['params']['fetch'] | true,
			/**
			 * GraphQL like query
			 */
			schema?: DbItemSchema<T>,
		}
	}


export interface GetMultiReponse<T> {
	matchCount: number,
	data: T[],
}
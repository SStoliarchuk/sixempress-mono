import { IRequestResponse } from "../dtd";

export declare type IMongoProjection<T> = 
	({ [A in keyof T]?: 1 } & {[key: string]: 1}) |
	({ [A in keyof T]?: 0 } & {[key: string]: 0});

export interface BaseQueryParams<T> {
	options?: { fetch?: IMongoDBFetch<T>[] };
	projection?: IMongoProjection<T>;
	limit?: number;
	skip?: number;
	fetch?: IMongoDBFetch<T>[];
	/**
	 * Returns total and filterd count for get multi
	 */
	getCount?: true;
	sort?: {[key: string]: 1 | -1};
	/**
	 * globally filter documentLocationFilter
	 */
	globalDocumentLocationFilter?: string;
	/**
	 * globally filter documentLocation
	 */
	globalDocumentLocationContent?: string;
	[key: string]: any;
}

export interface IQueryStringParams<T> extends BaseQueryParams<T> {
	filter?: IUserFilter[];
}
export interface IQueryStringParamsSingleFilter<T> extends BaseQueryParams<T> {
	filter?: IUserFilter | IUserFilter[];
}

/**
 * The way to fecth a field
 */
export interface IMongoDBFetch<T> {
	field: keyof T | (string & {});
	projection?: {[key: string]: 1} | {[key: string]: 0};
}


/**
 * The patch operation format to pass to the BE
 */
export interface IPatchOperation<T> {
	op: 'set' | 'unset' | 'push';
	path: keyof T | (string & {});
	value: any;
}

/**
 * This is the definition of a field that can be fetched
 */
export class FetchableField<T> {

	public fetched?: T;

	constructor(
		public id: string,
		public modelClass: string,
		fetched?: T,
	) {
		if (fetched) { this.fetched = fetched; }
	}

}

/**
 */
export interface IUserFilter {
	[key: string]: any;
}

/**
 * Response object when you do a get on more elements
 */
export interface IGenControllerMultiGetResponse<T> {
	items: T[];
	// totalInBE: number;
	/**
	 * The total items with the filters given for the query
	 * if no number is available, it returns -1
	 */
	totalFiltered: number;

	/**
	 * The raw response object
	 */
	res: IRequestResponse,
}

export interface ControllerOpts {
	/**
	 * if the user selects a default location to view, and filter it by that location
	 * the generci-controller will add automatically the documentLocationFilter: {chosen-loc}
	 * to the request filter
	 * 
	 * @default true
	 */
	addAutomaticDocumentLocationFilter?: boolean;
}

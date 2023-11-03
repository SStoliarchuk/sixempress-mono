import { IQueryStringParamsSingleFilter } from "./controllers/dtd";

/**
 * The parameters available when executing a request with client-api.service
 */
export interface IClientApiRequestOptions<T> extends Omit<RequestInit, 'body'> {
	body?: any;
	/**
	 * Request Headers
	 */
	headers?: { [header: string]: string};
	/**
	 * Query parameters for the request
	 */
	params?: IQueryStringParamsSingleFilter<T>;
	/**
	 * The response type of the request
	 */
	responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
	/**
	 * Decides if to skip enabling the loading overlay. useful when there is another available loader
	 * DEFAULT: TRUE
	 */
	disableLoading?: boolean;
}

/** 
 * The response element of the client-api.service request
 */
export interface IRequestResponse {
	headers: Headers;
	body: any;
}

/**
 * The configurations for the request function in client-api.service
 */
export interface IRequestConfig extends Omit<IClientApiRequestOptions<any>, 'headers'>  {
	url?: string;
	method?: 'DELETE' | 'GET' | 'POST' | 'PUT' | 'PATCH';
	params: {[paramKey: string]: string | number};
	headers?: Headers;
}

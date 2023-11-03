export {};

export type WooRestApiVersion = 'wc/v3' | 'wc/v2' | 'wc/v1' | 'wc-api/v3' | 'wc-api/v2' | 'wc-api/v1';
export type WooRestApiEncoding = 'utf-8' | 'ascii';
export type WooRestApiMethod = 'get' | 'post' | 'put' | 'delete' | 'options';

export type WooBaseEndpoint = 'products';
export type WooFullEndpoint = 
	// | `products/${number}/variations`
	// | `products/${number}/variations/batch`
	// | `${WooBaseEndpoint}/${number}` 
	// | `${WooBaseEndpoint}`
	| `${WooBaseEndpoint}` 
	| (string & {})

/**
 * Woo REST API wrapper
 */
export declare class WooRestApi {
	classVersion: string;
	url: string;
	consumerKey: string;
	consumerSecret: string;
	wpAPIPrefix: string;
	version: WooRestApiVersion;
	encoding: WooRestApiEncoding;
	queryStringAuth: boolean;
	port: number;
	timeout: number;
	axiosConfig: any;

	/**
	 * Class constructor.
	 */
	constructor(opt: WooRestApiOptions | WooRestApi);
	/**
	 * GET requests
	 */
	get(endpoint: WooFullEndpoint, params?: any): Promise<any>;

	/**
	 * POST requests
	 */
	post(endpoint: WooFullEndpoint, data: any, params?: any): Promise<any>;

	/**
	 * PUT requests
	 */
	put(endpoint: WooFullEndpoint, data: any, params?: any): Promise<any>;

	/**
	 * DELETE requests
	 */
	delete(endpoint: WooFullEndpoint, params?: any): Promise<any>;

	/**
	 * OPTIONS requests
	 */
	options(endpoint: WooFullEndpoint, params?: any): Promise<any>;


	/**
	 * Set default options
	 */
	_setDefaultsOptions(opt: WooRestApiOptions): void;

	/**
	 * Parse params object.
	 */
	_parseParamsObject(params: any, query: any): WooRestApiQuery;

	/**
	 * Normalize query string for oAuth
	 */
	_normalizeQueryString(url: string, params: any): string;

	/**
	 * Get URL
	 */
	_getUrl(endpoint: string, params: any): string;

	/**
	 * Get OAuth
	 */
	_getOAuth(): any;

	/**
	 * Do requests
	 */
	_request(method: WooRestApiMethod, endpoint: string, data: any, params: any): Promise<any>;


}


/**
 * Options Exception.
 */
export declare class OptionsException {
	name: 'Options Error';
	message: string;
	constructor(message: string);
}

export interface WooRestApiOptions {
	/* 
	* Your Store URL, example: http://woo.dev/ 
	*/
	url: string;
	/* 
	* Your API consumer key 
	*/
	consumerKey?: string;
	/* 
	* Your API consumer secret 
	*/
	consumerSecret?: string;
	/* 
	* Custom WP REST API URL prefix, used to support custom prefixes created with the `rest_url_prefix filter` 
	*/
	wpAPIPrefix?: string;
	/* 
	* API version, default is `v3` 
	*/
	version?: WooRestApiVersion;
	/* 
	* Encoding, default is 'utf-8' 
	*/
	encoding?: WooRestApiEncoding;
	/* 
	* When `true` and using under HTTPS force Basic Authentication as query string, default is `false` 
	*/
	queryStringAuth?: boolean;
	/* 
	* Provide support for URLs with ports, eg: `8080` 
	*/
	port?: number;
	/* 
	* Define the request timeout 
	*/
	timeout?: number;
	/* 
	* Define the custom Axios config, also override this library options 
	*/
	axiosConfig?: any;
}

export interface WooRestApiQuery {
	[key: string]: string;
}


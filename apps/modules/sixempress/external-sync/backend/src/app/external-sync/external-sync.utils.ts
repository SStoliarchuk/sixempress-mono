import { ApiKeyService, Error503, HttpRequestService, RequestHelperService } from "@sixempress/main-be-lib";
import { Request, Response } from "express";
import { AxiosError, Method, AxiosRequestConfig, AxiosResponse } from "axios";
import { SyncConfigService } from "../external-sync/external-conn-paths/sync-config.service";
import { ExternalConnection } from "../external-sync/external-conn-paths/sync-config.dtd";
import { ErrorCodes } from "../enums/error.codes.enum";
import to from "await-to-js";
import { WPRemotePaths } from "./wordpress/woo.enum";
import { WooGetAggregateParams } from "./wordpress/woo.dtd";
import { log } from "./log";
import { FetchOptions, FetchResponse } from "@stlse/backend-connector/utilities-agnostic/src";


export class ExternalSyncUtils {

	/**
	 * The timeout after a syncSingleClient fails
	 * we keep it low due to the fact that we sync 1 item per time
	 */
	private static TIMEOUT_WOO_REQUEST_ERROR_MS = 180_000; // 3 min;

	private static clearConnCacheAfter = 60 * 60 * 1_000 // 1 hour;

	/**
	 * we keep a cache of the external connections as they are updated basically NEVER,
	 * but are used very often, aka on every row creation/modification
	 * 
	 * there is no worry about the invalidity of this cache as the appropriate slug gets deleted
	 * every time the multip config changes
	 */
	public static multipExternalConfigsCache: {
		[slug: string]: {last: number, conn: ExternalConnection[]},
	} = {};

	/**
	 * If the error is from axios or not
	 */
	public static isAxiosError(e: any): e is FetchResponse<any> {
		return Boolean(e && typeof (e as FetchResponse<any>).ok === 'boolean');
	}

	/**
	 * Returns true if the endpoint contacted is not reachable, and disables that endpoint
	 * @param e AxiosError to check
	 */
	public static isAxiosEndUnreachable(e: any): e is FetchResponse<any> {
		// 401 is if the api_key is not correct
		if (ExternalSyncUtils.isAxiosError(e)) 
			return e.status === 401 || e.status === 400 || e.status === 404;
		
		if (typeof e?.cause?.code === 'string')
			return e.cause.code === 'EAI_AGAIN' || e.cause.code === 'ENOTFOUND' || e.cause.code === 'ECONNREFUSED';

		return false;
	}

	/**
	 * Throws an error with the appropriate error code if it comes from axios
	 */
	public static createExternalRequestError(e: any) {
		// 401 means the api key was not accepted
		if (ExternalSyncUtils.isAxiosError(e) && e.status === 401)
			throw new Error503({
				code: ErrorCodes.externalEndpointNotAcceptingAPIKEY, 
				message: 'The endpoint is not configured with this system',
			});

		// unreachable server
		else if (ExternalSyncUtils.isAxiosEndUnreachable(e))
			throw new Error503({
				code: ErrorCodes.externalEndpointCannotBeReached, 
				message: 'The endpoint cannot be reached, check that your site is available and properly configured',
			});
		
		// other error
		throw e;
	}


	/**
	 * Returns the basic information about a sync request
	 * @note
	 * the returning object has an optional origin Url that is not present if the request is custom
	 * else if pretashop/woo etc the origin is present
	 * 
	 * we can use the originUrl info to update our endpoint in the system by checking the api key associated
	 * and if the origin url of that api key does not match, then we update it
	 * 
	 * BUT WHAT IF THE SAME API KEY IS USED IN MULTIPLE ORIGINS ?
	 * i think we should NOT update the sys conf dynamicall, and let the user handle it
	 */
	public static getRequestBaseInfo(req: Request): {slug: string, originUrl?: string} {
		const slug = RequestHelperService.getSlugByRequest(req);
		const originUrl = req.header('x-origin-url');

		return {slug, originUrl};
	}

	/**
	 * Returns all the external configuration for a specified slug
	 * 
	 * @warning
	 * if there is no configuration or not relative slug in db, then it returns empty array
	 */
	public static async getExternalConnections(req: Request, filterUse: false | Array<keyof ExternalConnection['useFor']>): Promise<ExternalConnection[]> {

		const slug = RequestHelperService.getSlugByRequest(req);

		// clear cache periodically
		if (ExternalSyncUtils.multipExternalConfigsCache[slug]) {
			const cache = ExternalSyncUtils.multipExternalConfigsCache[slug];
			const diff = new Date().getTime() - cache.last;
			if (diff > this.clearConnCacheAfter)
				delete ExternalSyncUtils.multipExternalConfigsCache[slug];
		}

		// add to cache if not present
		if (!ExternalSyncUtils.multipExternalConfigsCache[slug]) {
			log('EXT_CONFIG_CACHE', 'Cache not present for slug, refreshing', slug);
			const sysConf = await SyncConfigService.getConfigByReqOrSlug(req);
			log('EXT_CONFIG_CACHE', 'new cache configuration for slug', slug, sysConf);
			ExternalSyncUtils.multipExternalConfigsCache[slug] = {last: new Date().getTime(), conn: (sysConf?.externalConnections || []).filter(e => !e.isDisabled)};
		}

		const conn = ExternalSyncUtils.multipExternalConfigsCache[slug].conn;

		// return all
		if (filterUse === false)
			return conn;

		// filter by use purpose
		return conn.filter(ec => {
			// ensure all uses are enabled
			for (const k of filterUse) 
				if (!ec.useFor[k]) 
					return;

			return ec;
		});
	}

	/**
	 * Tries to find a corresponding external connection configuration for the given slug+apikey
	 */
	public static async getExternalConnectionInfo(req: Request, use: false | Array<keyof ExternalConnection['useFor']>, extOriginOrId: string): Promise<ExternalConnection | void> {
		const all = await ExternalSyncUtils.getExternalConnections(req, use);
		const conf = all.find(e => e.originUrl === extOriginOrId || e._id === extOriginOrId);
		return conf;
	}

	/**
	 * fix trailing slash that makes axios throw
	 */
	public static getPatchedExtConnUrl(extConn_or_url: ExternalConnection | string) {
		let url = typeof extConn_or_url === 'string' ? extConn_or_url : extConn_or_url.originUrl;
		if (url[url.length - 1] === '/') 
			url = url.slice(0, -1);

		return url;
	}

	/**
	 * sends a request to the end point
	 * @param ext External connection to use
	 * @param method The method to use
	 * @param url the url to call
	 * @param body additional body to send
	 */
	public static async requestToWoo<T>(req: Request, ext: ExternalConnection, method: Method, url: WPRemotePaths | (string & {}), body?: any, params: Omit<FetchOptions, 'params'> & {params?: Partial<WooGetAggregateParams>, forceJson?: boolean} = {}) {
		// TODO fetch the ext object
		// and check if it is still enabled before sending request
		// TODO add longer timeout

		if (!params.headers)
			params.headers = {};
		params.headers['x-api-key'] = ext.auth.apiKey;
		
		params.data = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD'
			? undefined 
			: body;

		const endpoint = ExternalSyncUtils.getPatchedExtConnUrl(ext) + url;

		const res = await HttpRequestService.placeholderFetch(req, method, endpoint, params);
		let response = res.data as T;

		if (typeof response !== 'object' && params?.forceJson !== false) {
			try { response = JSON.parse(response as any); }
			catch (e) { throw new Error('Expected json response, received: \n' + response); }
		}

		return response as T;
	}

	/**
	 * Returns void if working, otherwise returns the axios error
	 */
	public static async pingWoo(req: Request, slug: string, ext: ExternalConnection) {
		// TODO add longer timeout
		const [err, i] = await to<FetchResponse<any>, FetchResponse<any>>(HttpRequestService.placeholderFetch(
			req,
			'GET',
			ExternalSyncUtils.getPatchedExtConnUrl(ext) + WPRemotePaths.ping, 
			{headers: {'x-api-key': ext.auth.apiKey}}
		));

		// if unreachable then disable
		if (err && ExternalSyncUtils.isAxiosEndUnreachable(err))
			await SyncConfigService.disableExternalConnection(req, slug, ext._id);
		
		return err;
	}


}
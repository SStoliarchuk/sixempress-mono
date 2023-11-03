import { Method } from 'axios';
import to from "await-to-js";
// import {  } from '../../../types/hooks';
import { RequestParams as RequestOpts } from "./request.dtd";
import { LoadingOverlay } from "../../helper-components/loading-overlay/loading-overlay";
import { ConnectionStatus } from "../../utils/enums/fe-error-codes.enum";
import { BusinessLocationsService } from "../business/business-locations.service";
import { FetchOptions } from '@stlse/frontend-connector';

class _RequestService {

	/**
	 * Sends a request to the client api
	 */
	public static async client<T = any>(method: Method, endpoint: string, params?: RequestOpts<T extends Array<any> ? T[0] : T>) {
		params = await RequestService.preprocessOpts(params);
		return RequestService.request(method, endpoint, params, params && params.data);
	}

	/**
	 * Adds the necessary authorization to the request and other things
	 */
	private static async preprocessOpts(opts: RequestOpts = {}) {

		if (!opts.params)
			opts.params = {};
		
		//
		// add chosen location filter
		//
		if (BusinessLocationsService.chosenLocationId) {
			if (BusinessLocationsService.addChosenLocationFilter && opts.addChosenLocationFilter !== false)
				opts.params.globalDocumentLocationFilter = BusinessLocationsService.chosenLocationId;
			if (BusinessLocationsService.addChosenLocationContent && opts.addChosenLocationContent !== false)
				opts.params.globalDocumentLocationContent = BusinessLocationsService.chosenLocationId;
		}

		//
		// JSON string parameters
		//
		for (const p in opts.params) {
			if (typeof opts.params[p] === 'undefined')
				delete opts.params[p];
			else if (typeof opts.params[p] === 'object')
				opts.params[p] = JSON.stringify(opts.params[p]);
		}

		return opts;

	}

	/**
	 * Allows you to send an HTTP request outside
	 * @param method HTTP Method to use
	 * @param endpoint the endpoint to connect
	 * @param options Additional parameters for the request
	 * @param data The optional body to append
	 */
	public static async request<T = any>(method: Method, endpoint: string, options: RequestOpts<T> = {}, data?: any) {

		if (data)
			options.data = data
		if (!options.headers)
			options.headers = {};

		if (!options.disableLoading)
			LoadingOverlay.loading = true;

		const requestModule = await use_filter.sxmp_override_request_service_destination_module('', endpoint, options);
		const [e, d] = await to(use_action.stlse_request(method, endpoint, {module: requestModule, ...options as FetchOptions}));
		
		if (!options.disableLoading)
			LoadingOverlay.loading = false;

		if (!e)
			return d!;
		throw e;
	}

	/**
	 * Checks if the server and client are both online
	 */
	public static async checkConnectionStatus(): Promise<ConnectionStatus> {
		return use_action.stlse_request_check_connection();
	}

}

globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.RequestService = (globalThis.__sixempress.RequestService || _RequestService);
export const RequestService = globalThis.__sixempress.RequestService as typeof _RequestService;
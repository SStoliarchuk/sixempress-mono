import { FetchOptions, FetchResponse } from '@stlse/backend-connector';
import async from 'async';
import to from 'await-to-js';
import axios, { AxiosResponse, AxiosRequestConfig, Method } from 'axios';
import { Request } from 'express';

export class HttpRequestService {

	/**
	 * Allows you to send an HTTP request outside
	 * @param method HTTP Method to use
	 * @param endpoint The URL to contact
	 * @param data The optional body to append
	 * @param params Additional parameters for the request
	 */
	public static async request<T = any>(method: Method, endpoint: string, data?: any, params: AxiosRequestConfig & {dataRaw?: any} = {}): Promise<AxiosResponse<T>> {

		// https://stackoverflow.com/questions/47208440/axios-xmlhttprequest-is-sending-get-instead-of-post-in-production-environment
		if (endpoint[endpoint.length - 1] === '/')
			endpoint = endpoint.slice(0, -1);

    const options: AxiosRequestConfig = {
      url: endpoint,
			method: method,
			// timeout: 4000,
      responseType: "json",
			...params,
    };

		// raw data
		if (params.dataRaw) {
			options.data = params.dataRaw;
		}
		// json data
		else if (!options.data && data) {
			
			if (!options.headers)
				options.headers = {};
			
			if (!options.headers["Content-Type"])
      	options.headers["Content-Type"] = "application/json;charset=utf-8";

      options.data = JSON.stringify(data);
    }

		return axios(options);
  }


	public static async placeholderFetch(req: Request, method: string, endpoint: string, options: FetchOptions) {
		const [err, done] = await to(use_action.stlse_request(req, method, endpoint, options));
		
		if (err) {
			if (typeof (err as any).ok === 'boolean' && !(err as any).config)
				(err as any).config = {method, endpoint, options};
			
			throw err;
		}
		
		if (done && !(done as any).config)
			(done as any).config = {method, endpoint, options};
		
		return done;
	}

	/**
	 * Executes and array of async functions and then returns the mapped result
	 * Returns the mapped results in the same order you gave them
	 * @param requests an array of functions that return a promise
	 */
	public static forkJoinPromises<T = any>(requests: Promise<T>[]): Promise<T[]> {
		return new Promise<T[]>((resolve, reject) => {
			
			if (requests.length === 0) { return []; }

			async.map(requests, (singleRequest, callback) => {
				singleRequest.then(res => {
					callback(null, res);
				}, err => {
					callback(err);
				})
			}, (err, mappedResult) => {
				if (err) { reject(err); return; }
				resolve(mappedResult as T[]);
			});
			

		});
	}
		
}

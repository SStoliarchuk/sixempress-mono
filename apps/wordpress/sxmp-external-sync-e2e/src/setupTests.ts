import to from 'await-to-js';
import axios, { AxiosResponse, AxiosRequestConfig, Method } from 'axios';

function arrayContaining(sampleOrIgnore: any[] | boolean, sample?: any[]) {
	let ignore: boolean = false;
	if (typeof sampleOrIgnore === 'boolean') {
		ignore = sampleOrIgnore;
	} else {
		sample = sampleOrIgnore;
	}
	
	const tor = expect.arrayContaining(sample);

	if (!ignore) {
		const oldMatch = tor.asymmetricMatch.bind(tor);
		tor.asymmetricMatch = (function (...matchArgs) {
			if (matchArgs[0].length !== this.sample.length) {
				return false;
			}
			return oldMatch(...matchArgs)
		}).bind(tor);
	}

	return tor;
}

export const TestTools = {

	rawRequest: async <T = any>(method: Method, endpoint: string, data?: any, params: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> => {

		const options: AxiosRequestConfig = {
			url: endpoint,
			method: method,
			responseType: "json",
			...params,
		};
	
		// encode data to send
		if (data) {
			if (!options.headers) {
				options.headers = {};
			}
			
			options.headers["Content-Type"] = "application/json;charset=utf-8";
			options.data = JSON.stringify(data);
		}
	
		const [e, r] = await to(axios(options));
		if (e) {
			// console.log((e as any).response)
			throw e;
		}

		return r;
	},

	wait: (ms: number) => {
		return new Promise((r, j) => setTimeout(r, ms));
	},

	/**
	 * Array containing but ensures that the length matches
	 */
	arrayContaining: arrayContaining,
	ea: arrayContaining,
	eo: expect.objectContaining,

	apiRequest: <T = any>(method: Method, endpoint: string, data?: any, params: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> => {
		
		endpoint = 'http://localhost:8889/wp-json/' + endpoint;
		
		if (!params.headers)
			params.headers = {};
		params.headers['x-api-key'] = 'dh8a7sd69a7sd8ga7std87a6std9a7std8an7sd8ia7shn8d7ahtsd';

		return tt.rawRequest(method, endpoint, data, params);
	},



}
global.tt = TestTools;
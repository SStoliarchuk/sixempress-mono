import $ from 'jquery';

interface IRequestConfig {
 url: string;
 params: {[paramKey: string]: string | number};
 json: boolean;
 disableLoading: boolean;
 options?: {
	 body?: any;
	 method?: 'DELETE' | 'GET' | 'POST' | 'PUT' | 'PATCH';
	 headers?: Headers;
 };
}


export class ClientApiService {

	/**
	 * sends a get request to the back end
	 * @param action the action to request 
	 * @param params get parameters
	 * @param opts.json default => true\
	 * if to parse the request to json or not 
	 */
	public static async get(action: string, params?: {[key: string]: any}, opts: {json?: boolean, headers?: {[key: string]: string}} = {}) {
		return new Promise<any>((r, j) => {
			$.get({
				dataType: "text",
				url: window.__sxmpes.ajax_url,
				headers: opts.headers,
				data: { action: action, ...params },
				error: (err) => {
					j(err);
				},
				success: (response) => {
					if (!response) {
						return r(response);
					}

					let toGive = response;
					if ((response.toString() as string).match(/^[0-9]+$/)) {
						toGive = parseInt(response);
					}
					else if (opts.json !== false) {
						try { toGive = JSON.parse(response); }
						catch(e) {}
					}

					r(toGive);
				}
			});
		});
	}

}

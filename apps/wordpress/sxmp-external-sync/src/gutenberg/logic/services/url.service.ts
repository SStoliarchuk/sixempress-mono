export class UrlService {

	/**
	 * Returns the url get parameter searched for
	 * @param key the key of the param
	 * @param match optional match to pass for the param value before return
	 * @param opts.decode default true\
	 */
	public static getUrlParameter(key: string, match?: "number" | RegExp, opts: {decode?: boolean} = {}) {
		const params = window.location.href.split("?")[1];
		if (params) {
			// search
			for (const p of params.split("&")) {
				if (p.indexOf(key + "=") === 0) {
					
					let v = p.substr(key.length + 1);
					if (opts.decode !== false) {
						v = decodeURIComponent(v);
					}


					if (!match) { return v; }
					const regex = match === 'number' ? /^[0-9]+$/ : match;
					return v.match(regex) ? v : undefined;
				}
			};
		}
	}

	/**
	 * replaces the current url with the given parameters
	 * used for ajax requests
	 * 
	 * if you pass null/undefined, it will remove the key from the url
	 * 
	 * // TODO escape dots in the key param
	 * @param opts.encode default true\
	 */
	public static setUrlParameterValue(key: string, value: any, opts: {encode?: boolean} = {}) {
		// function stolen shamelessly from
		// https://stackoverflow.com/questions/7171099/how-to-replace-url-parameter-with-javascript-jquery
		// thank you stenix

		// remove
		if (value == null || value == undefined) { 
			return UrlService.removeUrlParameter(key); 
		}

		if (opts.encode !== false) {
			value = encodeURIComponent(value);
		}

		// add string
		let url = window.location.href;
    const pattern = new RegExp('\\b(' + key + '=).*?(&|#|$)');
    if (url.search(pattern) >= 0) {
			url = url.replace(pattern,'$1' + value + '$2');
		}
		else {
			url = url.replace(/[?#]$/,'');
			url = url + (url.indexOf('?') > 0 ? '&' : '?') + key + '=' + value;
		}
		
		// update
		UrlService.replaceUrl(url);
	}

	/**
	 * Removes the specified parameter from the url
	 */
	public static removeUrlParameter(key: string) {
		// function stolen shamelessly from
		// https://stackoverflow.com/questions/1634748/how-can-i-delete-a-query-string-parameter-in-javascript/25214672#25214672
		// thank you Jared
		UrlService.replaceUrl(window.location.href
			.replace(new RegExp('[?&]' + key + '=[^&#]*(#.*)?$'), '$1')
			.replace(new RegExp('([?&])' + key + '=[^&]*&'), '$1')
		);
	}

	/**
	 * Changes the current url
	 */
	public static replaceUrl(url: string) {
		if (window.history && window.history.replaceState) {
			window.history.replaceState({}, null, url)
		} 
		else if (window.location.replace) {
			window.location.replace(url)
		} 
		else {
			window.location.href = url;
		}
	}

}
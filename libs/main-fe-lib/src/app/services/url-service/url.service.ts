type Opts = {
	encodeOrDecode?: boolean,
	replace?: boolean
}

export type QueryType = 'query' | 'hash';

/**
 * Allows you to execute operations on the URL
 */
export class UrlService {

	private static MARKS = {
		['query' as QueryType]: {start: '?', divider: '&'},
		['hash' as QueryType]: {start: '#', divider: '.'},
	};

	/**
	 * Executes the get key on the url but on hash or query depending on type
	 */
	public static getUrlX(type: QueryType, key: string, match?: "number" | RegExp, opts: Opts = {}): string {
		const { start, divider } = UrlService.MARKS[type];

		const params = UrlService.getFullUrl().split(start)[1];
		if (!params) 
			return '';

		for (const p of params.split(divider)) {
			if (p.indexOf(key + "=") === 0) {
				
				const m = p.match(new RegExp('\\b(?:' + key + '=)(.*?)(?:&|#|$|\\'+divider+')'));
				let v = m ? m[1] : '';

				if (opts.encodeOrDecode !== false)
					v = decodeURIComponent(v);
				
				if (!match)
					return v;

				const regex = match === 'number' ? /^[0-9]+$/ : match;
				return v.match(regex) ? v : '';
			}
		}

		return '';
	}

	/**
	 * Executes the set key on the url but on hash or query depending on type
	 */
	public static setUrlX(type: QueryType, key: string, value: any, opts: Opts = {}): void {
		// function stolen shamelessly from
		// https://stackoverflow.com/questions/7171099/how-to-replace-url-parameter-with-javascript-jquery
		// thank you stenix

		// remove
		if (value !== 0 && !value) {
			return UrlService.removeUrlX(type, key, opts); 
		}

		if (opts.encodeOrDecode !== false) {
			value = encodeURIComponent(value);
		}

		const { start, divider } = UrlService.MARKS[type];

		// add string
		let url = UrlService.getFullUrl();
		const pattern = new RegExp(`([\\${start}\\${divider}]${key}=).*?(&|#|$|\\${start}|\\${divider})`);
		
    if (url.search(pattern) >= 0) {
			url = url.replace(pattern, '$1' + value + '$2');
		}
		else {
			const matchHash = url.match(/(\#.*)[?#]?/);
			const matchQuery = url.match(/(\?.+?)(?:#|$)/);

			let hashPart = matchHash ? matchHash[1] : '';
			let queryPart = matchQuery ? matchQuery[1] : '';
			if (type === 'hash') {
				hashPart = hashPart + (hashPart.includes(start) ? divider : start) + key + '=' + value;
			} else {
				queryPart = queryPart + (queryPart.includes(start) ? divider : start) + key + '=' + value;
			}

			url = url.replace(/([?#].*)|$/, queryPart + hashPart);
		}
		
		// update
		UrlService.setUrlXByOpts(type, url, opts);
	}


	/**
	 * Executes the remove key on the url but on hash or query depending on type
	 */
	public static removeUrlX(type: QueryType, key: string, opts: Opts = {}) {
		const { start, divider } = UrlService.MARKS[type];
		
		// function stolen shamelessly from
		// https://stackoverflow.com/questions/1634748/how-can-i-delete-a-query-string-parameter-in-javascript/25214672#25214672
		// thank you Jared
		UrlService.setUrlXByOpts(
			type,
			UrlService.getFullUrl()
				.replace(new RegExp(`[\\${start}\\${divider}]${key}=[^\\${divider}&#]*(#.*)?$`), '$1')
				.replace(new RegExp(`([\\${start}\\${divider}])${key}=[^\\${divider}]*\\${divider}`), '$1'),
			opts
		);
			
	}

	/**
	 * Out here for testing
	 */
	private static getFullUrl(): string {
		return window.location.href;
	}

	/**
	 * Pushes/Replaces the url based on the opts
	 * @param url Url to set
	 * @param opts options to check
	 */
	private static setUrlXByOpts(type: 'hash' | 'query', url: string, opts: Opts) {
		if (opts.replace)
			UrlService.replaceUrl(url);
		else
			UrlService.pushState(url);


		// // we need to manually fire hashchange as the browser only does so with `location.hash = `
		// if (type === 'hash')
		// 	window.dispatchEvent(new Event('hashchange'));
	}

	/**
	 * moves the current url
	 */
	public static pushState(url: string) {
		if (window.location.href === url) 
			return;

		if (window.history && window.history.pushState) {
			window.history.pushState({}, '', url)
		} 
		else {
			window.location.href = url;
		}
	}

	/**
	 * Changes the current url
	 */
	public static replaceUrl(url: string) {
		if (window.location.href === url) 
			return;

		if (window.history && window.history.replaceState) {
			window.history.replaceState({}, '', url)
		} 
		else if (window.location.replace) {
			window.location.replace(url)
		} 
		else {
			window.location.href = url;
		}
	}

}
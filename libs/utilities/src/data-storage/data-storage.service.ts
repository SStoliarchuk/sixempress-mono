
declare type safeReturnTypes = "object" | 'boolean' | 'number' | 'string';

declare type safeReturnObject<A extends safeReturnTypes> = {
	"object": any,
	"boolean": boolean,
	"number": number,
	"string": string,
}[A];


// declare type safeReturnObject<A = safeReturnTypes> = 
// A extends 'object' ? any : 
// A extends 'boolean' ? boolean : 
// A extends 'number' ? number :
// A extends 'string' ? string : void;

/**
 * Creating a class for when the browser doesn't allow cookies
 * and so the sessionStorage and localStorage are disabled
 */
class _DataStorageService {

	private static cookiesEnabled: boolean; 

	private static _sessionStorage: {[key: string]: string} = {};
	private static _localStorage: {[key: string]: string} = {};


	static get sessionStorage() {
		return DataStorageService.getStorageHandler('sessionStorage', DataStorageService._sessionStorage);
	}

	static get localStorage() {
		return DataStorageService.getStorageHandler('localStorage', DataStorageService._localStorage);
	}

	/**
	 * this functions parses numbers/objects/booleans and if it fails, it deletes the key because it means it has errored
	 * 
	 * @param key the cache key for that storages value
	 * @param type the type of the value to cast the key to
	 * @param storage the storage that contains the values to search, defaults to localstorage
	 */
	static getSafeValue<A extends safeReturnTypes>(key: string, type: A, storage: 'localStorage' | 'sessionStorage' = 'localStorage'): undefined | safeReturnObject<A> {
		
		const v = DataStorageService[storage].getItem(key);
		if (!v)
			return undefined;


		// set the item to the correct type
		switch (type) {
			case 'boolean':
				if (v === 'true')
					return true as safeReturnObject<A>;
				else if (v === 'false')
					return false as safeReturnObject<A>;

				break;

			case 'number':
				const n = parseInt(v);
				if (Number.isSafeInteger(n))
					return n as safeReturnObject<A>;
				break;

			case 'object':
				try { 
					return JSON.parse(v) as safeReturnObject<A>;
				} catch (e) { }
				break;

			case 'string':
				return v as safeReturnObject<A>;
		}


		// if the cases did not match
		// or the item was not succesfully converted to type
		// then the cached value has an error in it
		// so we delete it
		DataStorageService[storage].removeItem(key);
		return undefined;
	}


	/**
	 * automatically converts the value to string if supported, and sets in storage
	 * 
	 * @param key the key to use
	 * @param value the value to set, if null or undefined it removes the value
	 * @param storage The storage to use, defaults to local
	 */
	public static set<T>(key: string, value: T, storage: 'localStorage' | 'sessionStorage' = 'localStorage'): T {

		if (value === null || value === undefined)
			DataStorageService[storage].removeItem(key);

		const toSave = typeof value === 'object'
			? JSON.stringify(value)
			: String(value);

		DataStorageService[storage].setItem(key, toSave);

		return value;
	}

	/**
	 * Checks if the cookies are enabled or no
	 */
	static canAccessBrowserStorage(): boolean {
		DataStorageService.cookiesEnabled = true;
		
		try {
			window.localStorage.getItem('1');
			if (!window.localStorage) { throw new Error(); }
		} catch (e) {
			DataStorageService.cookiesEnabled = false;
		}

		return DataStorageService.cookiesEnabled;
	}

	/**
	 * returns the window.storage item or the internal classItem based on the active/deactive state of the cookies
	 * @param windowItem window.localStorage or window.sessionStorage
	 * @param classItem the window item corresponding element: DataStorageService._localStorage or DataStorageService._sessionStorage
	 */
	private static getStorageHandler(windowItem: 'localStorage' | 'sessionStorage', classItem: {[key: string]: string}): Storage {

		if (DataStorageService.cookiesEnabled === undefined) { DataStorageService.canAccessBrowserStorage(); }
		
		if (DataStorageService.cookiesEnabled) {
			return window[windowItem];
		}

		return {
			clear: () => { for (const k in classItem) { delete classItem[k]; } },
			getItem: (key: string) => classItem[key],
			key: (index: number) => Object.keys(classItem)[index],
			length: Object.keys(classItem).length,
			removeItem: (key: string) => delete classItem[key],
			setItem: (key: string, value: string) => classItem[key] = typeof value === 'string' ? value : JSON.stringify(value),
			...classItem
		};

	}


}


globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.DataStorageService = (globalThis.__sixempress.DataStorageService || _DataStorageService);
export const DataStorageService = globalThis.__sixempress.DataStorageService as typeof _DataStorageService;
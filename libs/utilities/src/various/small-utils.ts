
type SwitchMapReturn<T> = T & { 
	/**
	 * Blocks the switch map from resolving the current last request
	 */
	dropCurrent: () => void,
}

/**
 * This is a class that contains various small function that are yet to know their place
 * or are just generic stuff
 */
export class SmallUtils {

	static priceRegexString = '^[0-9]+.[0-9]{1,2}$';
	static priceRegex = new RegExp(SmallUtils.priceRegexString);
	static fullPriceRegex = new RegExp('(' + SmallUtils.priceRegexString + ')|(^[0-9]+$)');

	/**
	 * This function returns a color from a given palette
	 * if no idx param is given, then returns the whole array
	 * @param idx The index of the color to return, can be any number as the colors array will be cycled
	 */
	static getColor(idx?: number): string | string[] {
		const cols = ['#FF6384', '#36A2EB', '#FFCE56', '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#3B3EAC', '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395', '#994499', '#22AA99', '#AAAA11', '#6633CC', '#E67300', '#8B0707', '#329262', '#5574A6', '#3B3EAC'];
		if (idx === undefined) { return cols; }
		return cols[idx % cols.length];
	}


	/**
	 * Returns a debounced function
	 * 
	 * usage:\
	 * private debounced = debounce(400, (n: number) => {});\
	 * and then\
	 * this.debounced(123);
	 * 
	 * @param time the time to debounce
	 * @param cb the function to execute at the end of the debounce
	 * @param maxTime if a function is called a lot, we use this number to ensure that there is a max delayed time
	 */
	public static debounce<T extends Function>(time: number, cb: T, maxTime?: number): T {
		let timeout: NodeJS.Timeout;
		let maxTimeout: NodeJS.Timeout;
		
		const call = (...args) => {
			// ensure we clear both timeouts as the function is now being called
			// and it could be called from any of the two timeouts
			clearTimeout(timeout);
			clearTimeout(maxTimeout);

			// call the function
			cb(...args);
		}

    return ((...args) => {
			// add a max timeout
			if (maxTime && !maxTimeout)
				maxTimeout = setTimeout(() => call(...args), maxTime);

			// debounce by replacing the timeout
			clearTimeout(timeout);
			timeout = setTimeout(() => call(...args), time);
    }) as any;
	}


	/**
	 * similar  functionality to "switchMap" of rxjs
	 * @param cb The callback to execute
	 */
	public static switchPromise<T extends (...args: any[]) => Promise<any>>(cb: T): SwitchMapReturn<T> {
		let lastKeyTriggered: number;
		
		const fn: SwitchMapReturn<T> = ((...args: any[]) => {
			const key = Math.random();
			return new Promise((r, j) => {
				lastKeyTriggered = key;

				cb(...args)
					.then((...res) => key === lastKeyTriggered && r(...res))
					.catch((...err) => key === lastKeyTriggered && j(...err))
			});
		}) as any;

		// add additional controls
		fn.dropCurrent = () => lastKeyTriggered = undefined;

		return fn;
	}

	/**
	 * Returns the selected text in the DOM
	 */
	public static getTextSelection(): string {
		let text = '';
		let activeEl = document.activeElement as any;
		let activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
		if (
			(activeElTagName == "textarea") || (activeElTagName == "input" &&
				/^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
			(typeof activeEl.selectionStart == "number")
		) {
			text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
		}
		else if (window.getSelection) {
			text = window.getSelection().toString();
		}
		else if ((document as any).selection && (document as any).selection.type != "Control") {
			text = (document as any).selection.createRange().text;
		}
		
		return text || '';
	}

}

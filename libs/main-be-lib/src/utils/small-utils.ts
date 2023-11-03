export class SmallUtils {

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


}
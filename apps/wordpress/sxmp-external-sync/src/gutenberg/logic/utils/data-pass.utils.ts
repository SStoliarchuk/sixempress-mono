export class DataPass {

	/**
	 * Returns a debounced function
	 * @param time the time to debounce
	 * @param cb the function to execute at the end of the debounce
	 */
	public static debounce<T extends Function>(time: number, cb: T): T {
		let timeout: NodeJS.Timeout;
    return ((...args) => {
			const context = this;
			clearTimeout(timeout);
			timeout = setTimeout(() => cb.apply(context, args), time);
    }) as any;
	}

}

type ArgsToVoidFunction<Args extends Array<any>> = (...a: Args) => any | Promise<any>;

/**
 * RXJS Subject + EventListener = this
 * 
 * can register async functions or normal functions that will be awaited if needed by doing `await emit()`;
 */
export class ActionRegister<Args extends Array<any> = []> {

	private actions: ArgsToVoidFunction<Args>[] = [];

	constructor(initalFns?: ArgsToVoidFunction<Args>[]) {
		if (initalFns)
			for (const fn of initalFns)
				this.registerAction(fn);
	}
	
	public registerAction = (fn: ArgsToVoidFunction<Args>) => {
		if (!this.actions.includes(fn)) {
			this.actions.push(fn);
		}
	}

	public removeAction = (fn: ArgsToVoidFunction<Args>) => {
		const idx = this.actions.indexOf(fn);
		~idx && this.actions.splice(idx, 1);
	}

	/**
	 * You can wait for async functions by doing `await emit()`
	 */
	public emit = async (...args: Args) => {
		const promises: Promise<any>[] = [];
		
		// we process all in parallel to execute each function different function
		// with no delay between calls
		// and stores the Promises that later will be awaited
		//
		// this allows us to know that each time we emit, all the sync functions are surely triggered
		for (const a of this.actions) {
			const r = a(...args);

			if (r instanceof Promise)
				promises.push(r);
		}

		// wait for the promises
		if (promises.length)
			await Promise.all(promises);
	}

}

type ArgsToVoidFunction<Args extends Array<any>> = (...a: Args) => any | Promise<any>;

export interface ActionEmitter<Args extends Array<any>> {
	(...args: Args): void | Promise<void>,
	addListener: (fn: ArgsToVoidFunction<Args>) => void,
	removeListener: (fn: ArgsToVoidFunction<Args>) => void,
}

// hide some fields as we cannot use private/protected on interface
interface PRIVATE_ActionEmitter<Args extends Array<any>> extends ActionEmitter<Args> {
	actions: Set<ArgsToVoidFunction<Args>>,
}

function _ActionEmitter(inital: ((...args: any[]) => any)[] = []) {
	const f = (...args: any[]): void | Promise<any> => {
		const promises: Promise<any>[] = [];
		// we process all in parallel to execute each function different function
		// with no delay between calls
		// and stores the Promises that later will be awaited
		//
		// this allows us to know that each time we emit, all the sync functions are surely triggered
		(f as PRIVATE_ActionEmitter<any>).actions.forEach(a => {
			const r = a(...args);

			if (r instanceof Promise)
				promises.push(r);
		});

		// allow to wait for the promises
		if (promises.length)
			return Promise.all(promises);
	}

	(f as PRIVATE_ActionEmitter<any>).actions = new Set();
	for (const i of inital)
		(f as PRIVATE_ActionEmitter<any>).actions.add(i);

	Object.setPrototypeOf(f, _ActionEmitter.prototype);

	return f;
}

_ActionEmitter.prototype.addListener = function (this: PRIVATE_ActionEmitter<any>, fn: ArgsToVoidFunction<any>) {
	this.actions.add(fn)
}
_ActionEmitter.prototype.removeListener = function (this: PRIVATE_ActionEmitter<any>, fn: ArgsToVoidFunction<any>) {
	this.actions.delete(fn);
}

type ExportedActionEmitter = new <Args extends Array<any>>(inital?: ArgsToVoidFunction<Args>[]) => ActionEmitter<Args>;
export const ActionEmitter: ExportedActionEmitter = _ActionEmitter as any;

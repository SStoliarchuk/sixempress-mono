export declare class MongoDBFetch {
	field: string;
	projection?: {[key: string]: 1} | {[key: string]: 0};
}

export declare class PatchOperation<T = {}> {
	op: 'set' | 'unset' | 'push';
	path: keyof T | (string & {});
	value: any;
}

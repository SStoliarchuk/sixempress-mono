declare type ErrorInfo = void | string | {message: string, code: number, data: any} | object;

export class GenError extends Error {

	name: string = 'GenError';

	constructor(
		public status: 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503, 
		message: ErrorInfo,
	) {
		super(
			message
				? typeof message === 'object' 
					? JSON.stringify(cloneObj(message))
					: message.toString()
				: ''
		);
	}

}

function cloneObj(obj) {
	const toR: any = {};
	for (const k in obj) {
		toR[k] = obj[k];
	}
	// what mongo ?? 
	if (Object.keys(toR).length === 0) {
		if (obj.message) {
			toR.message = obj.message;
			toR.stack = obj.stack;
		}
	}
	return toR;
}

export class Error400 extends GenError {
	name = 'Error400';
	constructor(message: ErrorInfo) { super(400, message); }
}
export class Error401 extends GenError {
	name = 'Error401';
	constructor(message?: ErrorInfo) { super(401, message || 'Not Authorized'); }
}
export class Error403 extends GenError {
	name = 'Error403';
	constructor(message: ErrorInfo) { super(403, message); }
}
export class Error404 extends GenError {
	name = 'Error404';
	constructor(message: ErrorInfo) { super(404, message); }
}
export class Error409 extends GenError {
	name = 'Error409';
	constructor(message: ErrorInfo) { super(409, message); }
}
export class Error422 extends GenError {
	name = 'Error422';
	constructor(message: ErrorInfo) { super(422, message); }
}
export class Error500 extends GenError {
	name = 'Error500';
	constructor(message: ErrorInfo) { super(500, message); }
}
export class Error503 extends GenError {
	name = 'Error503';
	constructor(message: ErrorInfo) { super(503, message); }
}
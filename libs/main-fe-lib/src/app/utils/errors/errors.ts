import { IBaseModel } from "../../services/controllers/IBaseModel";
import { Omit } from "@material-ui/core";
import { ConnectionStatus } from "../enums/fe-error-codes.enum";
import { Subject } from "rxjs";

export enum ErrorNames {
	AuthErr = 'AuthErr',
	Err = 'Err',
	NetworkErr = 'NetworkErr',
}

/**
 * THIS CLASS AND THOSE THAT EXTEND IT CANNOT BE CHECKED WITH instanceof
 * it gives always false, i'm not accademic enough to know
 * 
 * so for now just do checks with the name
 * error.name === ErrorNames.Err
 * 
 * :D
 */
export abstract class SystemError extends Error {
	public abstract name: ErrorNames;
	// set 1 if the trace Object is typeof Err, else set it to 0
	public level: 1 | 0;
	// the error prior to this one
	public trace?: any;

	constructor(
		public message: string,
		trace?: any,
	) {
		super(message);

		// add trace
		if (!trace) { this.trace = new Error(message); }
		else { this.trace = trace; }

		// set the level
		// if another trace present, up the level
		if (this.trace.trace) {
			this.level = 1;
		} else {
			this.level = 0;
		}
		
	}
}

/**
 * Generic error
 */
export class Err extends SystemError {
	public name = ErrorNames.Err;
}

/**
 * Error with the authorization
 */
export class AuthErr extends SystemError {
	public name = ErrorNames.AuthErr;
	constructor(trace?: any) { super('NOT AUTHORIZED', trace); }
}

/**
 * Error with the system connection betweent the serevr
 */
export class NetworkErr extends SystemError {
	public name = ErrorNames.NetworkErr;
	public connectionBackEmitter = new Subject();
	constructor(public message: ConnectionStatus) { super(message); }
}

export declare type ConvertedError = {
	message: string;
	code: string | number;
} & ({
	stack: string;
	type: 'fe';
} | {
	stack: object;
	type: 'be';
});


export interface IErrorReport extends Omit<IBaseModel, 'documentLocationsFilter'> {
	userDescription?: string;
	localStorage: {[key: string]: any};
	sessionStorage: {[key: string]: any};
	lastUrl: string;
	exception: {
		message: string,
		stack: string | object
	};
	lastRequest?: any;
}

import { Err, AuthErr, ErrorNames, SystemError } from './errors';
import { Subscriber } from 'rxjs';

export class ErrorFactory {

	/**
	 * Creates an error by checking its class to return the correct item to the global error handler
	 * @param message Message to use to create the error
	 * @param trace (optional) the error preceding this one
	 */
	public static make(message: string, trace?: any): Err | AuthErr {

		if (trace && ((trace as SystemError).name === ErrorNames.AuthErr)) {
			return new AuthErr(trace);
		} 
		else {
			return new Err(message, trace);
		}

	}

	/**
	 * Handles the error coming from an observable
	 * @param message Message to use to create the error
	 * @param obs observer to which do obs.error()
	 */
	public static handleObs(message: string, obs?: Subscriber<any>): (err: any) => void {
		if (obs) {
			return (error) => { obs.error(ErrorFactory.make(message, error)); };
		} 
		else {
			return (error) => { throw ErrorFactory.make(message, error); };
		}
	}

}

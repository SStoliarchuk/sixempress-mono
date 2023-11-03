import { AugmentedRequest } from "@stlse/backend-connector";
import { MRequest } from "@stlse/backend-connector";
import { RequestQueryParamsParsed } from "../services/request-handler.helper/dtd";

export {};

declare module 'express-serve-static-core' {
	interface Request extends AugmentedRequest {
 	 	__stlse_req: MRequest,
		/**
		 * Contains the NON parsed query strings
		 */
		qs: {[A in keyof RequestQueryParamsParsed]: string} & {[A: string]: string};
		/**
		 * Contains the query string already parsed
		 */
		qsParsed: RequestQueryParamsParsed;
	}
}

declare global {

	type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

}

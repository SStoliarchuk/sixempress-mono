import { RequestQueryParamsParsed } from "@sixempress/main-be-lib";
import { AugmentedRequest } from "@stlse/backend-connector";
import { MRequest } from "@stlse/contracts";

export {};

declare module 'express-serve-static-core' {
	interface Request extends AugmentedRequest {
		__stlse_req: MRequest,
		/**
		 * Contains the NON parsed query strings
		 */
		qs: {[A in keyof RequestQueryParamsParsed]: string} & {[key: string]: string};
		/**
		 * Contains the query string already parsed
		 */
		qsParsed: RequestQueryParamsParsed;
	}
}

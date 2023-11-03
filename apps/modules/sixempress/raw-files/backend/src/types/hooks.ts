import { CrudType, RequestQueryParamsParsed } from "@sixempress/main-be-lib";
import { AdaptedRequest, AugmentedRequest } from "@stlse/backend-connector";
import { MRequest } from "@stlse/backend-connector";

export {};

declare global {
  interface filters {
  }
}

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

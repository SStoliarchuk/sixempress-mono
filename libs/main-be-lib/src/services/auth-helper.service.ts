import { Request, Response, NextFunction } from 'express';
import { Error401, Error403, RequestHelperService } from '@sixempress/main-be-lib';
import { TokenData } from './auth.dtd';


export class AuthHelperService {

	public static AuthHeader = 'authorization';

	public static SERVER_TASK_OBJECT_ID = [
		'000000000000000000000000', '000000000000', 
	];

	private static getJwt(req: Request): TokenData {
		const tkn = req.header(AuthHelperService.AuthHeader)!;
		const decoded: {data: TokenData} = JSON.parse(Buffer.from(tkn.split('.')[1], 'base64').toString());
		return decoded.data;
	}

	public static setRootJwt(req: Request) {
		const data: TokenData = {
			userId: AuthHelperService.SERVER_TASK_OBJECT_ID[0],
			att: [1],
			locs: ['*'],
		};
		const fullJwt = { sub: AuthHelperService.SERVER_TASK_OBJECT_ID[0] + '.' + AuthHelperService.SERVER_TASK_OBJECT_ID[0], data };
		req.headers[AuthHelperService.AuthHeader] = '.' + Buffer.from(JSON.stringify(fullJwt)).toString('base64') + '.';
	}

	static getUserIdFromToken(req: Request): string {
		const body = AuthHelperService.getJwt(req);
		return body.userId;
	}

	/**
	 * Returns the Authorization token from the Req
	 * returns false in case the token is auth
	 */
	public static getAuthzBody(req: Request): TokenData | undefined {
		const dec = AuthHelperService.getJwt(req);
		return dec;
	}

	/**
	 * Checks if a given authzToken has the required attributes
	 * if no attributes, it checks only if the user is authenticated,
	 * if empty array, then it will NEVER pass
	 * @param attributes Attributes to require, if true, then it doesnt check for attributes
	 * @param error if the user is not allowed, the error to throw
	 * @returns the middleware function to use in app.use()
	 */
	static requireAttributes(attributes?: boolean | string | number | (string | number)[], error = new Error403()): (req: Request, res: Response, next: NextFunction) => void {
		return (req: Request, res: Response, next: NextFunction) => {
			// check if the user has the required attributes
			if (attributes === false)
				return RequestHelperService.respondWithError(res, error);
			
			if (attributes === true)
				return next();

			const allowed = AuthHelperService._controlAttrs(AuthHelperService.getJwt(req), attributes);
			if (!allowed)
				return RequestHelperService.respondWithError(res, error);

			next();
		};
	}

	/**
	 * Checks if a required attribute is present in the current user
	 * @param attribute The attribute to check
	 * @param req The current request, if omitted, it will use CG.currequest
	 */
	public static isAttributePresent(attribute: number | string | (number | string)[], req: Request): boolean {
		
		// get user data
		const body = AuthHelperService.getAuthzBody(req);
		if (!body) return false;
		
		return AuthHelperService._controlAttrs(body, attribute);
	}


	private static _controlAttrs(user: {userId: string, att: (string | number)[]}, toCheck: number | string | (number | string)[]): boolean {
		
		if (AuthHelperService.SERVER_TASK_OBJECT_ID.includes(user.userId)) 
			return true;

		const attrToCheck = Array.isArray(toCheck) ? toCheck : [toCheck];
		
		// check if present
		for (const attr of attrToCheck)
			if (user.att.includes(attr)) 
				return true;
	}


}

import to from "await-to-js";
import { NextFunction, Response, Request } from 'express';
import { AuthHelperService } from "../auth-helper.service";
import { RequestHelperService } from "../request-helper.service";
// import { ApiKeyController } from "../../gateway-paths/globals/api-keys/ApiKey.controller";
// import { ApiKey } from '../../gateway-paths/globals/api-keys/ApiKey';
import moment from "moment";

export class ApiKeyService {

	public static XApiKeyHeader = 'x-api-key';

	// // 1h cache
	// private static cacheTimeInMs = 3600000;
	// private static cache: {[_id: string]: {iss: number, key: ApiKey}} = {};

	// /**
	//  * Insert this app.use() before the bearer attribute check
	//  */
	// public static async appUseTransformApiKey(req: Request, res: Response, next: NextFunction) {
		
	// 	// ignore if an auth header is already present
	// 	if (!req.header(AuthHelperService.AuthHeader)) {
	// 		const str = ApiKeyService.getApiKeyString(req);
	// 		if (str) {
	// 			const [err, bearer] = await to(ApiKeyService.transformApiKeyToBearer(req, str));
	// 			if (err) return RequestHelperService.respondWithError(res, err);
				
	// 			if (bearer)
	// 				ApiKeyService.addApiKeyToReq(req, bearer);
	// 		}
	// 	}

	// 	next();
	// }


	// /**
	//  * Reads the given request, and creates a "Authorization": "Bearer head.body.signature" 
	//  * based on the "apikey" header given
	//  */
	// private static async addApiKeyToReq(req: Request, token: string) {
	// 	req.headers[AuthHelperService.AuthHeader] = "Bearer " + token;
	// }

	// /**
	//  * Returns the apikey based on the string in the request
	//  */
	// public static async transformApiKeyToBearer(reqOrSlug: Request, string: string): Promise<void | string> {
	// 	const key = await ApiKeyService.getValidApiKey(reqOrSlug, string);
	// 	if (!key)
	// 		return;

	// 	return AuthHelperService.createJwt({
	// 		exp: key.expires,
	// 		iss: moment().unix(),
	// 		slug: typeof reqOrSlug === 'string' ? reqOrSlug : RequestHelperService.getSlugByRequest(reqOrSlug),
	// 		user: {
	// 			_id: key._id.toString(),
	// 			att: key.attributes,
	// 			locs: key.availableLocations,
	// 			name: key.name,
	// 		},
	// 	}).jwtString
	// }

	// /**
	//  * Returns the api key either from cache or from the db only if valid
	//  */
	// private static async getValidApiKey(reqOrSlug: Request, string: string): Promise<void | ApiKey> {
	// 	// 1h cache
	// 	const currTime = new Date().getTime();
	// 	if (ApiKeyService.cache[string] && currTime - ApiKeyService.cache[string].iss > ApiKeyService.cacheTimeInMs)
	// 		return ApiKeyService.cache[string].key;
		
	// 	// clear cache items if necessary
	// 	if (Object.keys(ApiKeyService.cache).length > 100)
	// 		for (const c in ApiKeyService.cache)
	// 			if (currTime - ApiKeyService.cache[c].iss > ApiKeyService.cacheTimeInMs)
	// 				delete ApiKeyService.cache[c];

	// 	// get data
	// 	const key = await new ApiKeyController().getRawCollection(reqOrSlug).findOne({
	// 		_key: string,
	// 		_deleted: {$exists: false},
	// 		isDisabled: {$exists: false},
	// 	});
	// 	if (!key) 
	// 		return;

	// 	ApiKeyService.cache[string] = { key, iss: currTime, };
	// 	return key;
	// }


}

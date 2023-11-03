import { Request, Response } from "express";
import to from "await-to-js";
import { Error403 } from "../../utils/errors/errors";
import { IPost } from "./dtd";
import { RequestHelperService } from '../../services/request-helper.service';
import { AbstractDbItemController } from "../../object-format-controller/db-item/abstract-db-item.controller";
import { IBaseModel } from "../../object-format-controller/IBaseModel.dtd";

export class RHPost {
	
	// TODO rename this into handlePost
	// and split it into handling and executing ffs
	public static async executePost<T extends IBaseModel>(
		req: Request, 
		res: Response,
		controller: AbstractDbItemController<T>,
		options: IPost<T> = {}
	): Promise<any> {

		if (!req.body) { return RequestHelperService.respondWithError(res, new Error403('No Body Found')); }
		
		// check for arrays
		if (options.acceptOnlyArray && req.body.constructor !== Array) { return RequestHelperService.respondWithError(res, new Error403('Allowed POST of only arrays')); }
		if (options.denyArrayPost && req.body.constructor === Array) { return RequestHelperService.respondWithError(res, new Error403('POST of arrays not allowed')); }
		
		// create array of the object to savew
		const toSave: T[] = req.body.constructor === Array ? req.body : [req.body];
		// check that there is at least 1 item if array
		if (toSave.length === 0) { return res.status(201).end(); }

		for (const s of toSave) {
			AbstractDbItemController.clearFetchedFields(req.body);
			
			if (!AbstractDbItemController.checkNoPrivateFieldInObject(s))
				return RequestHelperService.respondWithError(res, new Error403('Not allowed to post an object with fields that start with underscore'));

		}

		// save AND skip validation as it was validated before the middleware
		const [err, success] = await to(controller.saveToDb(req, toSave, {skipPresaveFn: options.skipPresaveFn, skipValidation: options.skipValidation}));
		if (err) return RequestHelperService.respondWithError(res, err);

		const b = Array.isArray(req.body) ? success.ops : success.ops[0];
		res.status(201).send( options.responseBody ? options.responseBody(b) : b );
	}

	

}


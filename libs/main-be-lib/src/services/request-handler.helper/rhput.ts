import { Request, Response } from "express";
import to from "await-to-js";
import { Error403 } from "../../utils/errors/errors";
import { IPut } from "./dtd";
import { RequestHelperService } from '../../services/request-helper.service';
import { AbstractDbItemController } from "../../object-format-controller/db-item/abstract-db-item.controller";
import { IBaseModel } from "../../object-format-controller/IBaseModel.dtd";
import { ObjectId } from "mongodb";
import { Filter } from "mongodb";

export class RHPut {
	
	public static async executePut<T extends IBaseModel>(
		req: Request, 
		res: Response,
		controller: AbstractDbItemController<T>,
		options: IPut<T> = {}
	): Promise<void> {

		let targetId: ObjectId;
		try { targetId = new ObjectId(req.params.id); }
		catch (e) { return RequestHelperService.respondWithError(res, new Error403("Invalid ID given")); }

		if (!req.body) { return RequestHelperService.respondWithError(res, new Error403('No Body Found')); }

		AbstractDbItemController.clearFetchedFields(req.body);

		const [errBeObj, beObject] = await to(controller.findOneForUser(req, {_id: targetId} as Filter<T>));
		if (errBeObj) { return RequestHelperService.respondWithError(res, errBeObj); }



		// ensure the private fields are okkeys
		if (beObject) {
			// we allow undefined in new as only the non private fields are updated later
			if (!AbstractDbItemController.ensurePrivateFieldsDidntChange(beObject, req.body, true)) {
				return RequestHelperService.respondWithError(res, new Error403('Not allowed to change private fields value on PUT'));
			}
		}
		else {
			if (!AbstractDbItemController.checkNoPrivateFieldInObject(req.body)) {
				return RequestHelperService.respondWithError(res, new Error403('Not allowed to PUT object with private fields and upsert: true'));
			}
		}

		const [err, success] = await to(controller.replaceItem__READ_DESCRIPTION(req, {_id: targetId} as Filter<T>, req.body, {objFromBe: beObject}));
		if (err) { return RequestHelperService.respondWithError(res, err); }

		res.status(201).send(targetId);
	}

	

}


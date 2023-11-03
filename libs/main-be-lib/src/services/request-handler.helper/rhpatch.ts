import { Request, Response } from "express";
import { ObjectId, Filter } from "mongodb";
import to from "await-to-js";
import { GenError, Error403, Error404 } from "../../utils/errors/errors";
import { PatchOperation } from "../../utils/dtd";
import { RequestHelperService } from '../../services/request-helper.service';
import { AbstractDbItemController } from "../../object-format-controller/db-item/abstract-db-item.controller";
import { IPatch } from "./dtd";
import { IBaseModel } from "../../object-format-controller/IBaseModel.dtd";

export class RHPatch {
	
	// TODO add a patch of multiple items
	// it's useful to check if the variants are all the same in the products

	public static async executePatch<T extends IBaseModel>(
		req: Request, 
		res: Response,
		controller: AbstractDbItemController<T>,
		options: IPatch<T> = {}
	) {

		let idToPatch: ObjectId;
		// test id
		try { idToPatch = new ObjectId(req.params.id); }
		catch (e) { return RequestHelperService.respondWithError(res, new Error403("Invalid ID given")); }

		// verify patches
		const patchOps: Array<PatchOperation> = req.body;
		if (patchOps.constructor !== Array) { return RequestHelperService.respondWithError(res, new Error403('Patch operations should be an array')); }
		if (patchOps.length === 0) { return res.status(200).send(); }
		const verifyErr = RHPatch.verifyPatchOperationFormat(patchOps);
		if (verifyErr) { return RequestHelperService.respondWithError(res, verifyErr); }

		// execute options.middleware
		if (options.verifyPatchOp) {
			const mwRes = options.verifyPatchOp(req, patchOps);
			// promise
			if (mwRes instanceof Promise) {
				const [errMW, successMW] = await to(mwRes);
				if (errMW) { return RequestHelperService.respondWithError(res, errMW); }
			} 
			// error
			else if (mwRes instanceof Error) { return RequestHelperService.respondWithError(res, mwRes); }
		}

		// get object to patch
		const [qErr, objectToPatchFromBE] = await to(controller.findOneForUser(req, {_id: idToPatch} as Filter<T>));
		if (qErr) { return RequestHelperService.respondWithError(res, qErr); }
		if (!objectToPatchFromBE) { return RequestHelperService.respondWithError(res, new Error404('Item to modify not found, id: "' + req.params.id + '"')); }

		// skipping verify as already verified
		const [oof, d] = await to(controller.patchSingle(req, objectToPatchFromBE, patchOps));
		if (oof) { return RequestHelperService.respondWithError(res, oof); }
		
		res.status(200).send(idToPatch);
	}


	/**
	 * Controls that the pathc operation format is gud
	 */
	private static verifyPatchOperationFormat(patchOps: PatchOperation<any>[]): GenError | void {

		for (const op of patchOps) {
			
			// ensure the op is present
			if (typeof op.op === "undefined") { 
				return new Error403('Missing op field (op.op)'); 
			}
			
			// ensure the path is present
			if (!op.path) { 
				return new Error403('op.path must be present'); 
			}

			// ensure the value is present
			if (op.op !== 'unset' && typeof op.value === "undefined") { 
				return new Error403('Missing value field (op.value)'); 
			}

			// if the patch is on a private field, then error
			if (op.path[0] === '_' || (op.path as string).includes('._')) {
				return new Error403('Patching on private field is not allowed');
			}

			// special ops
			if ((op.path as string).includes('.$[]')) {
				return new Error403('Special mongodb operations not allowed');
			}

		}

	}


}



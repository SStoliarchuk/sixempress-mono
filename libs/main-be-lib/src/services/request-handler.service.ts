import { NextFunction, Request, Response } from "express";
import { ObjectId, Filter } from "mongodb";
import to from "await-to-js";
import { Error400, Error422, Error404, Error403 } from "../utils/errors/errors";
import { RHGet } from './request-handler.helper/rhget';
import { RHPatch } from './request-handler.helper/rhpatch';
import { RHPost } from './request-handler.helper/rhpost';
import { RHPut } from './request-handler.helper/rhput';
import { AbstractDbItemController } from "../object-format-controller/db-item/abstract-db-item.controller";
import { IPost, IGetMulti, IGetSingle, IPatch, IDelete, IPut } from "./request-handler.helper/dtd";
import { RequestHelperService } from './request-helper.service';
import { IBaseModel } from "../object-format-controller/IBaseModel.dtd";

declare type middlewareActionType = 'ensure' | 'validate';

export class RequestHandlerService<T extends IBaseModel> {

	/**
	 * Returns a useful express midellware that does common stuff
	 */
	public static expressMiddleware(opts: {paramId?: middlewareActionType, body?: middlewareActionType, queryFilter?: middlewareActionType}) {
		return async (req: Request, res: Response, next: NextFunction) => {
			
			if (opts.paramId) {
				if (!req.params.id) {
					return RequestHelperService.respondWithError(res, new Error403(':id URL parameter not present'));
				}
				if (opts.paramId === 'validate') {
					try {
						new ObjectId(req.params.id); 
					} catch (e) { 
						return RequestHelperService.respondWithError(res, new Error403('Invalid ID passed to delete')); 
					}
				}
			}

			if (opts.body) {
				if (!req.body) {
					return RequestHelperService.respondWithError(res, new Error403('No Body Found')); 
				}
			}

			next();
		};
	}

	constructor( private controller: AbstractDbItemController<T> ) {}

	getById(options?: IGetSingle<T>) {
		return async (req: Request, res: Response) => RHGet.executeGetSingle(req, res, this.controller, options);
	}

	getMulti(options: IGetMulti<T> = {}) {
		return async (req: Request, res: Response) => RHGet.executeGetMulti(req, res, this.controller, options);
	}

	patchById(options: IPatch<T> = {}) {
		return async (req: Request, res: Response) => RHPatch.executePatch(req, res, this.controller, options);
	}

	post(options?: IPost<T> ) {
		return async (req: Request, res: Response) => RHPost.executePost(req, res, this.controller, options);
	}

	put(options?: IPut<T>) {
		return async (req: Request, res: Response) => RHPut.executePut(req, res, this.controller, options);
	}

	processGetOptions(req: Request, queryRes: any[]) {
		return RHGet.processGetOptions(req, queryRes);
	}

	count() {
		return async (req: Request, res: Response) => {

			const [err, succ] = await to(this.controller.countForUser(req, req.qsParsed.filter || {}));
			if (err) { return RequestHelperService.respondWithError(res, err); }

			// the big succ
			res.status(200).send(succ.toString());
		};
	}

	/**
	 * Update or creates a field called '_deleted' with a value of 1
	 * @param coll the collection where to delete the object
	 */
	markAsDeleted(options?: IDelete<T>) {
		return async (req: Request, res: Response) => this.deleteAction(req, res, false, options);
	}

	/**
	 * Deletes the model given
	 */
	completeDelete(options?: IDelete<T>) {
		return async (req: Request, res: Response) => this.deleteAction(req, res, true, options);
	}


	/**
	 * A function that handles the delete process, instead of writing redundacies code
	 */
	private async deleteAction(req: Request, res: Response, completeDelete: boolean, options: IDelete<T> = {}) {
		let idFilter: Filter<T>;
		try { idFilter = {_id: new ObjectId(req.params.id)} as any; }
		catch (e) { return RequestHelperService.respondWithError(res, new Error403('Invalid ID passed to delete')); }
		
		// delete
		const [err, succ] = await to(this.controller.deleteForUser(req, idFilter, {completeDelete}));
		if (err) { return RequestHelperService.respondWithError(res, err); }

		res.end();
	}

}

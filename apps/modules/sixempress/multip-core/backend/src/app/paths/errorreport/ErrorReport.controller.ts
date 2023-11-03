import { IVerifiableItemDtd, SaveOptions, RequestHelperService, Error404, Error403, GenError, RequestHandlerService, LibAttribute } from "@sixempress/main-be-lib";
import { Attribute } from "../../utils/enums/attributes.enum";
import { BePaths } from "../../utils/enums/bepaths.enum";
import { ModelClass } from '../../utils/enums/model-class.enum';
import { ErrorReport } from "./ErrorReport.dtd";
import { Request, RequestHandler } from 'express';
import { ObjectId } from "mongodb";
import to from "await-to-js";
import moment from "moment";
import { AbstractDbApiItemController, LibModelClass } from "@sixempress/main-be-lib";

export class ErrorReportController extends AbstractDbApiItemController<ErrorReport> {

	modelClass = LibModelClass.ErrorReport;
	collName = LibModelClass.ErrorReport;
	bePath = BePaths.errorreport;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	Attributes = {
		view: LibAttribute.seeSystemMetrics,
		add: true,
		modify: true, // later the patch handler allows only to patch the description field
		delete: false,
	}

	dtd: IVerifiableItemDtd<ErrorReport> = {
		userDescription: { type: [String], required: false },

		localStorage: { type: [Object], required: true, objDef: [String] },
		sessionStorage: { type: [Object], required: true, objDef: [String] },
		lastUrl: { type: [String], required: true },
		lastRequest: { type: ['any'], required: false, },

		exception: { type: [Object], required: true, objDef: [{
			message: { type: [String], required: true },
			stack: { type: [String, Object], required: true, objDef: ['any'] },
		}]},
	};


	protected getHandler_put(): RequestHandler {
		return (req, res) => res.sendStatus(404);
	}
	
	// return only the id
	protected getHandler_post(rhs: RequestHandlerService<ErrorReport>) {
		return rhs.post({
			responseBody: (b: ErrorReport | ErrorReport[]) => Array.isArray(b) ? b.map(b => b._id.toString()) : b._id.toString(),
		})
	}

	// update the error with the user description
	protected getHandler_patchById(): RequestHandler {
		return async (req, res) => {
			if (!req.params.id)
				return RequestHelperService.respondWithError(res, new Error404('No ID parameter passed'));
			
			let id: ObjectId;
			try { id = new ObjectId(req.params.id); }
			catch (e) { return RequestHelperService.respondWithError(res, new Error403('The given ID is malformed')); }
			
			// if body invalid
			if (Object.keys(req.body).length !== 1 || !req.body.message || typeof req.body.message !== 'string') 
				return RequestHelperService.respondWithError(res, new Error403('The body has to be {message: STRING}')); 
	
			// find the relative error
			const [eF, f] = await to(this.findOneForUser(req, {_id: id}, {skipFilterControl: true}));
			if (eF || !f) return RequestHelperService.respondWithError(res, eF || new Error404('No error found with given ID'));
	
			// update the descr
			const [errIns, ins] = await to(this.getCollToUse(req).updateOne({_id: id}, {$set: {userDescription: req.body.message}}));
			if (errIns) return RequestHelperService.respondWithError(res, errIns);;
	
			res.end();
		};
	}

	/**
	 * As we allow the user to post errorreport with auth token and not authz, we need to remove location access check
	 */
	public preInsertFunction( req: Request, toSave: ErrorReport[], options: SaveOptions = {} ): void | GenError {
		ErrorReportController.replaceDotsFromKeys(toSave);
		for (const body of toSave) {
			const err = this.verifyObject(body);
			if (err) return new Error404(err);

			body.documentLocationsFilter = ['*'];
			body._date = moment().unix();
			body._systemSlug = RequestHelperService.getSlugByRequest(req);
		}
	}

	/**
	 * Removes dots from the error for a reason i dont rememeber
	 * but it was misbehaving with mongodb
	 */
	private static replaceDotsFromKeys(err: any): any {
		for (const k in err) {
			if (typeof err[k] === 'object')
				ErrorReportController.replaceDotsFromKeys(err[k]);
	
			if (k.indexOf('.') !== -1) {
				const newKey = k.replace(/\./g, '_');
				err[newKey] = err[k];
				delete err[k];
			}
		}
	}
	

}

import { ApiKey, ApiKeyType } from './ApiKey';
import { Request, Express } from 'express';
import { AbstractDbApiItemController, CustomExpressApp, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue, Error409, IVerifiableItemDtd, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { Attribute, BePaths, ModelClass } from '../../enums';
import { AuthHelperService } from '../../services/authentication/auth-helper.service';
import { PasswordCrypt } from '../../services/authentication/password-crypt';

export class ApiKeyController extends AbstractDbApiItemController<ApiKey> {

	private static type = Object.values(ApiKeyType).filter(t => typeof t === 'number');

	modelClass = ModelClass.ApiKey;
	collName = ModelClass.ApiKey;
	bePath = BePaths.apikeys;

	requireDocumentLocationsFilter = false;
	requireDocumentLocation = false;
	
	Attributes = {
		view: Attribute.viewApiKeys,
		add: Attribute.addApiKeys,
		modify: Attribute.modifyApiKeys,
		delete: Attribute.deleteApiKeys,
	};

	dtd: IVerifiableItemDtd<ApiKey> = {
		expires: { type: [Number, Boolean], required: false, },
		name: { type: [String], required: true, },
		availableLocations: { type: [Array], required: true, arrayDef: {type: [String]} },
		attributes: { type: [Array], required: true, arrayDef: {type: [Number]} },
		isDisabled: { type: [Boolean], required: false },
		type: { type: [Number], required: false, possibleValues: ApiKeyController.type },
	};

	public generateBePaths(app: Express, rhs: RequestHandlerService<ApiKey>) {
		
		// a function to retrieve own user info wihtouth any attr required
		app.get(
			"/" + this.bePath + 'self/',
			rhs.getById({useId: (req) => AuthHelperService.getUserIdFromToken(req)}),
		);

		super.generateBePaths(app, rhs);
	}
	

	/**
	 * assign type manual as default
	 * Prevent modification to type not manual
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, ApiKey>, 
		toSave: A extends "insert" ? ApiKey[] : ApiKey, 
		beObjInfo:  A extends "insert" ? undefined : ApiKey
	): Promise<DBSaveReturnValue<ApiKey>> {
		
		const arr: ApiKey[] = Array.isArray(toSave) ? toSave as ApiKey[]: [toSave as ApiKey];

		for (const s of arr) {
			s.type = s.type || ApiKeyType.manual;
			if (s.isDisabled === false)
				delete s.isDisabled;


			const slug = RequestHelperService.getSlugByRequest(req);
				s._key = slug + '--' + PasswordCrypt.generateApiKey();
			}
		
		if (opts.method === 'update')
			if ((toSave as ApiKey).type !== ApiKeyType.manual)
				throw new Error409('Cannot modify internal api_key');

		return super.executeDbSave(req, opts, toSave, beObjInfo);
	}
	

}

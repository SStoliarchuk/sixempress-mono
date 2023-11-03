import { Request } from 'express-serve-static-core';
import { ObjectId } from 'mongodb';
import { User } from './User.dtd';
import { RequestHandler, Express } from 'express';
import { Attribute, BePaths, ModelClass } from '../../enums';
import { AbstractDbApiItemController, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue, Error403, FetchableField, IGetMulti, IGetSingle, IVerifiableItemDtd, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { AuthHelperService } from '../../services/authentication/auth-helper.service';
import { PasswordCrypt } from '../../services/authentication/password-crypt';

export class UserController extends AbstractDbApiItemController<User> {

	modelClass = ModelClass.User;
	collName = ModelClass.User;
	bePath = BePaths.userlist;

	requireDocumentLocation = false;
	addIncrementalValue = true;

	Attributes = {
		// everyone can view the users
		// but if the Attribute.viewUsers is not present
		// then the /users list get will return only the user that sent the request
		//
		// useful for self-assigning things and/or searching for assigned things
		view: true,
		add: Attribute.addUsers,
		modify: Attribute.modifyUsers,
		delete: Attribute.deleteUsers,
	};

	dtd: IVerifiableItemDtd<User> = {
		name: { type: [String], required: true, }, 
		role: FetchableField.getFieldSettings(ModelClass.UserRole, false),
		username: { type: [String], required: true, },
		// not required, its present only during POST
		password: { type: [String], required: false, },
		allowedLocations: { type: [Array], minArrN: 1, required: true, arrayDef: {
			type: [String],
		}},
	};

	public static getBackendUserModel(): User {
		return {
			allowedLocations: ['*'],
			documentLocationsFilter: ['*'],
			documentLocation: '1',
			name: 'ROOT',
			username: 'ROOT',
			password: '',
			role: {id: AuthHelperService.SERVER_TASK_OBJECT_ID[0], modelClass: ModelClass.UserRole, fetched: {attributes: []} as any },
			_created: { _author: { id: AuthHelperService.SERVER_TASK_OBJECT_ID[0], modelClass: ModelClass.User }, _timestamp: 0 },
			_id: AuthHelperService.SERVER_TASK_OBJECT_ID[0],
			_progCode: 0,
		};
	}


	public generateBePaths(app: Express, rhs: RequestHandlerService<User>) {
		// a function to retrieve own user info wihtouth any attr required
		app.get(
			"/" + this.bePath + 'self/', 
			rhs.getById({
				useId: (req) => AuthHelperService.getUserIdFromToken(req),
				customQuery: (req, f, opts) => this.findOneForUser(req, f, {base: opts, skipFilterControl: true}),
			}),
		);

		super.generateBePaths(app, rhs);
	}

	protected getHandler_getMulti(rhs: RequestHandlerService<User>): RequestHandler {
		return rhs.getMulti(this.rhGetProjections as IGetMulti<User>);
	}
	
	protected getHandler_getById(rhs: RequestHandlerService<User>): RequestHandler {
		return rhs.getById(this.rhGetProjections as IGetSingle<User>);
	}


	/**
	 * Allows the user to do a get request for the list of users
	 * but returns only itself if the attr is not present
	 */
	private rhGetProjections: IGetSingle<User> | IGetMulti<User> = {
		customOptions: (req, filters) => {
			return {
				// return only own item as the filter if no view users attribute is present
				filters: AuthHelperService.isAttributePresent(Attribute.viewUsers, req) 
					? filters 
					: {...filters, _id: new ObjectId(AuthHelperService.getAuthzBody(req).userId)} ,
				
				projection: AuthHelperService.isAttributePresent(Attribute.viewAllUserData, req)
					? [{password: 0}, {role: 1}]
					: {_progCode: 1, name: 1},

				forceProjections: AuthHelperService.isAttributePresent(Attribute.viewAllUserData, req) 
					? false 
					: true,
			}
		}
	};

	/**
	 * ensure username unique and encrypt password
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, User>, 
		toSave: A extends "insert" ? User[] : User, 
		beObjInfo: A extends "insert" ? undefined : User
	): Promise<DBSaveReturnValue<User>> {

		const itemsArr = (Array.isArray(toSave) ? toSave as User[] : [toSave as User]);

		// ensure the username is unique
		const allUsernames = itemsArr.map(i => i.username);
		const users = await this.countForUser(req, beObjInfo 
			? {username: {$in: allUsernames}, _id: {$ne: new ObjectId(beObjInfo._id.toString())}}
			: {username: {$in: allUsernames}}
		);
		if (users !== 0) 
			throw new Error403('A Username equal already exists');

		// encry pass if changed
		for (const i of itemsArr) {
			if (!i.password)
				i.password = beObjInfo.password;
			else if (!beObjInfo || beObjInfo.password !== i.password)
				i.password = await PasswordCrypt.hashPassword(req, i.password);
		}

		// ensure password is always present
		for (const i of itemsArr)
			if (!i.password)
				throw new Error403('Password not preset');

		return super.executeDbSave(req, opts, toSave, beObjInfo);
	}

}

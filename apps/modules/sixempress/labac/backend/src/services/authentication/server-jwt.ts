import { AuthHelperService, Error401, FetchableField, LocationsData, RequestHelperService } from '@sixempress/main-be-lib';
import to from 'await-to-js';
import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { UserRoleController } from '../../app/user-roles/UserRole.controller';
import { UserRole } from '../../app/user-roles/UserRole.dtd';
import { UserController } from '../../app/users/User.controller';
import { User } from '../../app/users/User.dtd';
import { Attribute, ModelClass } from '../../enums';
import { BusinessLocationsService } from '../business-locations/business-locations.service';
import { GenerateTokenData } from './auth.dtd';
import { PasswordCrypt } from './password-crypt';

/**
 * Accessible ONLY from the control server
 */
export async function createJwt(req: Request, userNameOrId: string | ObjectId): Promise<GenerateTokenData> {
	if (RequestHelperService.isIdServerTask(userNameOrId))
		return {userId: AuthHelperService.SERVER_TASK_OBJECT_ID[0], att: [1], locs: ['*']};

	const user = await getActiveUser(req, userNameOrId)
	if (!user) throw new Error401();

	const businessLocs = await BusinessLocationsService.getLocationsData(req);
	if (!businessLocs)
		throw new Error('BusinessLocations has not been initialized');

	return {
		userId: user._id.toString(),
		att: user.role.fetched.attributes,
		locs: user.allowedLocations || [],
		alllocs: businessLocs.locations.map(i => i._id),
	}

}

export async function getActiveVerifiedUser(req: Request, idOrUsername: ObjectId | string, password: string): Promise<User | false> {
	// get the user
	const user = await getActiveUser(req, idOrUsername);
	if (!user)
		return false;

	// verify the password is correct
	// we give 401 on error, as it could mean the password is corrupted or something idk
	const [errVerify, isVerified] = await to(PasswordCrypt.verifyPassword(req, user.password, password));
	if (errVerify || !isVerified) 
		return false;

	return user;
}

async function getActiveUser(req: Request, idOrUsername: ObjectId | string): Promise<User | false> {

	// root user
	if (RequestHelperService.isIdServerTask(idOrUsername))
		return UserController.getBackendUserModel();

	const user: User = await new UserController().getRawCollection(req).findOne(
		typeof idOrUsername === 'string' 
			? {_deleted: {$exists: false}, username: idOrUsername}
			: {_deleted: {$exists: false}, _id: idOrUsername},
	);
	
	if (!user) 
		return false;

	user.role.fetched = await new UserRoleController().getRawCollection(req).findOne({_id: new ObjectId(user.role.id)});

	return user;
}

export async function maybeCreateFirstUser(req: Request, username: string, password: string): Promise<User | false> {
	AuthHelperService.setRootJwt(req);
	const c = new UserController();
	const inDb = await c.getRawCollection(req).countDocuments();
	if (inDb !== 0)
		return false;
		
	// create business locations
	const businessLocs = await BusinessLocationsService.getLocationsData(req);
	if (!businessLocs)
		await BusinessLocationsService.createFirstLocationsData(req);

	const role = await getOrCreateFirstUserRole(req);
	const u: User = await use_filter.sxmp_labac_create_first_user_body(req, {
		name: username,
		password: password,
		username: username,
		role: new FetchableField(role._id, ModelClass.UserRole),
		allowedLocations: ['*'],
		documentLocationsFilter: ['*'],
	});
	
	await c.saveToDb(req, [u]);
	return c.getRawCollection(req).findOne({}) as Promise<User>;
}

export async function maybeSetFirstPassword(req: Request, username: string, password: string): Promise<User | false> {
	AuthHelperService.setRootJwt(req);
	const c = new UserController();

	const user: User = await c.getRawCollection(req).findOne({_deleted: {$exists: false}, username});
	if (user.password)
		return false;

	delete user.password;
	await c.getRawCollection(req).updateOne({_id: user._id}, {$set: {password: await PasswordCrypt.hashPassword(req, password)}});
	return user;
}

export async function getOrCreateFirstUserRole(req: Request): Promise<UserRole> {
	const c = new UserRoleController();
	const first = await c.getRawCollection(req).findOne({});
	if (first)
		return first;

	const u: UserRole = await use_filter.sxmp_labac_create_first_user_role_body(req, {
		name: 'StartRole',
		attributes: Object.values(Attribute).filter(v => typeof v === 'number'),
		documentLocationsFilter: ['*'],
	});

	await c.saveToDb(req, [u]);
	return c.getRawCollection(req).findOne({}) as Promise<UserRole>;
}
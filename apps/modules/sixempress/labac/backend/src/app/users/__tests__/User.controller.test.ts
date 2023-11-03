import to from 'await-to-js';
import { Filter, ObjectId } from 'mongodb';
import { CS } from '../../../../services/context.service';
import { appUse, dropDatabase, generateAuthzString, generateRequestObject } from '../../../../tests/setupTests';
import { PatchOperation } from '../../../../utils/dtd';
import { LibAttribute, LibModelClass } from '../../../../utils/enums';
import { MongoUtils } from '../../../../utils/mongo-utils';
import { UserController } from '../User.controller';
import { User } from '../User.dtd';
import express from 'express';
import { RequestHandlerService } from '../../../../services/request-handler.service';
import request from 'supertest';
import { UserRoleController } from '../../user-roles/UserRole.controller';
import { FetchableField } from '../../../../object-format-controller/fetchable-field';
import { ModelFetchService } from '../../../../services/request-handler.helper/model-fetch.service';
import { PasswordCrypt } from '../../../../services/crypt/password-crypt';

type PartialUser = Partial<User>;
// fast iteration
PasswordCrypt['config'].iterations = 2;

const utils = (() => {

	const _internal = {
		presave: (usr: PartialUser[]): User[] => {
			for (const u of usr) {
				u.name = u.name || 'name';
				u.username = u.username || Math.random().toString();
				u.password = u.password || 'password';
				u.allowedLocations = u.allowedLocations || ['*'];
				u.documentLocationsFilter = u.documentLocationsFilter || ['*'];
			}
			return usr as User[];
		}
	}

	return {
		getReqObj: generateRequestObject,
		instance: new UserController(),
		save: (u: PartialUser[]) => {
			return utils.instance.saveToDb(utils.getReqObj(), _internal.presave(u));
		},
		find: (f?: Filter<User>) => {
			return utils.instance.findForUser(utils.getReqObj(), f);
		},
		findOne: (f?: Filter<User>) => {
			return utils.instance.findOneForUser(utils.getReqObj(), f);
		},
		findRaw: (f?: Filter<User>): Promise<User[]> => {
			return utils.instance.getCollToUse(utils.getReqObj()).find(f).toArray();
		},
		replace: (u: PartialUser) => {
			return utils.instance.replaceItem__READ_DESCRIPTION(utils.getReqObj(), {_id: new ObjectId(u._id.toString())}, _internal.presave([u])[0]);
		},
		patch: async (id: string | ObjectId | PartialUser, patchOps: PatchOperation<User>[]) => {
			id = typeof id === 'string' ? id : MongoUtils.isObjectId(id) ? id.toString() : id._id.toString();
			id = new ObjectId(id);

			const beOb = await utils.instance.findOneForUser(utils.getReqObj(), {_id: id});
			return utils.instance.patchSingle(utils.getReqObj(), beOb, patchOps);
		},

	};
})();

beforeEach(async () => {
	await dropDatabase();
});

describe('User controller', () => {

	describe('save/modify', () => {

		it('hashes the password', async () => {
			await utils.save([{password: '123'}]);
			let res = await utils.findRaw();
			expect(res[0].password).not.toBe('123');
			expect(await PasswordCrypt.verifyPassword(res[0].password, '123')).toBe(true);
			
			await utils.replace({...res[0], password: '123'});
			res = await utils.findRaw();
			expect(res[0].password).not.toBe('123');
			expect(await PasswordCrypt.verifyPassword(res[0].password, '123')).toBe(true);

			await utils.patch(res[0], [{op: 'set', path: 'password', value: '123'}]);
			res = await utils.findRaw();
			expect(res[0].password).not.toBe('123');
			expect(await PasswordCrypt.verifyPassword(res[0].password, '123')).toBe(true);
		});

		it('checks if the username is already present in db', async () => {
			let e, d;

			[e, d] = await to(utils.save([{username: 'u1'}]));
			expect(e).toBe(null);

			[e, d] = await to(utils.save([{username: 'u1'}]));
			expect(e).not.toBe(null);

			// save another one valid 
			[e, d] = await to(utils.save([{username: 'u2'}]));
			expect(e).toBe(null);

			// try to change the name to a conflict
			let res = (await utils.find({username: 'u1'}))[0];
			// invalid changes
			[e, d] = await to(utils.replace({...res, username: 'u2'}));
			expect(e).not.toBe(null);
			[e, d] = await to(utils.patch(res, [{op: 'set', path: 'username', value: 'u2'}]));
			expect(e).not.toBe(null);

			// valid change
			[e, d] = await to(utils.patch(res, [{op: 'set', path: 'username', value: 'u3'}]));
			expect(e).toBe(null);

			// ensure only 2 models
			expect(await utils.find()).toHaveLength(2);
		});

		it.todo('doesnt change the password if we modify another field');

	});

	describe('get', () => {

		// so if model has allowed locations ["1"],
		// and the documentLocationsFilter is ["2"]
		// then /self should still work
		it.todo('allows you to fetch /self even if the  allowed location does not contain the user model visibility value');

		// we passed [null] to remap Attrs and it died
		it.todo('doesnt crash on getSingle null');

		describe('fields projections', () => {
			// the projections works only if the request is coming from outside
			// if the request is from the server itself, not projections are applied

			const app = express();
			CS.express = app;
			appUse(app);
			
			beforeAll(async () => {
				await utils.instance.generateBePaths(app as any, new RequestHandlerService(utils.instance));
			});
	
			const getSingle = async (authzString: string, id: string): Promise<User> => {
				let res = await request(app)
					.get('/' + utils.instance.bePath + id)
					.set("Authorization", authzString);
				return res.body;
			}
			const getMulti = async (authzString: string,): Promise<User[]> => {
				let res = await request(app)
					.get('/' + utils.instance.bePath)
					.set("Authorization", authzString);
				return res.body;
			}
	
			it('projects only a couple of fields field if attribute is not present', async () => {
				let s = await utils.save([{}]);
				let res = await getSingle(generateAuthzString({userAtts: [LibAttribute.viewUsers, LibAttribute.viewAllUserData + 1]}), s.ops[0]._id.toString())
				expect(Object.keys(res)).toHaveLength(3);
				expect(res.name).toBeTruthy();
				expect(res._id).toBeTruthy();
				expect(res._progCode).toBeTruthy();
	
				res = (await getMulti(generateAuthzString({userAtts: [LibAttribute.viewUsers, LibAttribute.viewAllUserData + 1]})))[0]
				expect(Object.keys(res)).toHaveLength(3);
				expect(res.name).toBeTruthy();
				expect(res._id).toBeTruthy();
				expect(res._progCode).toBeTruthy();
			});
	
			it('projects away the password if viewAlluserData attribute is present', async () => {
				let s = await utils.save([{}]);
				let res = await getSingle(generateAuthzString({userAtts: [LibAttribute.viewUsers, LibAttribute.viewAllUserData]}), s.ops[0]._id.toString())
				expect('password' in res).toBeFalsy();
	
				res = (await getMulti(generateAuthzString({userAtts: [LibAttribute.viewUsers, LibAttribute.viewAllUserData]})))[0]
				expect('password' in res).toBeFalsy();
			});

		});

	});

});

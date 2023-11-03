import { ObjectId, Filter, MongoClient } from "mongodb";
import express, { Request } from 'express';
import bodyParser from 'body-parser';
import { CS, IBaseModel, AbstractDbItemController, FindDbOptions, DeleteOptions, MongoUtils, PatchOperation, uniqueSlugNameNoColon, RequestHelperService, AuthHelperService } from "../index";
import { CrudCollection } from "../object-format-controller/db-item/crud-collection";
import { DecodedAuthToken, DecodedAuthzToken } from "../services/dtd";

if (process.env.DEBUG) {
	jest.setTimeout(50000);
}

export interface IAuthzGenerate {
	allLocs?: (string[]) | false;
	userId?: string,
	userLocs?: string[];
	userAtts?: number[];
}

export function connectToMongo() {
	// sometimes it tries to disconnect twice, and CS.db.isConnected() doesnt work properly, w.t.f.
	let isConnected = false;
	beforeAll(async (done) => {
		// we need to disabled crud updates as it hangs the test and does db ops after we close it
		CrudCollection.isEnabled = false;
	
		if (!isConnected) {
			await new Promise<void>(async (r, j) => {
				if (CS.db) { return r(); }
				// connection = await MongoClient.connect("mongodb://192.168.11.120:9999", {useUnifiedTopology: true, useNewUrlParser: true});
				const connection = await MongoClient.connect(CS.mongoDbConnectionUrl, {useUnifiedTopology: true, useNewUrlParser: true});
				CS.db = {} as any;
				// for debug
				Object.defineProperty(CS, 'db', { get: function() { 
					return connection; 
				} });
				await tt.dropDatabase();
				isConnected = true;
				r();
			});
		}
		done();
	});
	afterAll(async (done) => {
		if (CS.db.isConnected() && isConnected) {
			isConnected = false;
			await CS.db.close();
		}
		done();
	});
}

function arrayContaining(sampleOrIgnore: any[] | boolean, sample?: any[]) {
	let ignore: boolean = false;
	if (typeof sampleOrIgnore === 'boolean') {
		ignore = sampleOrIgnore;
	} else {
		sample = sampleOrIgnore;
	}
	
	const tor = expect.arrayContaining(sample);

	if (!ignore) {
		const oldMatch = tor.asymmetricMatch.bind(tor);
		tor.asymmetricMatch = (function (this: any, ...matchArgs) {
			if (matchArgs[0].length !== this.sample.length) {
				return false;
			}
			return oldMatch(...matchArgs)
		}).bind(tor);
	}

	return tor;
}

export const TestTools = {
	
	testSlug: "jest_slug_that_will_never_exists_in_db_20000925",

	wait(ms: number) {
		return new Promise((r, j) => setTimeout(r, ms));
	},

	getBaseControllerUtils<
		FULL_T extends IBaseModel,
		PARTIAL_T extends {_id?: ObjectId | string},
		CONTROLLER extends AbstractDbItemController<FULL_T>
	>(config: {controller: CONTROLLER, partialToFull?: (item: PARTIAL_T[]) => FULL_T[] | Promise<FULL_T[]>, reqObj?: () => Request}) {
	
		const controller = config.controller;
		config.partialToFull = config.partialToFull || ((i) => i as any);
	
		const utils = {
			controller: controller,
	
			getReqObj: config.reqObj || tt.generateRequestObject,
	
			save: async (bs: PARTIAL_T[]) => {
				const full = await config.partialToFull(bs);
				const ops = await controller.saveToDb(utils.getReqObj(), full);
				
				return controller.findForUser(utils.getReqObj(), {_id: {$in: ops.ops.map(i => new ObjectId(i._id.toString()))}} as Filter<FULL_T>);
			},
			find: (f?: Filter<FULL_T>, opts?: FindDbOptions) => {
				return controller.findForUser(utils.getReqObj(), f, opts);
			},
			delete: (f?: Filter<FULL_T>, opts?: DeleteOptions) => {
				return controller.deleteForUser(utils.getReqObj(), f, opts);
			},
			put: async (idOrOldOrNew: ObjectId | string | PARTIAL_T | FULL_T, b?: PARTIAL_T) => {
				const id = MongoUtils.isObjectId(idOrOldOrNew) ? idOrOldOrNew.toString() : typeof idOrOldOrNew === 'string' ? idOrOldOrNew : (idOrOldOrNew as any)._id.toString();
	
				// reassign variable if only one arg passed
				if (!b && !MongoUtils.isObjectId(idOrOldOrNew) && typeof idOrOldOrNew === 'object') {
					b = idOrOldOrNew as any;
				}
	
				const full = (await config.partialToFull([b]))[0];
				await controller.replaceItem__READ_DESCRIPTION(utils.getReqObj(), {_id: new ObjectId(id)} as Filter<FULL_T>, full);
				return controller.findOneForUser(utils.getReqObj(), {_id: new ObjectId(id)} as Filter<FULL_T>);
			},
			patch: async (idOrOld: ObjectId | string | PARTIAL_T | FULL_T, pops: PatchOperation<FULL_T>[]) => {
				const id = MongoUtils.isObjectId(idOrOld) ? idOrOld.toString() : typeof idOrOld === 'string' ? idOrOld : (idOrOld as any)._id.toString();
				const relative = await controller.findOneForUser(utils.getReqObj(), {_id: new ObjectId(id)} as Filter<FULL_T>);
				await controller.patchSingle(utils.getReqObj(), relative, pops);
	
				return controller.findOneForUser(utils.getReqObj(), {_id: new ObjectId(id)} as Filter<FULL_T>); 
			},
		}
	
		return utils;
	},

	/**
	 * Array containing but ensures that the length matches
	 */
	arrayContaining: arrayContaining,
	
	/**
	 * additionally checks for same length
	 */
	ea: arrayContaining,
	/**
	 * Alias to expect.objectContaining
	 */
	eo: ((...args) => expect.objectContaining(...args)) as (typeof expect)['objectContaining'],
	
	/**
	 * prefixes array with tt.ea();\
	 * prefixes object with tt.eo();
	 * 
	 * RECURSIVELY
	 */
	ee: (obj: object) => {
		if (typeof obj !== 'object' || !obj)
			return obj;
		
		if (Array.isArray(obj))
			return tt.ea(obj.map(o => tt.ee(o)));

		const wrapped = {};
		for (const i in obj)
			wrapped[i] = tt.ee(obj[i]);
		return tt.eo(wrapped);
	},

	generateRequestObject(config: {
		authzString?: string | IAuthzGenerate,
		params?: object,
		query?: object,
		headers?: object,
		body?: any,
		slug?: string,
	} = {}): Request<any> {
	
		const headers = {
			...(config.headers || {})
		};
	
		for (const k in headers) {
			const lower = k.toLowerCase();
			if (k !== lower) {
				headers[lower] = headers[k];
				delete headers[k];
			}
		}
	
		// add auth only if an api key is not present
		if (!headers['x-api-key']) {
			headers['authorization'] = typeof config.authzString === 'string' 
				? config.authzString
				: tt.generateAuthzString(config.authzString);
		}
	
	
		for (const k in config.query) {
			if (typeof config.query[k] === 'object') {
				config.query[k] = JSON.stringify(config.query[k]);
			} else {
				config.query[k] = config.query[k].toString();
			}
		}
	
		const toR = {
			params: {[uniqueSlugNameNoColon]: config.slug || tt.testSlug, ...(config.params || {})},
			query: config.query || {},
			headers,
			body: config.body || {},
			header: (s: string) => (headers[s.toLowerCase()]),
		} as any;
	
		
		RequestHelperService.parseQueryStrings(toR);
		return toR;
	
	},

	generateAuthzString(config: IAuthzGenerate = {}) {
	
		const userId = config.userId || new ObjectId().toString();
		const obj: DecodedAuthzToken & DecodedAuthToken = {
			exp: 99999999999, 
			iss: 1, 
			slug: tt.testSlug, 
			sub: userId, 
			user: {
				_id: userId, 
				att: config.userAtts || [1, 2, 3, 4, 5],
				locs: config.userLocs || ["*"], 
				name: "user" 
			}
		};
		
		if (config.allLocs !== false)
			obj.data = { locs: config.allLocs || ['1', '2', '3'], };

		const auth = AuthHelperService.createJwt(obj);
	
		return "Bearer " + auth.jwtString;
	},

	appUse(app: express.Application) {
		RequestHelperService.getSlugByRequest = () => tt.testSlug as any;
		app.use(bodyParser.json(), (req, res, next) => {
			if (!req.query) { req.query = {}; }
			if (!req.params) { req.params = {}; }
			if (!req.params[uniqueSlugNameNoColon]) { req.params[uniqueSlugNameNoColon] = tt.testSlug; }
	
			RequestHelperService.parseQueryStrings(req);
	
			next();
		});
	},

	dropDatabase: () => {
		return CS.db.db(tt.testSlug).dropDatabase();
	}

};
(global as any).tt = TestTools;
import { CS } from '../../context.service';
import express from 'express';
import request from 'supertest';
import { RHGet } from '../rhget';
import { AbstractDbItemController } from '../../../object-format-controller/db-item/abstract-db-item.controller';
import { AuthHelperService } from '../../auth-helper.service';
import { LibModelClass } from '../../../utils/enums';
import { testSlug, appUse } from '../../../tests/setupTests';
import { ObjectId } from 'mongodb';
import { RequestHelperService } from '../../request-helper.service';
import { HttpRequestService } from '../../http-request.service';
import { ObjectUtils } from '../../../utils/object-utils';
import bodyParser from 'body-parser';
import { Error403 } from '../../../utils/errors/errors';
import { FetchableField } from '../../../object-format-controller/fetchable-field';
import { ModelFetchService } from '../model-fetch.service';
import { ControllersService } from '../../controllers.service';
import { UserController } from '../../../gateway-paths/globals/users/User.controller';

const app = express();
CS.express = app;

const auth = AuthHelperService.createJwt({
	data: { locs: ['1'] },
	exp: 2,
	iss: 1,
	slug: testSlug,
	sub: "1",
	user: {_id: '1', att: [1, 2, 3, 4], locs: ["1"], name: "user" }
});

const authString = "Bearer " + auth.jwtString;


class TestClass extends AbstractDbItemController<any> {
	modelClass = "testModelClass" as any;
	bePath = "testBePath" as any;
	collName = "testCollName" as any;
	dtd = {};

	// as the paths dont have the :uniqueSlug param
	// we need to manually give the db, because RequestHelperService.getSlugByReq dont work
	// TODO maybe add the RequestHelperService.getSlugByReq support ??
	getCollToUse(reqOrDbToUse): any {
		return CS.db.db(testSlug).collection(this.collName);
	}

	// we copy to be sure that the jest can track the object
	// because inside the fn the filters are modified
	// so we copy the object
	// so the expectCalledWith is working gud
	protected controlFilters(req, filters) {
		filters = {...filters};
		return super.controlFilters(req, filters);
	}

}

class TestUser extends AbstractDbItemController<any> {
	modelClass = "testUserModelClass" as any;
	bePath = "testUserBePath" as any;
	collName = "testUserCollName" as any;
	dtd = {};

	// as the paths dont have the :uniqueSlug param
	// we need to manually give the db, because RequestHelperService.getSlugByReq dont work
	// TODO maybe add the RequestHelperService.getSlugByReq support ??
	getCollToUse(reqOrDbToUse): any {
		return CS.db.db(testSlug).collection(this.collName);
	}
}

const controller = new TestClass();
const userController = new TestUser();
ControllersService.registerController(TestUser);
ControllersService.registerController(TestClass);
ControllersService.registerController(UserController as any);
const testPath = '/' + controller.bePath;
let firstId;

appUse(app);


// add 10 items to db
beforeAll(async () => {

	const done = await CS.db.db(testSlug).collection(userController.collName).insertMany([
		{name: "first", documentLocationsFilter: ['*']},
		{name: "second", documentLocationsFilter: ['*']},
	]);

	// TODO add ?
	const done2 = await CS.db.db(testSlug).collection(userController.collName).updateMany({}, {$set: {
		recursiveFetch: [
			new FetchableField(done.insertedIds[0].toString(), userController.modelClass),
			new FetchableField(done.insertedIds[1].toString(), userController.modelClass),
		]
	}});

	const toAdd = [];
	const usersObj = [
		new FetchableField(done.insertedIds[0].toString(), userController.modelClass),
		new FetchableField(done.insertedIds[1].toString(), userController.modelClass),
	];
	for (let i = 0; i < 10; i++) {
		
		toAdd.push({
			asd: i.toString(),
			deepArray: [
				{item: usersObj},
				{item: usersObj},
			],
			users: usersObj,
			_created: {
				_timestamp: Math.floor(new Date().getTime() / 1000),
				_author: new FetchableField(done.insertedIds[0].toString(), userController.modelClass),
			},
			documentLocation: "1",
			documentLocationsFilter: ["1"]
		});
	}

	const added = await CS.db.db(testSlug).collection(controller.collName).insertMany(toAdd);
	firstId = added.insertedIds[0];
	
});


app.get("/" + userController.bePath, (req, res, next) => {
	RHGet.executeGetMulti(req, res, userController);
});

app.get(testPath, (req, res, next) => {
	RHGet.executeGetMulti(req, res, controller);
});

app.get(testPath + '/:id', (req, res, next) => {
	RHGet.executeGetSingle(req, res, controller);
});

describe("rhget withouth options", () => {


	describe("get multiple", () => {

		it("returns the items normally", async () => {
			let res = await( request(app)
			.get(testPath)
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("Access-Control-Expose-Headers")).toBe(undefined);
			expect(res.get("x-filtered-count")).toBe(undefined);

			const expected: any[] = [];
			for (let i = 0; i < 10; i++) { expected.push({asd: i.toString()}); }
			expect(res.body).toEqual(expected.map(i => expect.objectContaining(i)));
		});

		
		it("test the filter", async () => {
			let res = await( request(app)
			.get(testPath)
			.query({getCount: true, filter: JSON.stringify({asd: {$in: ["1", "2"]}})})
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("x-filtered-count")).toBe("2");

			expect(res.body).toEqual([
				expect.objectContaining({asd: "1"}),
				expect.objectContaining({asd: "2"}),
			]);

			res = await( request(app)
			.get(testPath)
			.query({getCount: true, filter: JSON.stringify({$or: [{asd: "9"}, {asd: "5"}, {asd: "0"}]})})
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("x-filtered-count")).toBe("3");

			expect(res.body).toEqual([
				expect.objectContaining({asd: "0"}),
				expect.objectContaining({asd: "5"}),
				expect.objectContaining({asd: "9"}),
			]);

		});


		it("filter with _id field", async () => {

			let res = await(request(app)
			.get(testPath)
			.set("Authorization", authString)
			.expect(200));

			expect(res.body).toHaveLength(10);
			const ids = res.body.map(b => b._id);

			res = await( request(app)
			.get(testPath)
			.query({getCount: true, filter: JSON.stringify({_id: ids[0]})})
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("x-filtered-count")).toBe("1");

			expect(res.body).toEqual([
				expect.objectContaining({asd: "0"}),
			]);


			res = await( request(app)
			.get(testPath)
			.query({getCount: true, filter: JSON.stringify({_id: {$in: [ids[0], ids[1]]}})})
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("x-filtered-count")).toBe("2");

			expect(res.body).toEqual([
				expect.objectContaining({asd: "0"}),
				expect.objectContaining({asd: "1"}),
			]);
		});


		it("query parameters", async () => {
			let res = await( request(app)
			.get(testPath)
			.query({ getCount: true, limit: 2 })
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("x-filtered-count")).toBe("10");

			expect(res.body).toEqual([
				expect.objectContaining({asd: "0"}),
				expect.objectContaining({asd: "1"}),
			]);

			res = await( request(app)
			.get(testPath)
			.query({ getCount: true,  skip: 1, limit: 2, })
			.set("Authorization", authString)
			.expect(200));

			expect(res.get("x-filtered-count")).toBe("10");

			expect(res.body).toEqual([
				expect.objectContaining({asd: "1"}),
				expect.objectContaining({asd: "2"}),
			]);
			

			jest.spyOn(controller, 'findForUser');
			
			res = await( request(app)
			.get(testPath)
			.query({ getCount: true,  skip: 3, limit: 4, sort: JSON.stringify({asd: 1})})
			.set("Authorization", authString)
			.expect(200));
			
			expect(controller.findForUser).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {base: expect.objectContaining({skip: 3, limit: 4, sort: {asd: 1}})});
			expect(res.get("x-filtered-count")).toBe("10");
			expect(res.body).toHaveLength(4);



			res = await( request(app)
			.get(testPath)
			.query({ getCount: true,  skip: 3, limit: 3, sort: JSON.stringify({asd: -1})})
			.set("Authorization", authString)
			.expect(200));

			expect(controller.findForUser).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {base: expect.objectContaining({skip: 3, limit: 3, sort: {asd: -1}})});
			expect(res.get("x-filtered-count")).toBe("10");

			expect(res.body).toHaveLength(3);

		});

	});

	describe("get single", () => {

		it("gets the item", async () => {
			
			jest.spyOn(controller, 'findOneForUser');

			let res = await( request(app)
			.get(testPath + "/" + firstId)
			.set("Authorization", authString)
			.expect(200));

			expect(controller.findOneForUser).toHaveBeenLastCalledWith(expect.anything(), {_id: new ObjectId(firstId.toString())}, expect.anything());

		});

		it("errors on invalid _id and 404", async () => {
			
			let res = await( request(app)
			.get(testPath + "/" + "invalid_object_id")
			.set("Authorization", authString)
			.expect(403));

			res = await( request(app)
			.get(testPath + "/" + new ObjectId())
			.set("Authorization", authString)
			.expect(200));

			expect(res.text).toBe("");
			// request(app) creates an object even if nothing is sent ._.
			expect(res.body).toEqual({});

		});

	});

});

// oh lord
describe("rhget with options", () => {

	describe("Fetch", () => {

		jest.spyOn(HttpRequestService, "request");
		jest.spyOn(RHGet, "processGetOptions");

		(HttpRequestService.request as any).mockImplementation(async (obj) => {
			
			if (!obj.qs) { obj.qs = {}; }
			
			obj.qs = obj.qs || {};

			for (const k in obj.qs) {
				if (typeof obj.qs[k] === 'object') { obj.qs[k] = JSON.stringify(obj.qs[k]);}
				else { obj.qs[k] = obj.qs[k].toString(); }
			} 
			
			const res = await( request(app)
				.get(obj.url)
				.set("Authorization", obj.headers["Authorization"])
				.query(obj.qs || {})
			);

			return res.body;
		});		

		// TODO add this test
		it("gets fetched NON DELETED object", () => {
			console.log('finish me');
		});

		it("gets fetched DELETED object", () => {
			console.log('finish me');
		});

		it("gets the fetched of a fetched of a fetched etc...", async () => {
				// single
				let res = await( request(app)
				.get(testPath)
				.query({
					limit: 1,
					options: JSON.stringify({fetch: [{
						field: "users.0",
						bePath: userController.bePath,
					}, {
						field: "users.0.fetched.recursiveFetch.0",
						bePath: userController.bePath,
					}, {
						field: "users.0.fetched.recursiveFetch.0.fetched.recursiveFetch.*",
						bePath: userController.bePath,
					}, {
						field: "users.0.fetched.recursiveFetch.0.fetched.recursiveFetch.*.fetched.recursiveFetch.1",
						bePath: userController.bePath,
					}]}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			const item = res.body[0];
			expect(item.users[0].fetched).toBeTruthy();
			expect(item.users[1].fetched).toBeFalsy();

			expect(item.users[0].fetched.recursiveFetch[0].fetched).toBeTruthy();
			expect(item.users[0].fetched.recursiveFetch[1].fetched).toBeFalsy();

			expect(item.users[0].fetched.recursiveFetch[0].fetched.recursiveFetch[0].fetched).toBeTruthy();
			expect(item.users[0].fetched.recursiveFetch[0].fetched.recursiveFetch[1].fetched).toBeTruthy();

			expect(item.users[0].fetched.recursiveFetch[0].fetched.recursiveFetch[0].fetched.recursiveFetch[1].fetched).toBeTruthy();
			expect(item.users[0].fetched.recursiveFetch[0].fetched.recursiveFetch[1].fetched.recursiveFetch[1].fetched).toBeTruthy();
			expect(item.users[0].fetched.recursiveFetch[0].fetched.recursiveFetch[0].fetched.recursiveFetch[0].fetched).toBeFalsy();
			expect(item.users[0].fetched.recursiveFetch[0].fetched.recursiveFetch[1].fetched.recursiveFetch[0].fetched).toBeFalsy();

		});

		it("fetches the items in object, in arrays, and deep arrays", async () => {

			// single
			let res = await( request(app)
				.get(testPath)
				.query({
					limit: 1,
					options: JSON.stringify({fetch: [{
						field: "_created._author",
						bePath: userController.bePath,
					}]}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toEqual([
				expect.objectContaining({
					asd: "0",
					_created: expect.objectContaining({
						_author: expect.objectContaining({
							fetched: expect.objectContaining({
								name: "first",
							}),
						})
					})
				}),
			]);


			// normal array
			res = await( request(app)
				.get(testPath)
				.query({
					limit: 1,
					options: JSON.stringify({fetch: [{
						field: "users.*",
						bePath: userController.bePath,
					}]}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toEqual([
				expect.objectContaining({
					asd: "0",
					users: [
						expect.objectContaining({fetched: expect.objectContaining({name: "first"})}),
						expect.objectContaining({fetched: expect.objectContaining({name: "second"})}),
					]
				})
			]);

			// deep array
			res = await( request(app)
				.get(testPath)
				.query({
					limit: 1,
					options: JSON.stringify({fetch: [{
						field: "deepArray.*.item.*",
						bePath: userController.bePath,
					}]}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toEqual([
				expect.objectContaining({
					asd: "0",
					deepArray: [
						{item: [
							expect.objectContaining({fetched: expect.objectContaining({name: "first"})}),
							expect.objectContaining({fetched: expect.objectContaining({name: "second"})}),
						]},
						{item: [
							expect.objectContaining({fetched: expect.objectContaining({name: "first"})}),
							expect.objectContaining({fetched: expect.objectContaining({name: "second"})}),
						]},
					]
				})
			]);


		});

		it("filters on fetched items", async () => {

			let res = await( request(app)
				.get(testPath)
				.query({
					filter: JSON.stringify({"_created._author.fetched.name": "first"}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toHaveLength(10);


			// fetched on fetched 
			res = await (request(app)
				.get(testPath)
				.query({
					filter: JSON.stringify({ "_created._author.fetched.recursiveFetch.fetched.name": "first" }),
					fetch: JSON.stringify([
						{ field: '_created._author' },
						{ field: '_created._author.fetched.recursiveFetch.*' },
					]),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toHaveLength(10);

			res = await( request(app)
				.get(testPath)
				.query({
					filter: JSON.stringify({"_created._author.fetched.name": "second"}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toHaveLength(0);

			res = await( request(app)
				.get(testPath)
				.query({
					filter: JSON.stringify({"users.fetched.name": "second"}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toHaveLength(10);

			res = await( request(app)
				.get(testPath)
				.query({
					filter: JSON.stringify({"users.fetched.name": "second__a"}),
				})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(res.body).toHaveLength(0);


			res = await( request(app)
				.get(testPath)
				.query({
					filter: JSON.stringify({"deepArray.item.fetched.name": "second"}),
				})
				.set("Authorization", authString)
				.expect(200)
			);


			expect(res.body).toHaveLength(10);

			res = await( request(app)
			.get(testPath)
			.query({
				filter: JSON.stringify({"deepArray.item.fetched.name": "second__a"}),
			})
			.set("Authorization", authString)
			.expect(200)
			);

			expect(res.body).toHaveLength(0);
		});

	});

	describe("get multiple", () => {
		
		it("calls processOptions", async () => {
			(RHGet.processGetOptions as any).mockClear();

			// single
			let res = await( request(app)
				.get(testPath)
				.query({limit: 3})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(RHGet.processGetOptions as any).toHaveBeenLastCalledWith(
				expect.anything(), 
				[
					expect.objectContaining({asd: "0"}),
					expect.objectContaining({asd: "1"}),
					expect.objectContaining({asd: "2"}),
				]
			);

		});
		
		it("option => customQuery", async () => {

			const jestFn = jest.fn().mockReturnValue(new Promise<any>((r, j) => r([{agg: 1}])))

			app.get("/get-multi-opts-customQuery", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customQuery: jestFn,
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-customQuery")
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenCalledTimes(1)
			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{},
				{
					limit: 5000,
					collation: {locale: "en_US"},
				},
			);
			expect(res.body).toEqual([{agg: 1}]);


			// try with query parameters
			res = await( request(app)
				.get("/get-multi-opts-customQuery")
				.query({
					sort: JSON.stringify({_id: -1}),
					filter: JSON.stringify({asd: "1"}),
					limit: 10,
					projection: JSON.stringify({a: 1}),
					skip: 20,
				})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{
					asd: "1",
					
				},
				{
					sort: {_id: -1},
					limit: 10,
					projection: {a: 1},
					skip: 20,
					collation: {locale: "en_US"},
				}
			);
			expect(res.body).toEqual([{agg: 1}]);

		});

		it("option => middleware", async () => {

			const jestFn = jest.fn().mockReturnValue(new Promise<void>((r, j) => r()));

			app.get("/get-multi-opts-middleware-1", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					middleware: jestFn,
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-middleware-1")
				.query({limit: 1})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenCalledTimes(1)
			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				[expect.objectContaining({asd: "0"})],
			);
			expect(res.body).toEqual([expect.objectContaining({asd: "0"})]);


			

			app.get("/get-multi-opts-middleware-2", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					middleware: () => new Error403("middleware-error"),
				});
			});

			res = await( request(app)
				.get("/get-multi-opts-middleware-2")
				.query({limit: 1})
				.set("Authorization", authString)
				.expect(403)
			);

			expect(res.text).toBe('middleware-error')


			app.get("/get-multi-opts-middleware-3", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					middleware: () => new Promise<any>((r, j) => { throw new Error403("middleware-promise-error")}),
				});
			});

			res = await( request(app)
				.get("/get-multi-opts-middleware-3")
				.query({limit: 1})
				.set("Authorization", authString)
				.expect(403)
			);

			expect(res.text).toBe('middleware-promise-error')

		});

		it("option => customCountFiltered", async () => {

			const jestFn = jest.fn().mockReturnValue(new Promise<any>((r, j) => r(100)));

			app.get("/get-multi-opts-customCountFiltered-1", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customCountFiltered: jestFn,
					customCount: async (r, f) => 10000,
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-customCountFiltered-1")
				.query({getCount: true, limit: 1, filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenCalledTimes(1)
			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{asd: "0", },
			);
			expect(res.get("x-filtered-count")).toBe("100");
			expect(res.body).toEqual([expect.objectContaining({asd: "0"})]);




			app.get("/get-multi-opts-customCountFiltered-2", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customCountFiltered: false,
					customCount: async (r, f) => 10000,
				});
			});

			// no params
			res = await( request(app)
				.get("/get-multi-opts-customCountFiltered-2")
				.query({getCount: true, limit: 1, filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(res.get("x-filtered-count")).toBe("-1");
			expect(res.body).toEqual([expect.objectContaining({asd: "0"})]);

		});	

		it("option => customOptions", async () => {

			const jestFn = jest.spyOn(controller, 'findForUser');

			app.get("/get-multi-opts-customOptions-1", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customOptions: (req, filters) => {
						return {};
					}
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-customOptions-1")
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{asd: "0", },
				{base: {
					limit: 1,
					projection: {asd: 0},
					collation: {locale: "en_US"},
				}}
			);
			expect(res.body).toEqual([expect.any(Object)]);



			app.get("/get-multi-opts-customOptions-2", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customOptions: (req, filters) => {
						return {filters: {}};
					}
				});
			});

			// no params
			res = await( request(app)
				.get("/get-multi-opts-customOptions-2")
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{},
				{base: {
					limit: 1,
					projection: {asd: 0},
					collation: {locale: "en_US"},
				}}
			);
			expect(res.body).toEqual([expect.any(Object)]);


			// combine projections
			app.get("/get-multi-opts-customOptions-3", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customOptions: (req, filters) => {
						return {projection: {_id: 0,}};
					}
				});
			});

			res = await( request(app)
				.get("/get-multi-opts-customOptions-3")
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{asd: "0", },
				{base: {
					limit: 1,
					projection: {_id: 0, asd: 0},
					collation: {locale: "en_US"},
				}}
			);
			expect(res.body).toEqual([expect.any(Object)]);


			app.get("/get-multi-opts-customOptions-4", (req, res, next) => {
				RHGet.executeGetMulti(req, res, controller, {
					customOptions: (req, filters) => {
						return {filters: {}, projection: {_id: 0,}};
					}
				});
			});

			// no params
			res = await( request(app)
				.get("/get-multi-opts-customOptions-4")
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{},
				{base: {
					limit: 1,
					projection: {_id: 0, asd: 0},
					collation: {locale: "en_US"},
				}}
			);
			expect(res.body).toEqual([expect.any(Object)]);

		});

	});

	describe("get single", () => {

		it("calls processOptions", async () => {

			(RHGet.processGetOptions as any).mockClear();

			// single
			let res = await( request(app)
				.get(testPath + '/' + firstId)
				.query({limit: 1})
				.set("Authorization", authString)
				.expect(200)
			);

			expect(RHGet.processGetOptions as any).toHaveBeenLastCalledWith(
				expect.anything(), 
				[
					expect.objectContaining({asd: "0"}),
				]
			);
		});

		it("option => customQuery", async () => {

			const jestFn = jest.fn().mockReturnValue(new Promise<any>((r, j) => r({agg: 1})))

			app.get("/get-multi-opts-customQuery/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					customQuery: jestFn,
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-customQuery/" + firstId)
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenCalledTimes(1)
			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{_id: new ObjectId(firstId.toString())},
				{
					projection: {},
				},
			);
			expect(res.body).toEqual({agg: 1});


			// try with query parameters
			res = await( request(app)
				.get("/get-multi-opts-customQuery/" + firstId)
				.query({
					sort: JSON.stringify({_id: -1}),
					filter: JSON.stringify({asd: "1"}),
					limit: 10,
					projection: JSON.stringify({a: 1}),
					skip: 20,
				})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{_id: new ObjectId(firstId.toString())},
				{
					projection: {a: 1},
				}
			);
			expect(res.body).toEqual({agg: 1});

		});

		it("option => middleware", async () => {

			const jestFn = jest.fn().mockReturnValue(new Promise<void>((r, j) => r()));

			app.get("/get-multi-opts-middleware-1/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					middleware: jestFn,
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-middleware-1/" + firstId)
				.query({limit: 1})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenCalledTimes(1)
			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				expect.objectContaining({asd: "0"}),
			);
			expect(res.body).toEqual(expect.objectContaining({asd: "0"}));


			

			app.get("/get-multi-opts-middleware-2/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					middleware: () => new Error403("middleware-error"),
				});
			});

			res = await( request(app)
				.get("/get-multi-opts-middleware-2/" + firstId)
				.query({limit: 1})
				.set("Authorization", authString)
				.expect(403)
			);

			expect(res.text).toBe('middleware-error')


			app.get("/get-multi-opts-middleware-3/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					middleware: () => new Promise<any>((r, j) => { throw new Error403("middleware-promise-error")}),
				});
			});

			res = await( request(app)
				.get("/get-multi-opts-middleware-3/" + firstId)
				.query({limit: 1})
				.set("Authorization", authString)
				.expect(403)
			);

			expect(res.text).toBe('middleware-promise-error')

		});

		it("option => customOptions", async () => {

			const jestFn = jest.spyOn(controller, 'findOneForUser');

			app.get("/get-multi-opts-customOptions-1/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					customOptions: (req, filters) => {
						return {};
					}
				});
			});

			// no params
			let res = await( request(app)
				.get("/get-multi-opts-customOptions-1/" + firstId)
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{_id: new ObjectId(firstId.toString())},
				{base: {
					projection: {asd: 0},
				}}
			);
			expect(res.body).toEqual(expect.any(Object));



			app.get("/get-multi-opts-customOptions-2/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					customOptions: (req, filters) => {
						return {filters: {}};
					}
				});
			});

			// no params
			res = await( request(app)
				.get("/get-multi-opts-customOptions-2/" + firstId)
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{},
				{base: {
					projection: {asd: 0},
				}}
			);
			expect(res.body).toEqual(expect.any(Object));


			// combine projections
			app.get("/get-multi-opts-customOptions-3/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					customOptions: (req, filters) => {
						return {projection: {_id: 0,}};
					}
				});
			});

			res = await( request(app)
				.get("/get-multi-opts-customOptions-3/" + firstId)
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{_id: new ObjectId(firstId.toString())},
				{base: {
					projection: {_id: 0, asd: 0},
				}}
			);
			expect(res.body).toEqual(expect.any(Object));


			app.get("/get-multi-opts-customOptions-4/:id", (req, res, next) => {
				RHGet.executeGetSingle(req, res, controller, {
					customOptions: (req, filters) => {
						return {filters: {}, projection: {_id: 0,}};
					}
				});
			});

			// no params
			res = await( request(app)
				.get("/get-multi-opts-customOptions-4/" + firstId)
				.query({limit: 1, projection: JSON.stringify({asd: 0}), filter: JSON.stringify({asd: "0"})})
				.set("Authorization", authString)
			);

			expect(jestFn).toHaveBeenLastCalledWith(
				expect.anything(), 
				{},
				{base: {
					projection: {_id: 0, asd: 0},
				}}
			);
			expect(res.body).toEqual(expect.any(Object));

		});

	});

});

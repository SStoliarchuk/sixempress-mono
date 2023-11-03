import { CS } from '../../context.service';
import express from 'express';
import request from 'supertest';
import { RHPatch } from '../rhpatch';
import { AbstractDbItemController } from '../../../object-format-controller/db-item/abstract-db-item.controller';
import { AuthHelperService } from '../../auth-helper.service';
import { LibModelClass } from '../../../utils/enums';
import { testSlug, appUse } from '../../../tests/setupTests';
import { ObjectId } from 'mongodb';
import { Error403, Error422 } from '../../../utils/errors/errors';
import { FetchableField } from '../../../object-format-controller/fetchable-field';

const app = express();

const auth = AuthHelperService.createJwt({
	data: { locs: ['1']},
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
	dtd = {
		zzzz: {type: [String], required: true},
		asd: {type: [String], required: true},
	};

	// as the paths dont have the :uniqueSlug param
	// we need to manually give the db, because RequestHelperService.getSlugByReq dont work
	// TODO maybe add the RequestHelperService.getSlugByReq support ??
	getCollToUse(reqOrDbToUse): any {
		return CS.db.db(testSlug).collection(this.collName);
	}
}

const controller = new TestClass();
let testPath = '/' + controller.bePath;
let firstId: string;

appUse(app);

// add 1 items to db
beforeAll(async () => {
	const added = await CS.db.db(testSlug).collection(controller.collName).insertMany([{
		// normal patches
		asd: "0",
		documentLocation: "1",
		documentLocationsFilter: ["1"],
		// for fetched fields patch
		user: new FetchableField(new ObjectId().toHexString(), LibModelClass.User),
		// for priavte fields patch
		_created: {
			_timestamp: Math.floor(new Date().getTime() / 1000),
			_author: new FetchableField(new ObjectId().toHexString(), LibModelClass.User),
		},
	}]);
	firstId = added.insertedIds[0].toString();
	testPath += '/' + firstId;
});

app.patch(testPath + '/:id', (req, res, next) => {
	RHPatch.executePatch(req, res, controller);
});

describe("rhpatch withouth options", () => {

	it("verifies that the input is an array", async () => {

		let res = await ( request(app)
			.patch(testPath)
			.send()
			.set("Authorization", authString)
			.expect(403)
		);

		res = await ( request(app)
			.patch(testPath)
			.send("asd")
			.set("Authorization", authString)
			.expect(403)
		);

		res = await ( request(app)
			.patch(testPath)
			.send({})
			.set("Authorization", authString)
			.expect(403)
		);

		res = await ( request(app)
			.patch(testPath)
			.send([])
			.set("Authorization", authString)
			.expect(200)
		);

	});

	it("verifyPatchOperationFormat is called", async () => {

		const jestFn = jest.spyOn(controller, 'verifyPatchOps');
		jestFn.mockReturnValue(undefined);

		const verifyFormatFn = (jest as any).spyOn(RHPatch, 'verifyPatchOperationFormat');

		let opArr: any = [
			{ op: "set", path: "asd", value: "asd", },
			{ op: "unset", path: "xx", value: "", },
		];
		let res = await ( request(app)
			.patch(testPath)
			.send(opArr)
			.set("Authorization", authString)
			.expect(200)
		);
		// test that the function have been called
		expect(verifyFormatFn).toHaveBeenLastCalledWith(opArr);


		// try to see if the return value is respected

		verifyFormatFn.mockReturnValueOnce(new Error403("test-error"));
		res = await ( request(app)
			.patch(testPath)
			.send(opArr)
			.set("Authorization", authString)
			.expect(403)
		);
		expect(res.text).toBe("test-error");

		
		verifyFormatFn.mockReturnValueOnce(undefined)
		opArr = [{op: "asdasdasd", path: "xx"}];

		res = await ( request(app)
			.patch(testPath)
			.send(opArr)
			.set("Authorization", authString)
			.expect(200)
		);

		verifyFormatFn.mockRestore();
		jestFn.mockRestore();
	});

	it("calls controller.verifyPatchOps", async () => {

		const jestFn = jest.spyOn(controller, 'verifyPatchOps');
		const obj = await CS.db.db(testSlug).collection(controller.collName).findOne({});
		
		let opArr: any = [
			{ op: "set", path: "asd", value: "asd", },
			{ op: "unset", path: "xx", value: "", },
		];
		let res = await ( request(app)
			.patch(testPath)
			.send(opArr)
			.set("Authorization", authString)
			.expect(403)
		);

		expect(jestFn).toHaveBeenLastCalledWith(expect.objectContaining({_id: obj._id.toString()}), opArr, expect.anything());
		

		jestFn.mockReturnValueOnce(undefined);

		res = await ( request(app)
			.patch(testPath)
			.send(opArr)
			.set("Authorization", authString)
			.expect(200)
		);

		(jestFn as any).mockReturnValueOnce({"error1": "12"});

		res = await ( request(app)
			.patch(testPath)
			.send(opArr)
			.set("Authorization", authString)
			.expect(403)
		);
		expect(res.body).toEqual({error1: "12"});

	});

});

describe("rhpatch with options", () => {


	it("checks verifyPatchOp", async () => {

		const jestFn = jest.spyOn(controller, 'verifyPatchOps');
		jestFn.mockReturnValue(undefined);

		const opArr: any = [ { op: "unset", path: "xx", } ];
		const obj = await CS.db.db(testSlug).collection(controller.collName).findOne({});

		const mockFn: any = jest.fn().mockReturnValue(undefined);

		app.patch('/verifyPatchOps-mockFn/:id', (req, res) => {
			RHPatch.executePatch(req, res, controller, {
				verifyPatchOp: mockFn
			});
		});

		let res = await request(app)
		.patch('/verifyPatchOps-mockFn/' + firstId)
		.set("Authorization", authString)
		.send(opArr)
		.expect(200);

		expect(mockFn).toHaveBeenCalledTimes(1);
		expect(mockFn).toHaveBeenLastCalledWith(expect.anything(), opArr);




		mockFn.mockReturnValue(new Promise<void>((r, j) => r()));
		app.patch('/verifyPatchOps-promise/:id', (req, res) => {
			RHPatch.executePatch(req, res, controller, {
				verifyPatchOp: mockFn
			});
		});

		res = await request(app)
		.patch('/verifyPatchOps-promise/' + firstId)
		.set("Authorization", authString)
		.send(opArr)
		.expect(200);

		expect(mockFn).toHaveBeenCalledTimes(2);


		mockFn.mockReturnValue(new Error422("test error"));
		app.patch('/verifyPatchOps-error/:id', (req, res) => {
			RHPatch.executePatch(req, res, controller, {
				verifyPatchOp: mockFn
			});
		});

		res = await request(app)
		.patch('/verifyPatchOps-error/' + firstId)
		.set("Authorization", authString)
		.send(opArr)
		.expect(422);

		expect(mockFn).toHaveBeenCalledTimes(3);
		expect(res.text).toBe("test error")




		mockFn.mockImplementation(() => new Promise((r, j) => j(new Error422("test error"))));
		app.patch('/verifyPatchOps-promise-error/:id', (req, res) => {
			RHPatch.executePatch(req, res, controller, {
				verifyPatchOp: mockFn
			});
		});

		res = await request(app)
		.patch('/verifyPatchOps-promise-error/' + firstId)
		.set("Authorization", authString)
		.send(opArr)
		.expect(422);

		expect(mockFn).toHaveBeenCalledTimes(4);
		expect(res.text).toBe("test error")


		jestFn.mockRestore();
	});

});

describe("logic functions", () => {
	
	it("verifyPatchOperationFormat()", () => {
		let res;
		
		// errors

		res = RHPatch['verifyPatchOperationFormat']([
			{path: "asd", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "push", path: "asd"},
		] as any);
		expect(res).not.toBe(undefined);


		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "_hello", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "_id", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "hello._hello", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "hello.hi._hello", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "hello.hi.$[].asd", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "hellohi._id", value: "asd"},
		] as any);
		expect(res).not.toBe(undefined);



		// no errors

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "asd", value: "asd"},
		] as any);
		expect(res).toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "unset", path: "asd"},
		] as any);
		expect(res).toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "hello_hi.id", value: "asd"},
		] as any);
		expect(res).toBe(undefined);

		res = RHPatch['verifyPatchOperationFormat']([
			{op: "set", path: "hello.hi.id", value: "asd"},
		] as any);
		expect(res).toBe(undefined);

	});

});

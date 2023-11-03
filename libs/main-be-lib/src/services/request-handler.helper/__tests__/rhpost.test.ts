import { CS } from '../../context.service';
import jest from 'jest-mock';
import express from 'express';
import request from 'supertest';
import { RHPost } from '../rhpost';
import { AbstractDbItemController } from '../../../object-format-controller/db-item/abstract-db-item.controller';
import { AuthHelperService } from '../../auth-helper.service';
import { Error403, Error422, Error404 } from '../../../utils/errors/errors';
import { testSlug, appUse, generateRequestObject } from '../../../tests/setupTests';

const app = express();
appUse(app);
	
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
	modelClass = "ModelClass" as any;
	bePath = "bePath" as any;
	collName = "collname" as any;
	dtd = {
		asd: { type: [String], required: true},
		_underscore: {type: ['any'], required: false},
		any: {type: ['any'], required: false},
	};

	// as the paths dont have the :uniqueSlug param
	// we need to manually give the db, because RequestHelperService.getSlugByReq dont work
	// TODO maybe add the RequestHelperService.getSlugByReq support ??
	getCollToUse(reqOrDbToUse) {
		return CS.db.db(testSlug).collection(this.collName);
	}
}

const controller = new TestClass();
const testPath = '/' + controller.bePath;


app.post(testPath, (req, res, next) => {
	RHPost.executePost(req, res, controller);
});

describe("rhpost.ts", () => {

	it("checks that a body is given", async () => {
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.expect(403);
	});

	it("deny objects with fields starting with underscore", async () => {
	
		jest.spyOn(AbstractDbItemController, 'checkNoPrivateFieldInObject');

		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123", _underscore: "3"})
		.expect(403);

		expect(AbstractDbItemController.checkNoPrivateFieldInObject).toHaveBeenLastCalledWith({asd: "123", _underscore: "3"});
		(AbstractDbItemController.checkNoPrivateFieldInObject as any).mockRestore();

		// in root
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123", _underscore: "3"})
		.expect(403)

		
		// in object
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123", any: {field: '2'}})
		.expect(201)
			
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123", any: {field: {_field: '2'}}})
		.expect(403)


		// in array
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123", any: [{field: '2'}]})
		.expect(201)

		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123", any: [{field: '2'}, {field: {_field: '2'}}]})
		.expect(403)

	});

	it("calls the verifiable-object/abstract-dt-controller check functions", async () => {

		jest.spyOn(AbstractDbItemController, 'checkNoPrivateFieldInObject');
		jest.spyOn(TestClass.prototype, 'preInsertFunction');
		jest.spyOn(TestClass.prototype, 'verifyObject');
		jest.spyOn(TestClass.prototype, 'saveToDb');
		
		const resBody = (await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(201)
		).body;

		expect(resBody.asd).toBe("123");

		// test that it was called with the right arguments
		expect(AbstractDbItemController.checkNoPrivateFieldInObject).toHaveBeenLastCalledWith(expect.objectContaining({asd: "123"}));
		expect(TestClass.prototype.preInsertFunction).toHaveBeenLastCalledWith(expect.anything(), [expect.objectContaining({asd: "123"})], expect.anything());
		expect(TestClass.prototype.verifyObject).toHaveBeenLastCalledWith(expect.objectContaining({asd: "123"}));
		expect(TestClass.prototype.saveToDb).toHaveBeenLastCalledWith(expect.anything(), [expect.objectContaining({asd: "123"})], expect.anything());

		expect(AbstractDbItemController.checkNoPrivateFieldInObject).toHaveBeenCalledTimes(1);
		expect(TestClass.prototype.preInsertFunction).toHaveBeenCalledTimes(1);
		expect(TestClass.prototype.verifyObject).toHaveBeenCalledTimes(1);
		expect(TestClass.prototype.saveToDb).toHaveBeenCalledTimes(1);

		// test one by one functions so that each function if it errors it's cool

		(TestClass.prototype.verifyObject as any).mockReturnValue([]);
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(403);
		(TestClass.prototype.verifyObject as any).mockRestore();

		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(201);

		(AbstractDbItemController.checkNoPrivateFieldInObject as any).mockReturnValue(false);
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(403);
		expect(AbstractDbItemController.checkNoPrivateFieldInObject as any).toHaveBeenLastCalledWith({asd: "123"});
		(AbstractDbItemController.checkNoPrivateFieldInObject as any).mockRestore();

		(TestClass.prototype.preInsertFunction as any).mockReturnValue(new Error403("generror"));
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(403);
		(TestClass.prototype.preInsertFunction as any).mockRestore();


		(TestClass.prototype.saveToDb as any).mockImplementation(() => new Promise((r, j) => j(new Error403("generror"))));
		await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(403);
		(TestClass.prototype.saveToDb as any).mockRestore();


	});

	it("saves objects and array of objects", async () => {
		
		let res: any;

		res = (await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(201)
		).body;

		expect(res).not.toBeInstanceOf(Array);


		res = (await request(app)
		.post(testPath)
		.set("Authorization", authString)
		.send([{asd: "123"}])
		.expect(201)
		).body;

		expect(res).toBeInstanceOf(Array);

	});

	it("array options given are applied", async () => {
		
		app.post('/acceptOnlyArray', (req, res) => {
			RHPost.executePost(req, res, controller, {acceptOnlyArray: true});
		});

		await request(app)
		.post('/acceptOnlyArray')
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(403);

		await request(app)
		.post('/acceptOnlyArray')
		.set("Authorization", authString)
		.send([{asd: "123"}])
		.expect(201);




		app.post('/denyArrayPost', (req, res) => {
			RHPost.executePost(req, res, controller, {denyArrayPost: true});
		});

		await request(app)
		.post('/denyArrayPost')
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(201);

		await request(app)
		.post('/denyArrayPost')
		.set("Authorization", authString)
		.send([{asd: "123"}])
		.expect(403);


	});

	it("checks other post options given", async () => {
		app.post('/skipValidation', (req, res) => {
			RHPost.executePost(req, res, controller, {skipValidation: true});
		});

		await request(app)
		.post('/skipValidation')
		.set("Authorization", authString)
		.send({asd: 1})
		.expect(201);

		await request(app)
		.post('/skipValidation')
		.set("Authorization", authString)
		.send({asdhashdiaushduahsud: [{xx: 1}]})
		.expect(201);

		await request(app)
		.post('/skipValidation')
		.set("Authorization", authString)
		.send({asd: "123"})
		.expect(201);

	});
	
});

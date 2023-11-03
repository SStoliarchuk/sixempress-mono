import { AbstractDbItemController } from "../abstract-db-item.controller";
import jest from 'jest-mock';
import { IBaseModel } from "../../IBaseModel.dtd";
import { generateRequestObject } from "../../../tests/setupTests";
import { Request } from 'express';
import { generateAuthzString } from "../../../tests/setupTests";
import { ObjectId } from "mongodb";
import to from "await-to-js";
import { PatchOperation } from "../../../utils/dtd";
import { Error403 } from "../../../utils/errors/errors";
import { DeleteOptions } from "../../dtd";
import { ObjectUtils } from "../../../utils/object-utils";
import { MongoUtils } from "../../../utils/mongo-utils";
import { LogService } from "../../../services/log.service";


class A extends AbstractDbItemController<IBaseModel> {
	bePath = "BePath" as any; modelClass = "ModelClass" as any; collName = "Collection" as any; 
	dtd = {a: {type: [Number], required: false}} as any;
}
const instance = new A();

const getReqObj = () => generateRequestObject();

const setBase = async () => {
	await instance.deleteForUser(getReqObj(), {}, {completeDelete: true, deleteMulti: true});
	await instance.saveToDb(getReqObj(), [
		{a: 0, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 1, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 2, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 3, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 4, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 5, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 6, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 7, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 8, documentLocation: '1', documentLocationsFilter: ['1']} as any,
		{a: 9, documentLocation: '1', documentLocationsFilter: ['1']} as any,
	]);
};

declare var beforeEach: any;

beforeEach(async () => {
	await setBase();
});

describe("AbstractDbItemController abstract-db-item.controller..ts", () => {

	it("controlFilters is used", async () => {

		const falseReturnFilter = () => ({documentLocationsFilter: "1", _deleted: {$exists: false}});
		const falseReturnRequestObj = () => generateRequestObject({authzString: generateAuthzString({allLocs: ['1', '2'], userLocs: ['2']})});

		const list: {fnName: string, res: any, filter: any, req?: Request}[] = [
			{fnName: "findForUser", res: expect.arrayContaining([expect.objectContaining({a: 0}), expect.objectContaining({a: 1})]), filter: falseReturnFilter()},
			{fnName: "findForUser", res: [], filter: falseReturnFilter(), req: falseReturnRequestObj()},
			{fnName: "findForUser", res: [], filter: {}, req: falseReturnRequestObj()},

			{fnName: "findOneForUser", res: expect.objectContaining({a: 0}), filter: falseReturnFilter()},
			{fnName: "findOneForUser", res: null, filter: falseReturnFilter(), req: falseReturnRequestObj()},
			{fnName: "findOneForUser", res: null, filter: {}, req: falseReturnRequestObj()},

			{fnName: "countForUser", res: 10, filter: falseReturnFilter()},
			{fnName: "countForUser", res: 0, filter: falseReturnFilter(), req: falseReturnRequestObj()},
			{fnName: "countForUser", res: 0, filter: {}, req: falseReturnRequestObj()},

			{fnName: "aggregateForUser", res: expect.arrayContaining([{_id: 0}, {_id: 1}]), filter: [{$match: falseReturnFilter()}, {$group: {_id: "$a"}}]},
			{fnName: "aggregateForUser", res: [], filter: [{$match: falseReturnFilter()}, {$group: {_id: "$a"}}], req: falseReturnRequestObj()},
			// ensure it works even if the $match is not given explicitly
			{fnName: "aggregateForUser", res: [], filter: [{$group: {_id: "$a"}}], req: falseReturnRequestObj()},

			// ensure that the filter works after the request that dont work
			// just to be safe
			{fnName: "deleteForUser", res: {deletedCount: 1}, filter: falseReturnFilter()},
			{fnName: "deleteForUser", res: {deletedCount: 0}, filter: falseReturnFilter(), req: falseReturnRequestObj()},
			{fnName: "deleteForUser", res: {deletedCount: 1}, filter: falseReturnFilter()},
			{fnName: "deleteForUser", res: {deletedCount: 0}, filter: {}, req: falseReturnRequestObj()},
			{fnName: "deleteForUser", res: {deletedCount: 1}, filter: falseReturnFilter()},
		];

		const fn = jest.spyOn(instance, 'controlFilters' as any);

		for (const i of list) {
			fn.mockClear();

			const reqObj = i.req || getReqObj();

			const r = await instance[i.fnName](reqObj, i.filter);
			expect(r).toEqual(i.res);
			
			// check the controlFilter fn
			expect(fn).toHaveBeenCalledTimes(1);
			let foundTheCaller = false;

			// find
			try { 
				expect(fn).toHaveBeenLastCalledWith(reqObj, i.filter, undefined, expect.anything()); 
				foundTheCaller = true;
			} catch (e) { }
			// find one
			try {
				expect(fn).toHaveBeenLastCalledWith(reqObj, i.filter, true, expect.anything()); 
				foundTheCaller = true;
			} catch (e) {}
			// delete
			try {
				expect(fn).toHaveBeenLastCalledWith(reqObj, i.filter, true); 
				foundTheCaller = true;
			} catch (e) {}



			// search in the aggregate pipeline
			if (!foundTheCaller && i.fnName.includes('aggregate')) {
				for (const pipe of i.filter) {
					const ks = Object.keys(pipe);
					if (ks[0] === '$match') {
						try { 
							expect(fn).toHaveBeenLastCalledWith(reqObj, pipe['$match'], undefined, expect.anything()); 
							foundTheCaller = true;
							break;
						} catch (e) { }
					}
				}
				// no object found, probably called with an empty one and then unshifted
				// so ensure the $match is present
				if (!foundTheCaller) {
					expect(fn).toHaveBeenLastCalledWith(reqObj, expect.objectContaining({}), undefined, {}); 
					expect(i.filter.filter(p => Object.keys(p)[0] === '$match')).toHaveLength(1);
					foundTheCaller = true;
				}
			}
		
			if (!foundTheCaller) {
				throw new Error("Caller not found: " + i.fnName);
			}
		}
	});

	it("calls the protected overridable function", async () => {

		const list: {fnName: string, callerName: string, opts?: any}[] = [
			{fnName: "findForUser", callerName: "executeDbGet"},
			{fnName: "findOneForUser", callerName: "executeDbGet"},
			{fnName: "countForUser", callerName: "executeDbGet"},
			{fnName: "aggregateForUser", callerName: "executeDbGet"},

			// {fnName: "deleteForUser", callerName: "deleteOne", opts: {completeDelete: true}},
			// {fnName: "deleteForUser", callerName: "deleteMany", opts: {completeDelete: true, deleteMulti: true}},
			// {fnName: "deleteForUser", callerName: "updateOne", },
			// {fnName: "deleteForUser", callerName: "updateMany", opts: {deleteMulti: true}},
		];

		for (const i of list) {
			const fn = jest.spyOn(instance, i.callerName as any);
			fn.mockClear();

			const reqObj = getReqObj();
			await instance[i.fnName](reqObj, i.fnName.includes("aggregate") ? [{$match: {}}] : {}, i.opts);
			
			// check the controlFilter fn
			expect(fn).toHaveBeenCalledTimes(1);
		}

		const list2: {fnName: string, callerName: string, args: any[]}[] = [
			{fnName: "saveToDb", callerName: "executeDbSave", args: [[{a: 1, documentLocation: "1", documentLocationsFilter: ['1']}]]},
			{fnName: "patchSingle", callerName: "executeDbSave", args: [{_id: new ObjectId(), a: 1, documentLocation: "1", documentLocationsFilter: ['1']}, [{op: "set", path: "a", value: 2}]]},
			{fnName: "replaceItem__READ_DESCRIPTION", callerName: "patchSingle", args: [{}, {a: 1, documentLocation: "1", documentLocationsFilter: ['1']}, {base: {upsert: true}}]},
			{fnName: "replaceItem__READ_DESCRIPTION", callerName: "patchSingle", args: [{}, {documentLocation: "1", documentLocationsFilter: ['1']}]},
			{fnName: "replaceItem__READ_DESCRIPTION", callerName: "saveToDb", args: [{_impossibile_query: "_yee"}, {a: 1, documentLocation: "1", documentLocationsFilter: ['1']}, {base: {upsert: true}}]},
		];

		for (const i of list2) {
			const fn = jest.spyOn(instance, i.callerName as any);
			fn.mockClear();

			const reqObj = getReqObj();
			await instance[i.fnName](reqObj, ...i.args);
			
			// check the controlFilter fn
			expect(fn).toHaveBeenCalledTimes(1);
		}
		

	});

	// describe("findForUser()", () => {
	// 	const testFn = (data, req = getReqObj()) => {
	// 		return instance.findForUser(req, data);
	// 	};
	// });
	
	// describe("findOneForUser()", () => {
	// 	const testFn = (data, req = getReqObj()) => {
	// 		return instance.findOneForUser(req, data);
	// 	};
	// });
	
	// describe("countForUser()", () => {
	// 	const testFn = (data, req = getReqObj()) => {
	// 		return instance.countForUser(req, data);
	// 	};
	// });
	
	// describe("aggregateForUser()", () => {
	// 	const testFn = (data, req = getReqObj()) => {
	// 		return instance.aggregateForUser(req, data);
	// 	};
	// });
	
	describe("saveToDb()", () => {
		const testFn = (data: any[], req = getReqObj()) => {
			return instance.saveToDb(req, data);
		};

		it("doesnt error on items.length === 0", async () => {
			const r = await testFn([]);
			expect(r.insertedCount).toBe(0);
		});

		it("calls preInsert and throws its error", async () => {
			const fn = jest.spyOn(instance, 'preInsertFunction');
			fn.mockClear();

			const [err, done] = await to(testFn([{a: 1}]));
			expect(fn).toHaveBeenCalledTimes(1);
			expect(err).toEqual(await instance.preInsertFunction(getReqObj(), [{a: 1}] as any));

			fn.mockRestore();
		});

		it("adds incremental code", async () => {
			class NoIncrCode extends AbstractDbItemController<IBaseModel> {
				bePath = "BePath" as any; modelClass = "ModelClass" as any; collName = "Collection" as any; dtd = {};
			}
			class IncrCode extends AbstractDbItemController<IBaseModel> {
				bePath = "BePath" as any; modelClass = "ModelClass" as any; collName = "Collection" as any; dtd = {};
				addIncrementalValue = true;
			}
			const noIncrInst = new NoIncrCode();
			const incrInst = new IncrCode();

			const saveFn = (instance: AbstractDbItemController<IBaseModel>, objs: any[]) => {
				for (const o of objs) { o.documentLocation = '1'; o.documentLocationsFilter = ['1']; }
				return instance.saveToDb(getReqObj(), objs);
			}

			let res = await saveFn(incrInst, [{}, {}, {}, {}]);
			for (let i = 1; i < res.ops.length; i++) {
				expect(res.ops[i - 1]._progCode).toBe(i);
			}
			res = await saveFn(incrInst, [{}, {}, {}, {}, {}, {}]);
			for (let i = 1 + 4; i < res.ops.length; i++) {
				expect(res.ops[i - 1 - 4]._progCode).toBe(i);
			}

			res = await saveFn(noIncrInst, [{}, {}, {}, {}]);
			for (let i = 1; i < res.ops.length; i++) {
				expect(res.ops[i - 1]._progCode).toBe(undefined);
			}
			res = await saveFn(noIncrInst, [{}, {}, {}, {}, {}, {}]);
			for (let i = 1 + 4; i < res.ops.length; i++) {
				expect(res.ops[i - 1 - 4]._progCode).toBe(undefined);
			}

		});

		
	});
	
	
	describe("patchSingle()", () => {
		const testFn = (objFromBe: any, patchOps: PatchOperation[], req = getReqObj()) => {
			return instance.patchSingle(req, objFromBe, patchOps);
		};

		it("calls verifyPatchOps and throws its error", async () => {
			const fn = jest.spyOn(instance, 'verifyPatchOps');
			fn.mockClear();

			const objFromBe = {_id: new ObjectId(), a: 1, documentLocationsFilter: ["1"], documentLocation: '1'};
			const patches: PatchOperation<any>[] = [{op: "unset", path: "documentLocationsFilter", value: ""}];
			const [err, done] = await to(testFn(objFromBe, patches));

			expect(fn).toHaveBeenCalledTimes(1);
			expect(err).toEqual(new Error403(await instance.verifyPatchOps(objFromBe, patches)));

			fn.mockRestore();
		});

		it("doesnt error on patches.length === 0", async () => {

			const objFromBe = await instance.findOneForUser(getReqObj(), {});
			
			let patches: PatchOperation<any>[] = [{op: "set", path: "a", value: 2}];
			let res = await testFn(objFromBe, patches);
			expect(res.modifiedCount).toBe(1);

			patches = [];
			res = await testFn(objFromBe, patches);
			expect(res.modifiedCount).toBe(0);

			patches = [{op: "set", path: "a", value: 10}];
			res = await testFn(objFromBe, patches);
			expect(res.modifiedCount).toBe(1);

		});

		it("logs the changes", async () => {
			const fn = jest.spyOn(LogService, 'logChange');
			fn.mockClear();

			const objFromBe = {_id: new ObjectId(), a: 1, documentLocationsFilter: ["1"], documentLocation: '1'};
			const patches: PatchOperation<any>[] = [{op: "set", path: "a", value: 2}];
			await testFn(objFromBe, patches);

			const cloned = ObjectUtils.cloneDeep(objFromBe);
			MongoUtils.applyPatchOperationToObject(cloned, patches);

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenLastCalledWith(expect.anything(), instance.modelClass, objFromBe, cloned);

			fn.mockRestore();
		});

	});
	
	describe("deleteForUser()", () => {
		const testFn = (data, opts: DeleteOptions = {}, req = getReqObj()) => {
			return instance.deleteForUser(req, data, opts);
		};
		
		it("deletes completely the object", async () => {

			const count = () => instance.getCollToUse(getReqObj()).countDocuments();
			
			expect(await count()).toBe(10);
			await testFn({}, {completeDelete: true});
			expect(await count()).toBe(9);
			await testFn({}, {completeDelete: true});
			expect(await count()).toBe(8);
			await testFn({}, {completeDelete: true, deleteMulti: true});
			expect(await count()).toBe(0);

		});
		
		it("sets _deleted in the object", async () => {

			const countAll = () => instance.getCollToUse(getReqObj()).countDocuments();
			const countDeleted = () => instance.getCollToUse(getReqObj()).countDocuments({_deleted: {$exists: false}});
			
			expect(await countDeleted()).toBe(10);
			await testFn({_deleted: {$exists: false}});
			expect(await countDeleted()).toBe(9);
			await testFn({_deleted: {$exists: false}});
			expect(await countDeleted()).toBe(8);
			await testFn({_deleted: {$exists: false}}, {deleteMulti: true});
			expect(await countDeleted()).toBe(0);

			expect(await countAll()).toBe(10);
		});
		
	});

});

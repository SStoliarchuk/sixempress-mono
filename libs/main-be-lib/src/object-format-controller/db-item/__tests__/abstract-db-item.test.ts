import { AbstractDbItem } from "../abstract-db-item";
import { IBaseModel } from "../../IBaseModel.dtd";
import { generateRequestObject, generateAuthzString } from "../../../tests/setupTests";
import { RequestHelperService } from "../../../services/request-helper.service";
import { LibSysCollection, LibAttribute } from "../../../utils/enums";
import { SaveOptions } from "../../dtd";
import { IDtdTypes } from "../../dtd-declarer.dtd";

class A extends AbstractDbItem<IBaseModel> {
	bePath = "BePath" as any; modelClass = "ModelClass" as any; collName = "Collection" as any; 
	dtd = {a: {type: [String], required: false}} as any;
}
const instance = new A();

const getReqObj = () => generateRequestObject();

describe("AbstractDbItem abstract-db-item.ts", () => {

	it("checkNoPrivateFieldInObject()", () => {
		const testFn = AbstractDbItem.checkNoPrivateFieldInObject;

		expect(testFn({})).toBe(true);
		expect(testFn({a: 1})).toBe(true);
		expect(testFn({a: {b: {c: 1}}})).toBe(true);
		expect(testFn({a: {b: [{c: 1}], d: [1, 2, {s: {c: [1, {s: {e: 2}}]}}]}})).toBe(true);

		expect(testFn({_a: 1})).toBe(false);
		expect(testFn({a: {b: {_c: 1}}})).toBe(false);
		expect(testFn({a: {b: [{_c: 1}]}})).toBe(false);
		expect(testFn({a: {b: [{c: 1}], d: [1, 2, {s: {c: [1, {s: {_e: 2}}]}}]}})).toBe(false);

		expect(testFn({a: {b: {"c.2": 1}}})).toBe(false);
		expect(testFn({a: {b: [{c: 1}], d: [1, 2, {s: {c: [1, {s: {"e.2": 2}}]}}]}})).toBe(false);
	});

	it("canSkipField()", () => {
		const testFn = instance.canSkipField;

		expect(testFn('_asd')).toBe(true);
		expect(testFn('_sssss_')).toBe(true);
		expect(testFn('__a')).toBe(true);

		expect(testFn('asd_a')).toBe(false);
		expect(testFn('ss__')).toBe(false);
		expect(testFn('xxczxc')).toBe(false);
	});

	describe('ensurePrivateFieldsDidntChange()', () => {
		
		const fn = AbstractDbItem.ensurePrivateFieldsDidntChange;

		it('works', () => {
			expect(fn([{}], [{}])).toBe(true);
			expect(fn([{_asd: 1}], [{_asd: 1}])).toBe(true);
			
			expect(fn([{_asd: 1}], [{_asd: 2}])).toBe(false);
			expect(fn([{_asd: 1}], [{}])).toBe(false);
			expect(fn([{}], [{_asd: 12}])).toBe(false);
			
			expect(fn([{_asd: 1}], [{}], true)).toBe(true);

			expect(fn([{a: {b: {_c: 1}}}], [{}])).toBe(false);
			expect(fn([{a: {b: {_c: 1}}}], [{}], true)).toBe(true);
		});

	}); 

	describe("getDtd()", () => {
		
		it("adds docLoc fields to the object", () => {
			const d = instance.getDtd();
			expect(d).toEqual(instance.dtd);
			
			// doc loc + doc loc filters
			expect(Object.keys(d).length).toEqual(Object.keys(new A().dtd).length + 3);
			expect(d.physicalLocation).toBeTruthy();
			expect(d.documentLocation).toBeTruthy();
			expect(d.documentLocationsFilter).toBeTruthy();

			// the dtd won't change, so we can strictly check it
			expect(d.physicalLocation).toEqual({
				type: [String], required: false,
			});
			expect(d.documentLocation).toEqual({
				type: [String], required: true,
			});
			expect(d.documentLocationsFilter).toEqual({
				type: [Array], required: true, minArrN: 1, arrayDef: {type: [String]},
			});

		});

		it("adds the required flag based by the object properties", () => {

			const getInst = (requireDocLoc: boolean, requireDocLocFil: boolean) => {
				class NewInst extends AbstractDbItem<IBaseModel> {
					bePath = '' as any; modelClass = "" as any; collName = '' as any; dtd = {};
					requireDocumentLocation = requireDocLoc;
					requireDocumentLocationsFilter = requireDocLocFil;
				}
				return new NewInst();
			};

			let i = getInst(true, true);
			expect((i.getDtd().documentLocation as IDtdTypes<any>).required).toBe(true);
			expect((i.getDtd().documentLocationsFilter as IDtdTypes<any>).required).toBe(true);

			i = getInst(false, true);
			expect((i.getDtd().documentLocation as IDtdTypes<any>).required).toBe(false);
			expect((i.getDtd().documentLocationsFilter as IDtdTypes<any>).required).toBe(true);

			i = getInst(false, false);
			expect((i.getDtd().documentLocation as IDtdTypes<any>).required).toBe(false);
			expect((i.getDtd().documentLocationsFilter as IDtdTypes<any>).required).toBe(false);

		});

	});

	describe("getNextIncrementalValue()", () => {

		it("Calls with findAndUpdate to ensure that the counter dont collide", async () => {
			const fn = jest.fn();
			const oldFn = RequestHelperService.getClientDbBySlug;

			RequestHelperService.getClientDbBySlug = (reqOrDb: any) => ({
				collection: (Coll: string) => {
					fn.mockImplementation((...args) => (oldFn(reqOrDb).collection(Coll).findOneAndUpdate as any)(...args));
					return { findOneAndUpdate: fn };
				}
			}) as any;

			expect(fn).toHaveBeenCalledTimes(0);
			await instance['getNextIncrementalValue'](getReqObj(), 1);
			expect(fn).toHaveBeenCalledTimes(1);

			RequestHelperService.getClientDbBySlug = oldFn;
		});

		it("returns the increased value, not the one in the DB", async () => {
			const getCurrDbValue = async () => {
				const currObj = await RequestHelperService.getClientDbBySlug(getReqObj()).collection(LibSysCollection.Counters).findOne({_id: instance.modelClass});
				return currObj ? currObj.count : 0;
			}
			let currValue = await getCurrDbValue();
			
			let incremented = await instance['getNextIncrementalValue'](getReqObj(), 1);
			expect(incremented).toBe(currValue += 1);
			expect(await getCurrDbValue()).toBe(currValue);

			incremented = await instance['getNextIncrementalValue'](getReqObj(), 5);
			expect(incremented).toBe(currValue += 5);
			expect(await getCurrDbValue()).toBe(currValue);

			incremented = await instance['getNextIncrementalValue'](getReqObj(), 2);
			expect(incremented).toBe(currValue += 2);
			expect(await getCurrDbValue()).toBe(currValue);

			incremented = await instance['getNextIncrementalValue'](getReqObj(), 7);
			expect(incremented).toBe(currValue += 7);
			expect(await getCurrDbValue()).toBe(currValue);
		});

	});

	describe("preInsertFunction", () => {
		
		let objs: Partial<IBaseModel>[];
		const testFnWithAutoDoc = (toSave: Partial<IBaseModel>[], req = getReqObj(), options: SaveOptions = {}) => {
			for (const s of toSave) {
				if (!s.documentLocation) { s.documentLocation = "1"; }
				if (!s.documentLocationsFilter) { s.documentLocationsFilter = ["1"]; }
			}
			return testFn(toSave, req, options);
		};

		const testFn = (toSave: Partial<IBaseModel>[], req = getReqObj(), options: SaveOptions = {}) => {
			const r = instance['preInsertFunction'].bind(instance)(req, toSave, options)
			if (r) { throw r; }
		};


		it("adds _created field if not present", () => {
			
			let req = getReqObj();
			let expCre = RequestHelperService.getCreatedDeletedObject(req);
			expCre._timestamp = expect.any(Number);
			
			let o: Partial<IBaseModel> = {};
			testFnWithAutoDoc([o], req);
			expect(o._created).toEqual(expCre);

			const obs: any = [{}, {}, {_created: 1}, {}];
			testFnWithAutoDoc(obs, req);
			obs.forEach((ob, idx) => {
				if (idx === 2) {
					expect(ob._created).toBe(1);
				} else {
					expect(ob._created).toEqual(expCre);
				}
			});


		});

		it("adds automatic docLoc if there is only 1 avaible for the user or system", () => {
			objs = [{}, {}];
			testFn(objs, generateRequestObject({authzString: generateAuthzString({allLocs: ["a"]})}));

			objs.forEach(o => {
				expect(o.documentLocation).toEqual("a");
				expect(o.documentLocationsFilter).toEqual(["a"]);
			});

			objs = [{}, {}];
			testFn(objs, generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b", "x"], userLocs: ["x"]})}));

			objs.forEach(o => {
				expect(o.documentLocation).toEqual("x");
				expect(o.documentLocationsFilter).toEqual(["x"]);
			});
		});

		it("adds the docLocFilter array automatically if not given (takes the value from docLoc)", () => {
			objs = [{}, {}];
			testFn(objs, generateRequestObject({authzString: generateAuthzString({allLocs: ["a"]})}));

			objs.forEach(o => {
				expect(o.documentLocationsFilter).toEqual(["a"]);
			});


			objs = [{documentLocation: "1"}, {documentLocation: "2"}];
			testFn(objs, getReqObj());

			expect(objs[0].documentLocationsFilter).toEqual([objs[0].documentLocation]);
			expect(objs[1].documentLocationsFilter).toEqual([objs[1].documentLocation]);
		});

		it("verifies the object dtd", () => {
			const fn = jest.spyOn(instance, 'verifyObject');
			fn.mockClear();

			objs = [{}, {}];
			testFn(objs, generateRequestObject({authzString: generateAuthzString({allLocs: ["a"]})}));

			// one for each item
			expect(fn).toHaveBeenCalledTimes(2);
			expect(fn).toHaveBeenLastCalledWith(objs[1]);

			fn.mockRestore();

			// enusre dtd is verified
			expect(() => testFnWithAutoDoc([{a: "s"} as any])).not.toThrow();
			expect(() => testFnWithAutoDoc([{a: 2} as any])).toThrow();
		});

		it("verifies if the user is allowed to set the docLoc", () => {
			expect(() => {
				testFn([{}, {documentLocation: "a"}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocation: "b"}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["b"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocation: "b"}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a"]})}));
			}).toThrow();
		});

		it("verifies if the docLoc is present in the system", () => {
			expect(() => {
				testFn([{}, {documentLocation: "a"}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocation: "b"}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["b"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocation: "x"}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["x"]})}));
			}).toThrow();
		});

		it("verifies if the user is allowed to set docLocFilter values", () => {
			expect(() => {
				testFn([{}, {documentLocationsFilter: ["a"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocationsFilter: ["b"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["b"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocationsFilter: ["b"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a"]})}));
			}).toThrow();
		});

		it("verifies if the docLocFilter values are present in the system", () => {
			expect(() => {
				testFn([{}, {documentLocationsFilter: ["a"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{documentLocation: "a", documentLocationsFilter: ["a"]}, {documentLocation: "a", documentLocationsFilter: ["a", "b"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["a", "b"]})}));
			}).not.toThrow();

			expect(() => {
				testFn([{}, {documentLocationsFilter: ["a", "x"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userLocs: ["x"]})}));
			}).toThrow();
		});

		it("verifies the docLocFilter global visiblity logic", () => {
			expect(() => {
				testFn([{}, {documentLocationsFilter: ["*"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userAtts: [2], userLocs: ["*"]})}));
			}).toThrow();

			expect(() => {
				testFn([{}, {documentLocationsFilter: ["*"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userAtts: [2], userLocs: ["a", "b"]})}));
			}).toThrow();

			expect(() => {
				testFn([{}, {documentLocationsFilter: ["*"]}], generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userAtts: [LibAttribute.canSetGlobalLocFilter], userLocs: ["b"]})}));
			}).not.toThrow();

			// required docLocFil and value = *
			expect(() => {
				class AAA extends AbstractDbItem<any> {
					bePath = "BePath" as any; modelClass = "ModelClass" as any; collName = "Collection" as any; dtd = {};
				}
				const inst = new AAA();
				const r = inst.preInsertFunction(generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userAtts: [2], userLocs: ["b"]})}), [{}, {documentLocationsFilter: ["*"]}]);
				if (r) { throw r; }
			}).toThrow();

			// not required docLocFil and value = *
			expect(() => {
				class AAA extends AbstractDbItem<any> {
					bePath = "BePath" as any; modelClass = "ModelClass" as any; collName = "Collection" as any; dtd = {};
					requireDocumentLocationsFilter = false;
				}
				const inst = new AAA();
				const r = inst.preInsertFunction(generateRequestObject({authzString: generateAuthzString({allLocs: ["a", "b"], userAtts: [2], userLocs: ["b"]})}), [{}, {documentLocationsFilter: ["*"]}]);
				if (r) { throw r; }
			}).not.toThrow();
		});

		it("condenses the docLocFilter to * if * is present with other values", () => {
			objs = [{documentLocationsFilter: ["a", "c", '*', "d"]}, {documentLocationsFilter: ['*']}, {documentLocationsFilter: ['*', "a", "c"]}];
			testFnWithAutoDoc(objs, generateRequestObject({authzString: generateAuthzString({userAtts: [LibAttribute.canSetGlobalLocFilter]})}));
			objs.forEach((ob, idx) => expect(ob.documentLocationsFilter).toEqual(["*"]));
		});

	});

	describe("controlFilters", () => {
	
		const testFn = (filters: any, req = getReqObj(), skipDeleted?: boolean) => instance['controlFilters'](req, filters, skipDeleted);

		it("adds _deleted", () => {
			let r: any = testFn({});
			expect(r._deleted).toEqual({$exists: false});

			r = testFn({_deleted: null});
			expect(r._deleted).toEqual(undefined);

			r = testFn({_deleted: null}, undefined, true);
			expect(r._deleted).toEqual(null);
		});

		it.skip("adds documentLocationsFilter from the query.filter parameter", () => {
			let r: any = testFn({});
			expect(r.documentLocationsFilter).toBe(undefined);

			r = testFn({}, generateRequestObject({query: {filter: {documentLocationsFilter: "A"}}}));
			expect(r.documentLocationsFilter).toBe("A");

			r = testFn({}, generateRequestObject({query: {filter: {documentLocationsFilter: ['X', 'x']}}}));
			expect(r.documentLocationsFilter).toEqual(["X", 'x']);

			r = testFn({documentLocationsFilter: ['a']}, generateRequestObject({query: {filter: {documentLocationsFilter: ['X', 'x']}}}));
			expect(r.documentLocationsFilter).toEqual(["a"]);
		});

		it("adds filters for only the allowed locations", () => {
			
			let o: any = {};
			let r: any = testFn(o, generateRequestObject({authzString: generateAuthzString({allLocs: ['1', '2', '3'], userLocs: ['*']})}));
			expect(r.$and).toEqual(undefined);
			
			o = {};
			r = testFn(o, generateRequestObject({authzString: generateAuthzString({allLocs: ['1', '2', '3'], userLocs: ['1', '2']})}));
			expect(r.$and).toEqual(expect.arrayContaining([o, {documentLocationsFilter: {$in: ['1', '2', '*']}}]));

			o = {};
			r = testFn(o, generateRequestObject({authzString: generateAuthzString({allLocs: ['1', '2', '3'], userLocs: ['2']})}));
			expect(r.$and).toEqual(expect.arrayContaining([o, {documentLocationsFilter: {$in: ['2', '*']}}]));

			o = {documentLocationsFilter: "1"};
			r = testFn(o, generateRequestObject({authzString: generateAuthzString({allLocs: ['1', '2', '3'], userLocs: ['1']})}));
			expect(r.$and).toEqual(undefined);
			expect(r.documentLocationsFilter).toEqual("1");

			o = {documentLocationsFilter: "2"};
			r = testFn(o, generateRequestObject({authzString: generateAuthzString({allLocs: ['1', '2', '3'], userLocs: ['1']})}));
			expect(r).toEqual(false);

		});

	});

	
});

import { VerifiableObject } from '../verifiable-object.abstract';
import { IVerifiableItemDtd } from '../dtd-declarer.dtd';
import { ObjectUtils } from '../../utils/object-utils';
import { PatchOperation } from '../../utils/dtd';

interface ITest {
	string: string;
	regexp: string;
	number: number;
	numberRegex: number;

	lengthArray?: string[];

	simpleArr: string[];
	multiArr: (string | number)[];
	arrArr: string[][];
	complexArr: ({b: string, c?: number} | string)[];

	hashmap: {[k: string]: string};
	object: {
		testKey: string,
		notRequired?: number,
		hashmap?: {[k: string]: string},
		multiDef?: {a?: string | number} | {h: number} | {deep: {a: string}},
		objPos: {a: string},
		objDeep?: {d1: {d2: {d3: {val: string}}}}
		objectR?: {inObj: {a: string, b: string}};
	};

}

class Test extends VerifiableObject<any> {
	getDtd() { return this.dtd; }
	dtd: IVerifiableItemDtd<any> = {
		string: { type: [String], required: true, possibleValues: ['woo'], },
		regexp: { type: [String], required: true, regExp: /abc$/ },
		number: { type: [Number], required: true, minMaxNumber: [{ min: 0, max: 10, }]},
		numberRegex: { type: [Number], required: true, regExp: /^1.$/, minMaxNumber: [{ min: 0, max: 10, }] },
		
		lengthArray: { type: [Array], required: false, minArrN: 2, maxArrN: 5, arrayDef: {type: [String]}},

		simpleArr: { type: [Array], required: true, arrayDef: {  type: [String], possibleValues: ['note'] } },
		multiArr: { type: [Array], required: true, arrayDef: { type: [Number, String] } },
		arrArr: { type: [Array], required: true, arrayDef: { type: [Array], arrayDef: { type: [String] } } },
		complexArr: { type: [Array], required: true, arrayDef: { type: [String, Object], objDef: [{
			b: { type: [String], required: true, },
			c: { type: [Number], required: false }
		}] } },


		object: { type: [Object], required: true, objDef: [{
			testKey: { type: [String], required: true, possibleValues: ['a', 'b', 'c'], },
			notRequired: { type: [Number], required: false, },
			hashmap: { type: [Object], required: false, objDef: [String]},
			multiDef: { type: [Object], required: true, objDef: [{ 
				a: { type: [String, Number], required: false, }
			}, {
				h: { type: [Number], required: true },
			}, {
				deep: {type: [Object], required: true, objDef: [{
					a: {type: [String], required: true }
				}]}
			}] },
			objPos: { type: [Object], required: true, possibleValues: [{a: 'abc'}, {a: 'bca'}], objDef: [{
				a: { type: [String], required: true, }
			}] },
			objDeep: { type: [Object], required: false, objDef: [{
				d1: { type: [Object], required: true, objDef: [{
					d2: { type: [Object], required: true, objDef: [{
						d3: { type: [Object], required: true, objDef: [{
							val: { type: [String], required: true}
						}] },
					}] },
				}] },
			}] },
			objectR: { type: [Object], required: false, objDef: [{
				inObj: { type: [Object], required: true, objDef: [{ 
					a: { type: [String], required: true, },
					b: { type: [String], required: true, },
				}] },
			}] },
		}] },

		hashmap: { type: [Object], required: true, objDef: [String]},


	};
}

const verify = new Test();
const getMinValid = (): ITest => ({
	string: 'woo',
	regexp: 'abc',
	number: 0,
	numberRegex: 10,
	simpleArr: [],
	multiArr: [],
	arrArr: [],
	complexArr: [],
	object: {
		testKey: 'a',
		multiDef: {},
		objPos: {a: 'abc'}
	},
	hashmap: {}
});
const getMaxValid = (): ITest => {
	const min = getMinValid();
	min.complexArr = [
		'string', 
		'string',
		'string1',
		{ b: 'string'}, 
		{ b: 'asd', c: 10}
	];
	min.lengthArray = ['1', '2', '3', '4'];
	min.object.objDeep = {d1: {d2: {d3: {val: "sd"}}}};
	min.simpleArr = ['note', 'note', 'note'];
	min.multiArr = ['string', 10, 1, 'note'];
	min.arrArr = [['asd', 'aa', 'c'], [], ['sada', 'as']];
	min.object.objectR = {inObj: {a: "hghfr", b: "asd"}};
	min.hashmap = {dc: 'sss', a: "1"};
	min.object.hashmap = {a: "1", hhhh: "3", x: "512"};
	min.object.multiDef = { a: 'string' };
	return min;
};


describe("VerifiableObject verifiable-object.ts", () => {

	it.todo('type [Object] required false, does not accept null as value');

	// if we have N possible objDef, each defined by a "type" field with X possibile value
	// then if 1 objDef has just the {type: 1} field
	// and another has {type: 2, config} field
	// then if we pass {type: 2} withouth config field
	// the system did not error as on the *_required_* fields check, it didnt check for possibile values
	// it just controlled that the field type was present comparing it to the first DTD
	it('ensures that the possible values is checked when checking for required errors', () => {
		const dtd: IVerifiableItemDtd<any> = {
			n: {type: [Number], required: true},
			configuration: {type: [Object], required: false, objDef: [{
				purpose: {type: [Number], required: true, possibleValues: [2]},
				data: {type: [Object], required: true, objDef: [{
					asd: {type: [Number], required: true}
				}]},
			}, {
				purpose: {type: [Number], required: true, possibleValues: [1]},
			}]}
		};

		let e = VerifiableObject.verify({n: 1,configuration: {purpose: 2}}, dtd);
		
		expect(e).not.toBe(null);
		expect(e[0].possibleErrors).toEqual([
      [{field: 'configuration.data', message: 'Field cannot be undefined / Field has to be present'}],
      [{field: 'configuration.purpose',message: 'The required value for this field, does not match with the given one'}]
    ]);
	});
	

	// it.only('works for recursive dtd', () => {
	// 	const dtd: IVerifiableItemDtd<any> = {
	// 		name: {type: [String], required: true},
	// 		config: () => ({type: [Object], required: false, objDef: [dtd]}),
	// 	};

	// 	const e = VerifiableObject.verify({
	// 		name: 'asd',
	// 		config: {},
	// 	}, dtd);
	// 	console.log(e);
	// });

	it('allows for any type in multi objDef', () => {
		const dtd: IVerifiableItemDtd<any> = {
			config: {type: [Object], required: true, objDef: [{
				type: {type: [Number], required: true, possibleValues: [1]},
				src: {type: [Number], required: true}
			}, {
				type: {type: [Number], required: true, possibleValues: [2]},
				data: {type: ['any'], required: true}
			}]},
		};

		const e = VerifiableObject.verify({
			config: {type: 2, data: {}},
		}, dtd);
		expect(e).toBeFalsy();
	});

	it.todo('doesnt allow undefined fields for required: false')


	describe("verify creation", () => {


		it("checks for min-max arrays and numbers", () => {
			const obj: ITest = getMinValid();

			obj.lengthArray = [];
			expect(verify.verifyObject(obj)).not.toBe(undefined);

			obj.lengthArray = ['1', '2', '3', '4', '5', '6'];
			expect(verify.verifyObject(obj)).not.toBe(undefined);

			obj.lengthArray = ['1', '2', '3', '4', '5'];
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.lengthArray = ['1', '2', '3'];
			expect(verify.verifyObject(obj)).toBe(undefined);


			obj.number = -1;
			expect(verify.verifyObject(obj)).not.toBe(undefined);

			obj.number = 11;
			expect(verify.verifyObject(obj)).not.toBe(undefined);

			obj.number = 0;
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.number = 10;
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.number = 7;
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.number = 6;
			expect(verify.verifyObject(obj)).toBe(undefined);

		});

		it("allows multiple object definition", () => {
			const obj: ITest = getMaxValid();

			obj.object.multiDef = {h: 1};
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.object.multiDef = {};
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.object.multiDef = {a: 1};
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.object.multiDef = {a: "s"};
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.object.multiDef = {deep: {a: "a"}};
			expect(verify.verifyObject(obj)).toBe(undefined);

			obj.object.multiDef = {deep: {b: "a"}} as any;
			expect(verify.verifyObject(obj)).not.toBe(undefined);

			obj.object.multiDef = {deep: {}} as any;
			expect(verify.verifyObject(obj)).not.toBe(undefined);

		});


		it("doesn't error on correct object", () => {
			let obj: ITest;

			obj = getMaxValid();
			expect(verify.verifyObject(getMaxValid())).toBe(undefined);
			// no difference made to the object
			expect(obj).toEqual(getMaxValid());

			// minimum necessary
			expect(verify.verifyObject(getMinValid())).toBe(undefined);

			// another max check
			expect(verify.verifyObject({
				string: 'woo',
				regexp: '_1~>/31809abc',
				number: 7,
				numberRegex: 10,
				simpleArr: ['note', 'note'],
				multiArr: [1, 2, 3, 'a', 'b'],
				arrArr: [["a", "b", "c"], ["d", "e"], ["f"]],

				complexArr: ["a", "b", {b: "1"}, {b: "3"}, {b: "x", c: 12}],

				object: {
					testKey: "a",
					hashmap: {dsada: "2"},
					notRequired: 1,
					multiDef: {a: "2"},
					objPos: {a: 'bca'}
				},
				hashmap: {a: "2", c: "b", hh: '3'},
			})).toBe(undefined);
		});

		// check step by step each missing field to be signaled
		it("checks for missing required fields", () => {
			expect(verify.verifyObject({})).toEqual([
				{field: "string", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "regexp", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "number", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "numberRegex", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "simpleArr", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "multiArr", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "arrArr", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "complexArr", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "object", message: "Field cannot be undefined / Field has to be present"}, 
				{field: "hashmap", message: "Field cannot be undefined / Field has to be present"}
			]);

			expect(verify.verifyObject({
				string: "woo",
				regexp: "abc",
				number: 0,
				numberRegex: 10,
				simpleArr: [],
				multiArr: [],
				arrArr: [],
				complexArr: [],
				object: {},
				hashmap: {}
			})).toEqual([
				{field: "object.testKey", message: "Field cannot be undefined / Field has to be present",},
				{field: "object.multiDef", message: "Field cannot be undefined / Field has to be present",},
				{field: "object.objPos", message: "Field cannot be undefined / Field has to be present",},
			]);

			expect(verify.verifyObject({
				string: "woo",
				regexp: "abc",
				number: 0,
				numberRegex: 10,
				simpleArr: [],
				multiArr: [],
				arrArr: [],
				complexArr: [{c: 1}],
				object: {
					testKey: 'a',
					multiDef: {},
					objPos: {a: 'abc'},
				},
				hashmap: {}
			})).toEqual([
				{field: "complexArr.N.b", message: "Field cannot be undefined / Field has to be present"}
			]);

			expect(verify.verifyObject({
				string: "woo",
				regexp: "abc",
				number: 0,
				numberRegex: 10,
				simpleArr: [],
				multiArr: [],
				arrArr: [],
				complexArr: [{c: 1}],
				object: {
					testKey: 'a',
					multiDef: {},
					objPos: {a: 'abc'},
					objDeep: {},
					objectR: {},
				},
				hashmap: {}
			})).toEqual([
				{field: "complexArr.N.b", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objDeep.d1", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objectR.inObj", message: "Field cannot be undefined / Field has to be present"},
			]);

			let obj: ITest;
			obj = getMinValid();
			obj.object.objDeep = {} as any;
			obj.object.objectR = {} as any;
			expect(verify.verifyObject(obj)).toEqual([
				{field: "object.objDeep.d1", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objectR.inObj", message: "Field cannot be undefined / Field has to be present"},
			]);

			obj = getMinValid();
			obj.object.objDeep = {d1: {}} as any;
			obj.object.objectR = {inObj: {}} as any;
			expect(verify.verifyObject(obj)).toEqual([
				{field: "object.objDeep.d1.d2", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objectR.inObj.a", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objectR.inObj.b", message: "Field cannot be undefined / Field has to be present"},
			]);

			obj = getMinValid();
			obj.object.objDeep = {d1: {d2: {}}} as any;
			obj.object.objectR = {inObj: {a: ""}} as any;
			expect(verify.verifyObject(obj)).toEqual([
				{field: "object.objDeep.d1.d2.d3", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objectR.inObj.b", message: "Field cannot be undefined / Field has to be present"},
			]);

			obj = getMinValid();
			obj.object.objDeep = {d1: {d2: {d3: {}}}} as any;
			obj.object.objectR = {inObj: {b: ""}} as any;
			expect(verify.verifyObject(obj)).toEqual([
				{field: "object.objDeep.d1.d2.d3.val", message: "Field cannot be undefined / Field has to be present"},
				{field: "object.objectR.inObj.a", message: "Field cannot be undefined / Field has to be present"},
			]);

			obj = getMinValid();
			obj.object.objDeep = {d1: {d2: {d3: {val: ""}}}} as any;
			obj.object.objectR = {inObj: {b: "", a: ""}} as any;
			expect(verify.verifyObject(obj)).toBe(undefined);
		

		});


		it("errors on wrong value type given", () => {

			const fn = (
				obj: ({fieldType: any} | {val: any}) & {pathToField: string, obj?: ITest },
				res: { field?: string, message?: string, obj?: any[] } = {}
			) => {
				const values = "val" in obj ? [(obj as {val: any}).val] : [];
				if (!("val" in obj)) {
					const types = [String, Object, Array, Number, Boolean];
					types.splice(types.indexOf((obj as {fieldType: any}).fieldType.constructor), 1);
					types.forEach(t => {
						switch (t) {
							case String:
								values.push("");
								values.push("abc");
								break;
							case Object:
								values.push({});
								break;
							case Array:
								values.push([]);
								break;
							case Number:
								values.push(0);
								values.push(3);
								break;
							case Boolean:
								values.push(true);
								values.push(false);
								break;
						}
					});
				}

				const equal = res.obj || [{field: res.field || obj.pathToField, message: res.message || "Type not allowed for this field"}]
				values.forEach(v => {
					const min = obj.obj || getMaxValid();
					ObjectUtils.setValueByDotNotation(min, obj.pathToField, v);
					expect(verify.verifyObject(min)).toEqual(equal);
				});
			};

			
			// simple check
			fn({fieldType: "", pathToField: 'regexp'});
			fn({fieldType: 10, pathToField: 'number'});
			fn({fieldType: 10, pathToField: 'numberRegex'});
			fn({fieldType: [], pathToField: 'simpleArr'});
			fn({fieldType: [], pathToField: 'multiArr'});
			fn({fieldType: [], pathToField: 'arrArr'});
			fn({fieldType: [], pathToField: 'complexArr'});
			fn({fieldType: {}, pathToField: 'object'});
			fn({fieldType: {}, pathToField: 'hashmap'});

			fn({fieldType: 10, pathToField: 'object.notRequired'});
			fn({fieldType: {}, pathToField: 'object.hashmap'});
			fn({fieldType: {}, pathToField: 'object.multiDef'});
			fn({fieldType: {}, pathToField: 'object.objDeep'});
			fn({fieldType: {}, pathToField: 'object.objDeep.d1'});
			fn({fieldType: {}, pathToField: 'object.objDeep.d1.d2'});
			fn({fieldType: {}, pathToField: 'object.objDeep.d1.d2.d3'});
			fn({fieldType: "", pathToField: 'object.objDeep.d1.d2.d3.val'});
			fn({fieldType: {}, pathToField: 'object.objectR'});
			fn({fieldType: {}, pathToField: 'object.objectR.inObj'});
			fn({fieldType: "", pathToField: 'object.objectR.inObj.a'});
			fn({fieldType: "", pathToField: 'object.objectR.inObj.b'});
			
			// if there is a possibile value, then it has the priority over the type
			fn({fieldType: "", pathToField: 'string'}, {message: "The required value for this field, does not match with the given one"});
			fn({fieldType: "", pathToField: 'object.testKey'}, {message: "The required value for this field, does not match with the given one"});
			fn({fieldType: {}, pathToField: 'object.objPos'}, {message: "The required value for this field, does not match with the given one"});
			

			// deeper checks (on arr and obj the res can be more than 1 solution)
			fn({fieldType: "", pathToField: 'simpleArr.0'}, {obj: [
				{field: "simpleArr.0", message: "Type not allowed for this field"},
				{field: "simpleArr.0", message: "The required value for this field, does not match with the given one"},
			]});

			// deeper checks (on arr and obj the res can be more than 1 solution)
			fn({fieldType: "", pathToField: 'simpleArr.0'}, {obj: [
				{field: "simpleArr.0", message: "Type not allowed for this field"},
				{field: "simpleArr.0", message: "The required value for this field, does not match with the given one"},
			]});

			// manual check as it can have more than 1 value
			fn({pathToField: 'multiArr.0', val: []});
			fn({pathToField: 'multiArr.0', val: {}});
			fn({pathToField: 'multiArr.0', val: false});

			fn({pathToField: 'complexArr.0', val: []});
			fn({pathToField: 'complexArr.0', val: false});
			fn({pathToField: 'complexArr.0', val: {}}, {obj: [
				{field: "complexArr.N.b", message: "Field cannot be undefined / Field has to be present"}
			]});



		});

	});

	describe("verify patch", () => {

		it('tes', () => {
			expect(verify.verifyPatchOps(getMaxValid(), [])).toBe(undefined);
		})
		
		it("$push", () => {
			

			// no errors 


			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'simpleArr', value: 'note'},
				{op: 'push', path: 'simpleArr', value: 'note'},
			] as PatchOperation[])).toBe(undefined);
			
			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'multiArr', value: 1},
				{op: 'push', path: 'multiArr', value: 2},
				{op: 'push', path: 'multiArr', value: 'note'},
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'arrArr', value: []},
				{op: 'push', path: 'arrArr', value: ["1"]},
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'complexArr', value: '1'},
				{op: 'push', path: 'complexArr', value: '1'},
				{op: 'push', path: 'complexArr', value: '1'},
			] as PatchOperation[])).toBe(undefined);


			// errors

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'simpleArr', value: '1'},
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'arrArr', value: []},
				{op: 'push', path: 'arrArr', value: [3]},
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'complexArr', value: 1},
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'complexArr', value: {}},
			] as PatchOperation[])).not.toBe(undefined);


			// special error cases

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'zzzz', value: '1'},
			] as PatchOperation[])).toEqual([
				{field: 'zzzz', message: "The path does NOT exists"}
			]);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'z.z.z.z.z.z', value: '1'},
			] as PatchOperation[])).toEqual([
				{field: 'z.z.z.z.z.z', message: "The path does NOT exists"}
			]);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'push', path: 'string', value: '1'},
			] as PatchOperation[])).toEqual([
				{field: 'string', message: "The value is not an Array"}
			]);

		});

		it("$set", () => {

			let obj: ITest;

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'string', value: 'woo'}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'regexp', value: '7777777abc'}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'simpleArr', value: []}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'simpleArr.1', value: 'note'}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'object.objDeep.d1.d2.d3.val', value: 'note'}
			] as PatchOperation[])).toBe(undefined);

			obj = getMaxValid();
			delete obj.object.objDeep;
			expect(verify.verifyPatchOps(obj, [
				{op: 'set', path: 'object.objDeep.d1.d2.d3.val', value: 'note'}
			] as PatchOperation[])).toBe(undefined);

			obj = getMaxValid();
			delete obj.object.objectR;
			expect(verify.verifyPatchOps(obj, [
				{op: 'set', path: 'object.objectR.inObj.a', value: 'a'},
				{op: 'set', path: 'object.objectR.inObj.b', value: 'a'},
			] as PatchOperation[])).toBe(undefined);
			
			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'hashmap', value: {}},
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'hashmap', value: {a: "2"}},
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'hashmap.hhhd', value: "2"},
			] as PatchOperation[])).toBe(undefined);
			
			
			// errors

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'hashmap', value: {a: 2}},
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'hashmap', value: 2},
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'hashmap.hhhd', value: 2},
			] as PatchOperation[])).not.toBe(undefined);

			obj = getMaxValid();
			delete obj.object.objectR;
			expect(verify.verifyPatchOps(obj, [
				{op: 'set', path: 'object.objectR.inObj.a', value: 'a'},
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'simpleArr.100', value: 'note'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'simpleArr.1', value: []}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'z', value: 'x'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'z.z.z.z.z.z.z', value: 'asd'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'string', value: 'asd'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'set', path: 'object.multiDef', value: {b: 1}}
			] as PatchOperation[])).not.toBe(undefined);

		});

		it("unset", () => {
			
			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'zzz'}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'z.z.z.z.zz.z'}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'object.objectR'}
			] as PatchOperation[])).toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'object.hashmap'}
			] as PatchOperation[])).toBe(undefined);

			// errors

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'string'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'arrArr'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'object.objPos'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'object.objDeep.d1.d2.d3.val'}
			] as PatchOperation[])).not.toBe(undefined);

			expect(verify.verifyPatchOps(getMaxValid(), [
				{op: 'unset', path: 'object.objDeep.d1.d2'}
			] as PatchOperation[])).not.toBe(undefined);

		});

	});


});

import { ObjectUtils } from '../object-utils';
import { MongoUtils } from "../mongo-utils";
import { aggregatedRes } from './test.data';
import { ObjectId } from 'mongodb';

describe("mongo-utils", () => {

	describe.only('fixProjectionsPathCollision()', () => {

		const fn = (proj: any) => {
			MongoUtils.fixProjectionsPathCollision(proj);
			return proj;
		};

		// for example {customer: 1, customerNotice: 1} before was collapsed to {customer: 1}
		it('doesnt combine same words', () => {
			expect(fn({customer: 1, customerNotice: 1}))
			.toEqual({customer: 1, customerNotice: 1});

			expect(fn({_test_: 1, _test_ye: 1}))
			.toEqual({_test_: 1, _test_ye: 1});

			expect(fn({'deep.test.cust': 1, 'deep.test.custNotice': 1}))
			.toEqual({'deep.test.cust': 1, 'deep.test.custNotice': 1});
		});

		it('combines if the same path', () => {
			expect(fn({'deep.test.cust': 1, 'deep.test': 1}))
			.toEqual({'deep.test': 1});

			expect(fn({'a': 1, 'b': 1}))
			.toEqual({'a': 1, 'b': 1});

			expect(fn({'a': 1, 'a.a': 1, 'a.b': 1}))
			.toEqual({'a': 1});
		});

	});

	describe("manualProjection", () => {

		let arrayToGive: any[];
		const resetObj = () => arrayToGive = new Array(5).fill(undefined).map(i => ({
			a: 1,
			arr: [{a: 1, b: 1}, {a: 1, b: 1}],
			aArr: [1, 1, {a: 1, b: 1}, [{a: 1, b: 1}]],
			arrArr: [[{a: 1, b: 1}], [{a: 1, b: 1}]],
			obj: {
				a: 1,
				obj: {
					a: 1,
					b: 1
				},
				arr: [{a: 1, b: 1}, {obj: {a: 1, arr: [{a: 1, b: 1}]}}]
			}				
		}));

		const ensureAllProjectTheSame = () => {
			const base = arrayToGive[0];
			for (const i of arrayToGive) {
				expect(ObjectUtils.areVarsEqual(i, base)).toBe(true);
			}
		};

		const fn = (proj: any) => {
			resetObj();
			MongoUtils.manualProjection(arrayToGive, proj);
			ensureAllProjectTheSame();
			const tor = arrayToGive[0];
			resetObj();
			return tor;
		};

		resetObj();
		
		it("doesnt do anythiung on no projection", () => {
			resetObj()
			expect(fn({})).toEqual(arrayToGive[0])
		});

		// beforeEach(() => resetObj());

		describe("negative projection", () => {
			
			it("simple and deep", () => {
				resetObj()
				const noProjs = arrayToGive[0];
				const npks = Object.keys(noProjs);
	
				let r = fn({});
				expect(Object.keys(r)).toEqual(npks);
				expect(r.a).toBe(1);
	
				r = fn({a: 0});
				expect(Object.keys(r).length).toBe(npks.length - 1);
				expect(r.a).toBe(undefined);
	
				r = fn({a: 0, arr: 0, aArr: 0});
				expect(Object.keys(r).length).toBe(npks.length - 3);
				expect(r.a).toBe(undefined);
				expect(r.arr).toBe(undefined);
				expect(r.aArr).toBe(undefined);

				r = fn({'obj.a': 0});
				expect(Object.keys(r)).toEqual(npks);
				expect(r.obj.a).toBe(undefined);
			});

			it("array proj", () => {
				expect(arrayToGive[0].arr).toEqual([{a: 1, b: 1}, {a: 1, b: 1}]);
				expect(fn({'arr.a': 0}).arr).toEqual([{b: 1}, {b: 1}]);

				expect(arrayToGive[0].arrArr).toEqual([[{a: 1, b: 1}], [{a: 1, b: 1}]]);
				expect(fn({'arrArr.a': 0}).arrArr).toEqual([[{b: 1}], [{b: 1}]]);
			});

		});

		describe("positive projection", () => {

			it("simple and deep", () => {
				resetObj()
				const noProjs = arrayToGive[0];
				const npks = Object.keys(noProjs);
	
				let r = fn({});
				expect(r).toEqual(noProjs);
	
				r = fn({a: 1});
				expect(r).toEqual({a: 1});
	
				r = fn({a: 1, arr: 1, aArr: 1});
				expect(r).toEqual({
					a: noProjs.a,
					arr: noProjs.arr,
					aArr: noProjs.aArr,
				});

				r = fn({'obj.a': 1});
				expect(r).toEqual({
					obj: {
						a: noProjs.obj.a
					}
				});

				r = fn({'obj.a': 1, 'obj.obj': 1});
				expect(r).toEqual({
					obj: {
						a: noProjs.obj.a,
						obj: noProjs.obj.obj,
					}
				});
			});
			
			it("array proj", () => {
				expect(arrayToGive[0].aArr).toEqual([
					1, 1, {a: 1, b: 1}, [{a: 1, b: 1}]
				]);
				expect(fn({'aArr.a': 1})).toEqual({
					aArr: [{a: 1}, [{a: 1}]]
				});

				expect(arrayToGive[0].arrArr).toEqual([
					[{a: 1, b: 1}], [{a: 1, b: 1}]
				]);
				expect(fn({'arrArr.a': 1})).toEqual({
					arrArr: [[{a: 1}], [{a: 1}]]
				});

			});

			it("works in real world scenario (products-get threw a maximum call stack)", () => {
				const data = aggregatedRes;
				const proj = {
					"groupData.name": 1,
					"_productsGroupId": 1,
					"variationData": 1,
					"models.groupData.name": 1,
					"models._productsGroupId": 1,
					"models._productVariantsId": 1,
					"models.barcode": 1,
					"models.variationData": 1,
					"models._totalAmount": 1,
					"models._amountData": 1
				};

				expect(() => MongoUtils.manualProjection(data, proj)).not.toThrow();
				
				// ensure the optional keys are not inserted as undefined
				expect(Object.keys(data[1].models[0])).toEqual(expect.arrayContaining(["_productVariantsId"]))
				expect(Object.keys(data[2].models[0])).not.toEqual(expect.arrayContaining(["_productVariantsId"]))

				// ensure just that the values are present ffs
				expect(data[2]).toEqual({
					// string is always present unless removed explicitly
					"_id": expect.any(String), 

					"groupData": { name: expect.any(String) },
					"_productsGroupId": expect.any(String),
					"variationData": { "buyPrice": expect.any(Number), "sellPrice": expect.any(Number) },
					"models":[{
							"groupData":{ "name": expect.any(String) },
							"_productsGroupId":expect.any(String),
							"barcode":[expect.any(String)],
							"variationData":{ "buyPrice": expect.any(Number), "sellPrice": expect.any(Number), "variants":[] },
							"_totalAmount":expect.any(Number),
							"_amountData":{}
						}]
					}
				)
			})

		});

	});

	it("generatePatchOpForMongo()", () => {

		const testFn = MongoUtils.generatePatchOpForMongo;
		let res;

		res = testFn([
		]);
		expect(res).toBe(null);

		res = testFn([
			{op: 'xx' as any, path: "asd", value: 'xd' },
		]);
		expect(res).toBe(null);

		
		// objetcs
		res = testFn([
			{op: 'set', path: "a", value: 'b' },
			{op: 'set', path: "x", value: 'c' },
		]);
		expect(res).toEqual({
			$set: {a: "b", x: "c"},
		});

		res = testFn([
			{op: 'set', path: "a", value: 'b' },
			{op: 'set', path: "a", value: 'c' },
		]);
		expect(res).toEqual({
			$set: {a: "c"},
		});


		res = testFn([
			{op: 'unset', path: "a", value: ''},
			{op: 'unset', path: "b", value: ''},
		]);
		expect(res).toEqual({
			$unset: {a: "", b: ""},
		});

		res = testFn([
			{op: 'unset', path: "a", value: "2"},
			{op: 'unset', path: "b", value: "10"},
		]);
		expect(res).toEqual({
			$unset: {a: "", b: ""},
		});


		res = testFn([
			{op: 'push', path: "a" , value: "a"},
			{op: 'push', path: "b" , value: "b"},
		]);
		expect(res).toEqual({
			$push: {a: {$each: ["a"]}, b: {$each: ["b"]}},
		});

		res = testFn([
			{op: 'push', path: "a", value: "a"},
			{op: 'push', path: "a", value: "b"},
		]);
		expect(res).toEqual({
			$push: {a: {$each: ["a", "b"]}},
		});

		res = testFn([

			{op: 'set', path: "a", value: 'b' },
			{op: 'set', path: "x", value: 'c' },

			{op: 'set', path: "y", value: 'b' },
			{op: 'set', path: "y", value: 'c' },

			{op: 'unset', path: "a" },
			{op: 'unset', path: "b", value: "ax"},

			{op: 'push', path: "d" , value: "a"},
			{op: 'push', path: "c" , value: "b"},

			{op: 'push', path: "b" , value: "a"},
			{op: 'push', path: "b" , value: "b"},

			{op: 'push', path: "a", value: "a"},
			{op: 'push', path: "a", value: "b"},
		] as any);
		expect(res).toEqual({
			$set: {a: "b", x: "c", y: "c"},
			$unset: {a: "", b: ""},
			$push: {a: {$each: ["a", "b"]}, b: {$each: ["a", "b"]}, c: {$each: ["b"]}, d: {$each: ["a"]}},
		});

	});


	describe("mergeProjection()", () => {

		const fn = MongoUtils.mergeProjection as any;

		it("empty values", () => {
			expect(fn()).toEqual({});
	
			expect(fn({})).toEqual({});
	
			expect(fn({}, {}, {})).toEqual({});
		});


		it("forces negatives on empty", () => {
			// test that negative on empty are forced
			expect(fn({}, {aa: 0}, {})).toEqual({aa: 0});

			expect(fn({}, {aa: 0}, {_id: 0})).toEqual({aa: 0, _id: 0});
		});

		it("doesnt add positive on empty starting proj", () => {
			// force positive
			expect(fn({}, {_id: 1}, {aa: 1})).toEqual({});
	
			expect(fn({}, {_id: 1}, {asd: 0})).toEqual({asd: 0});
		});


		it("ensure it works with the _id behaviout", () => {
			// the id can be 0 when the rest are 1

			expect(fn({xx: 0}, {_id: 1}, {asd: 0})).toEqual({xx: 0, asd: 0});

			expect(fn({xx: 1}, {}, {_id: 0, asd: 1})).toEqual({_id: 0, xx: 1, asd: 1});
		})

	});


	it("equalProjection()", () => {
		const resultTrue = [];
		const resultFalse = [];

		resultTrue.push(MongoUtils.equalProjection(undefined, undefined));
		resultTrue.push(MongoUtils.equalProjection({}, {}));
		resultTrue.push(MongoUtils.equalProjection({_id: 1}, {_id: 1}));
		resultTrue.push(MongoUtils.equalProjection({_id: 1, b: 0}, {_id: 1, b: 0}));
		
		resultFalse.push(MongoUtils.equalProjection({}, undefined));
		resultFalse.push(MongoUtils.equalProjection(undefined, {}));
		resultFalse.push(MongoUtils.equalProjection({_id: 1}, {_id: 0}));
		resultFalse.push(MongoUtils.equalProjection({asd: 1}, {_id: 1}));
		resultFalse.push(MongoUtils.equalProjection({asd: 1}, {asd: 1, aa: 1}));

		expect(resultTrue).toEqual(expect.not.arrayContaining([false]));
		expect(resultFalse).toEqual(expect.not.arrayContaining([true]));

	});

	describe('idToObjectId()', () => {

		const fn = (f: any, reverse?: boolean) => {
			MongoUtils.idToObjectId(f, reverse);
			return f;
		};

		const id = () => new ObjectId().toString();

		let si = id();
		let oi = new ObjectId(si);

		it('ensure string id is not equal to object id', () => {
			expect(si).not.toEqual(oi);
			expect(new ObjectId(si)).toEqual(oi);
		});

		it('throws on invalid id', () => {
			expect(() => fn({_id: 'asd'})).toThrow();
			expect(() => fn({_id: 'aaa'})).toThrow();
			expect(() => fn({$or: [{_id: {$ne: 'aaa'}}]})).toThrow();

			expect(() => fn({_id: id()})).not.toThrow();
			expect(() => fn({$or: [{_id: {$ne: id()}}]})).not.toThrow();
		});

		it('simple id value', () => {
			expect(fn({_id: si})).toEqual({_id: oi});
		});
		
		it('$nin $in', () => {
			expect(fn({_id: {$nin: [si, si]}}))
				.toEqual({_id: {$nin: [oi, oi]}});

			expect(fn({_id: {$in: [si, si]}}))
				.toEqual({_id: {$in: [oi, oi]}});
		});

		it('$ne $eq', () => {
			expect(fn({_id: {$ne: si}}))
				.toEqual({_id: {$ne: oi}});

			expect(fn({_id: {$eq: si}}))
				.toEqual({_id: {$eq: oi}});
		});

		it('$and $or', () => {
			expect(fn({
				$and: [
					{$or: [{_id: si}]},
					{$or: [{_id: {$in: [si]}}]},
					{$or: [{_id: {$ne: si}}]},
				]
			})).toEqual({
				$and: [
					{$or: [{_id: oi}]},
					{$or: [{_id: {$in: [oi]}}]},
					{$or: [{_id: {$ne: oi}}]},
				]
			})
		});

		it('reverse', () => {
			expect(fn({
				$and: [
					{$or: [{_id: oi}]},
					{$or: [{_id: {$in: [oi]}}]},
					{$or: [{_id: {$ne: oi}}]},
				]
			})).toEqual({
				$and: [
					{$or: [{_id: oi}]},
					{$or: [{_id: {$in: [oi]}}]},
					{$or: [{_id: {$ne: oi}}]},
				]
			})

			expect(fn({
				$and: [
					{$or: [{_id: si}]},
					{$or: [{_id: {$in: [si]}}]},
					{$or: [{_id: {$ne: si}}]},
				]
			}, true)).toEqual({
				$and: [
					{$or: [{_id: si}]},
					{$or: [{_id: {$in: [si]}}]},
					{$or: [{_id: {$ne: si}}]},
				]
			})

			expect(fn({
				$and: [
					{$or: [{_id: oi}]},
					{$or: [{_id: {$in: [oi]}}]},
					{$or: [{_id: {$ne: oi}}]},
				]
			}, true)).toEqual({
				$and: [
					{$or: [{_id: si}]},
					{$or: [{_id: {$in: [si]}}]},
					{$or: [{_id: {$ne: si}}]},
				]
			})
		});

	});

});

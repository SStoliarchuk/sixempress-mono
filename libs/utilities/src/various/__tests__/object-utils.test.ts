import { ObjectUtils } from "../object-utils";

describe("ObjectUtils (object-utils.tsx)", () => {

	it("getValueByDotNotation()", () => {
		const fnVal = () => {};
		const obj = {a: 1, b: {c: 1}, f: {g: {h: {i: 1}, fn: fnVal}}};
		const fn = ObjectUtils.getValueByDotNotation;
		
		expect(fn(obj, 'a')).toBe(1);

		expect(fn(obj, 'b.c')).toBe(1);

		expect(fn(obj, 'f.g.h.i')).toBe(1);

		expect(fn(obj, 'f.g.h')).toEqual({i: 1});

		expect(fn(obj, 'f.g.h.')).toBe(undefined);

		expect(fn(obj, 'zz')).toBe(undefined);

		expect(fn(obj, 'zz.zz.zz')).toBe(undefined);

		expect(fn(obj, 'f.g.fn')).toBe(fnVal);

		const arr = [1, 2, {a: 3, b: [1, 2, {c: 3}]}];

		expect(fn(arr, '0')).toBe(1);

		expect(fn(arr, '2.a')).toBe(3);

		expect(fn(arr, '2.b.0')).toBe(1);

		expect(fn(arr, '2.b.2.c')).toBe(3);


	});

	it("setValueByDotNotation()", () => {
		const getObj = () => ({a: 1, b: {c: 1}, f: {g: {h: {i: 1}}}});
		let obj;
		const fn = (...args) => { 
			obj = getObj(); 
			return (ObjectUtils.setValueByDotNotation as any)(obj, ...args) 
		};

		fn('a', 2);
		expect(obj).toEqual({...getObj(), a: 2});

		fn('a.b', 2);
		expect(obj).toEqual({...getObj(), a: {b: 2}});
		
		fn('b.c', 2);
		expect(obj).toEqual({...getObj(), b: {c: 2}});

		fn('b.c', 2);
		expect(obj).toEqual({...getObj(), b: {c: 2}});

		fn('f.g.h.i', 2);
		expect(obj).toEqual({...getObj(), f: {g: {h: {i: 2}}}});

		fn('f.g.h.', 2);
		expect(obj).toEqual({...getObj(), f: {g: {h: {i: 1, '': 2}}}});

		fn('z', 1);
		expect(obj).toEqual({...getObj(), z: 1});

		fn('z.z.z', 1);
		expect(obj).toEqual({...getObj(), z: {z: {z: 1}}});

	});

	it("areArraysEqual()", () => {

		expect(ObjectUtils.areArraysEqual(
			[1, 2, 3],
			[3, 2, 1]
		)).toBe(true);

		expect(ObjectUtils.areArraysEqual(
			[1, 2, 2],
			[1, 1, 2]
		)).toBe(false);

		expect(ObjectUtils.areArraysEqual(
			[1, 2, "3"],
			[3, 2, 1]
		)).toBe(false);

		expect(ObjectUtils.areArraysEqual(
			[1, 2, undefined],
			[3, 2, null]
		)).toBe(false);

		expect(ObjectUtils.areArraysEqual(
			[1, 2],
			[3, 2, null]
		)).toBe(false);

		expect(ObjectUtils.areArraysEqual(
			[3, 2, null],
			[1, 2],
		)).toBe(false);


	});

	describe("objectDifference()", () => {
		
		it("basic difference", () => {

			expect(ObjectUtils.objectDifference(
				[1, 3],
				[1, 3]
			)).toBe(false);
	
			expect(ObjectUtils.objectDifference(
				[2, 3],
				[1, 3]
			)).toEqual({0: 1});
	
			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2},
				{a: 1, b: 3},
			)).toEqual({b: 3});
	
			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [2, 2]},
				{a: 1, b: 2, c: [1, 2]},
			)).toEqual({c: {0: 1}});
	
			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [1, 2]},
				{a: 1, b: 2, c: [1, 2]},
			)).toBe(false);
	
			expect(ObjectUtils.objectDifference(
				{a: 1, b: {c: {d: 2}}},
				{a: 1, b: {c: {d: 2, e: 2}}},
			)).toEqual({b: {c: {e: 2}}});
			
			expect(ObjectUtils.objectDifference(
				{a: 1, b: {c: {d: 2}}},
				{a: 1, b: {c: {d: 2, e: 2}, a: 2}},
			)).toEqual({b: {c: {e: 2}, a: 2}});
	
			expect(ObjectUtils.objectDifference(
				{a: 1, b: {c: {d: 2, x: 2}}},
				{a: 1, b: {c: {d: 2, e: 2}}},
			)).toEqual({b: {c: {e: 2, x: undefined}}});

			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [{a: 1, b: {c: 2}}, {a: 2}]},
				{a: 1, b: 2, c: [{a: 1, b: {c: 3}}, {a: 2}]},
			)).toEqual({c: {0: {b: {c: 3}}}});
			
	
		});

		it("opts.returnFullArray", () => {

			expect(ObjectUtils.objectDifference(
				[2, 3],
				[1, 3],
				{returnFullArray: true}
			)).toEqual([1, 3]);
	
			expect(ObjectUtils.objectDifference(
				[3, 1],
				[1, 3],
				{returnFullArray: true}
			)).toEqual([1, 3]);
	
			expect(ObjectUtils.objectDifference(
				[2, 3],
				[1, 3],
				{returnFullArray: true}
			)).toEqual([1, 3]);

			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [2, 2]},
				{a: 1, b: 2, c: [1, 2]},
				{returnFullArray: true}
			)).toEqual({c: [1, 2]});
	
			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [2, 2]},
				{a: 1, b: 2, c: [1, 2]},
				{returnFullArray: true}
			)).toEqual({c: [1, 2]});

			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [{a: 1, b: {c: 2}}]},
				{a: 1, b: 2, c: [{a: 1, b: {c: 2}}]},
				{returnFullArray: true}
			)).toBe(false);

			expect(ObjectUtils.objectDifference(
				{a: 1, b: 2, c: [{a: 1, b: {c: 2}}, {a: 2}]},
				{a: 1, b: 2, c: [{a: 1, b: {c: 3}}, {a: 2}]},
				{returnFullArray: true}
			)).toEqual({c: [{a: 1, b: {c: 3}}, {a: 2}]});
			
		});

		it("opts.ignorePrivateFields", () => {
			expect(ObjectUtils.objectDifference(
				{a: 1, _asd: 1},
				{a: 1, _asd: 1},
			)).toEqual(false);

			expect(ObjectUtils.objectDifference(
				{a: 1, _asd: 1},
				{a: 1, _asd: 2},
			)).toEqual({_asd: 2});

			expect(ObjectUtils.objectDifference(
				{a: 1, _asd: 1},
				{a: 1, _asd: 2},
				{ignorePrivateFields: true}
			)).toEqual(false);

			expect(ObjectUtils.objectDifference(
				{a: 1, c: [{_asd: 1}]},
				{a: 1, c: [{_asd: 2}]},
				{ignorePrivateFields: true}
			)).toEqual(false);

			expect(ObjectUtils.objectDifference(
				{a: 1, c: [{_asd: 1}]},
				{a: 1, c: [{_asd: 2}]},
			)).toEqual({c: {0: {_asd: 2}}});


			expect(ObjectUtils.objectDifference(
				{a: 1, c: [{_asd: 1}]},
				{a: 1, c: [{_asd: 2}]},
				{returnFullArray: true}
			)).toEqual({c: [{_asd: 2}]});

			expect(ObjectUtils.objectDifference(
				{a: 1, c: [{_asd: 1}]},
				{a: 1, c: [{_asd: 2}]},
				{returnFullArray: true, ignorePrivateFields: true}
			)).toEqual(false);

		});

	});

	it("objToPathAndValueHM()", () => {
		expect(ObjectUtils.objToPathAndValueHM(
			{a: 1}
		)).toEqual({a: 1});

		expect(ObjectUtils.objToPathAndValueHM(
			{a: {b: 1}}
		)).toEqual({'a.b': 1});

		expect(ObjectUtils.objToPathAndValueHM(
			{a: {b: {c: 0}}}
		)).toEqual({'a.b.c': 0});

		expect(ObjectUtils.objToPathAndValueHM(
			{a: {b: {c: [1, 2, 3]}}}
		)).toEqual({'a.b.c': [1, 2, 3]});

		expect(ObjectUtils.objToPathAndValueHM(
			{'a.b': 1, a: {b: 2}}
		)).toEqual({'a.b': 2});

		expect(ObjectUtils.objToPathAndValueHM(
			{a: {b: 2}, 'a.b': 1}
		)).toEqual({'a.b': 1});

		expect(ObjectUtils.objToPathAndValueHM({
			fetchArr: [{fetched: {obj: 1}}],
			arrFetchArr: [[{fetched: {obj: 1}}]],
			arrArrFetchArr: [[[{fetched: {obj: 1}}]]],
		})).toEqual({
			fetchArr: [{fetched: {obj: 1}}],
			arrFetchArr: [[{fetched: {obj: 1}}]],
			arrArrFetchArr: [[[{fetched: {obj: 1}}]]],
		});

		expect(ObjectUtils.objToPathAndValueHM({
			fetchArr: [{fetched: {obj: 1}}],
			arrFetchArr: [[{fetched: {obj: 1}}]],
			arrArrFetchArr: [[[{fetched: {obj: 1}}]]],
		}, true)).toEqual({
			"fetchArr.0.fetched.obj": 1,
			"arrFetchArr.0.0.fetched.obj": 1,
			"arrArrFetchArr.0.0.0.fetched.obj": 1,
		});


	});


	it("getPathToValue", () => {

		let ref;
		const fn = ObjectUtils.getPathToValue;

		expect(fn({
			a: 1
		}, 1)).toBe('a');

		expect(fn({
			a: [{
				dd: 3,
			}, {
				b: {
					c: 2, 
					d: [{
						g: 1
					}]
				}
			}
		]}
		, 1)).toBe('a.1.b.d.0.g');

		expect(fn({
			a: [{
				dd: 3,
			}, {
				b: {
					c: 2, 
					d: [{
						g: 1
					}]
				}
			}
		]}
		, 10)).toBe('');

		ref = {
			a: [{
				dd: 3,
			}, {
				b: {
					c: 2, 
					d: [{
						g: 1
					}]
				}
			}
		]};
		expect(fn(ref, ref.a[1].b)).toBe('a.1.b');

		// no match cause it's not the same ref
		expect(fn(ObjectUtils.cloneDeep(ref), ref.a[1].b)).toBe('');

		// match cause it's on steroid now
		expect(fn(ObjectUtils.cloneDeep(ref), ref.a[1].b, true)).toBe('a.1.b');

	});


	it("cloneDeep()", () => {
		const obj = {a: 1, b: "@", c: {d: 4, e: {f: 1}, s: [1, 2, {d: 3, g: [1]}]}};
		expect(ObjectUtils.cloneDeep(obj)).toEqual(obj);
	});

	it("indexOfByField()", () => {
		const arr = [
			{a: 2},
			{a: 1, 'a.b': 2, b: {c: 3, d: {a: 4}, f: [1, 2, {g: 3, q: {a: 2}}]}},
			{'a.b': 2},
			{b: {c: 3}},
			{a: 1, 'a.b': 2, b: {c: 3, d: {a: 4}, f: [1, 2, {g: 3, q: {a: 7}}]}},
		];

		expect(ObjectUtils.indexOfByField(arr,
			"a",
			2
		)).toBe(0);

		expect(ObjectUtils.indexOfByField(arr,
			"a.b",
			2
		)).toBe(-1);

		expect(ObjectUtils.indexOfByField(arr,
			"b.d.a",
			4
		)).toBe(1);

		expect(ObjectUtils.indexOfByField(arr,
			"b.f.0",
			1
		)).toBe(1);

		expect(ObjectUtils.indexOfByField(arr,
			"b.f.2.q.a",
			2
		)).toBe(1);

		expect(ObjectUtils.indexOfByField(arr,
			"b.f.2.q.a",
			7
		)).toBe(4);
		
	});

	it("arrayToHashmap()", () => {
		const arr: any = [
			{a: 1, 'a.b': 1, b: {c: 4, d: {a: 1}, f: [1, 1, {g: 1, q: {a: 1}}]}},
			{a: 2, 'a.b': 2, b: {c: 5, d: {a: 2}, f: [2, 2, {g: 2, q: {a: 2}}]}},
			{a: 3, 'a.b': 3, b: {c: 6, d: {a: 3}, f: [3, 3, {g: 3, q: {a: 3}}]}},
		];

		expect(ObjectUtils.arrayToHashmap(arr,
			'a',
		)).toEqual({1: arr[0], 2: arr[1], 3: arr[2]});

		expect(ObjectUtils.arrayToHashmap(arr,
			'',
		)).toEqual({undefined: arr[2]});

		expect(ObjectUtils.arrayToHashmap(arr,
			'z',
		)).toEqual({undefined: arr[2]});

		expect(ObjectUtils.arrayToHashmap(arr,
			'a.b',
		)).toEqual({undefined: arr[2]});

		expect(ObjectUtils.arrayToHashmap(arr,
			'b.d.a',
		)).toEqual({1: arr[0], 2: arr[1], 3: arr[2]});

		expect(ObjectUtils.arrayToHashmap(arr,
			'a',
			'b.c'
		)).toEqual({1: arr[0].b.c, 2: arr[1].b.c, 3: arr[2].b.c});

		expect(ObjectUtils.arrayToHashmap(arr,
			'a',
			'b.f.0'
		)).toEqual({1: arr[0].b.f[0], 2: arr[1].b.f[0], 3: arr[2].b.f[0]});

		expect(ObjectUtils.arrayToHashmap(arr,
			'b.f.2.q.a',
			'b.f.0'
		)).toEqual({1: arr[0].b.f[0], 2: arr[1].b.f[0], 3: arr[2].b.f[0]});

	});

	it("removeDuplicates()", () => {

		expect(ObjectUtils.removeDuplicates(
			[1, 2, 3, 3]
		)).toEqual([1, 2, 3]);

		expect(ObjectUtils.removeDuplicates(
			[3, 1, 2, 3, 3, 3, 3, 3, 3]
		)).toEqual([3, 1, 2]);

		expect(ObjectUtils.removeDuplicates(
			[1, 2, 2, {a: 1}, {a: 1}]
		)).toEqual([1, 2, {a: 1}]);

		expect(ObjectUtils.removeDuplicates(
			[1, 2, 2, [1, 2], [1, 2], [2, 1]]
		)).toEqual([1, 2, [1, 2], [2, 1]]);

		expect(ObjectUtils.removeDuplicates(
			[1, 2, 2, [1, 2], [1, 2], [1, {a: 3, c: {g: 2}}], [1, {a: 3, c: {g: 2}}]]
		)).toEqual([1, 2, [1, 2], [1, {a: 3, c: {g: 2}}]]);

	});
});
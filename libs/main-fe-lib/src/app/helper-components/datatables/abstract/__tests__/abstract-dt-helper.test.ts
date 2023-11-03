import { AbstractDtHelper } from "../abstract-dt-helper";
import { ICustomDtButtons, ICustomDtSettings, ICustomDtColumns } from "../../custom-dt-types";
import { Helpers } from "../../../../utils/various/helpers";
import { AuthService } from "../../../../services/authentication/authentication";
import { DTColumn, DTDataRequestObject } from "../../dt-logic/datatable.dtd";

describe("AbstractDtHelper abstract-dt-helper.ts", () => {

	describe("processing cols/btns", () => {

		const procCols = (a: any[]) => {
			// add data field as it's required for the test
			(a as any).forEach(i => i && !i.data ? i.data = Math.random().toString() : void 0);
			// return AbstractDtHelper.processDtColumns(a);
			return AbstractDtHelper.processDtColumns({columns: a} as ICustomDtSettings<any>);
		}

		const procBtns = (a: any[]) => {
			// return AbstractDtHelper.processDtButtons(a);
			return AbstractDtHelper.processDtButtons({buttons: a} as ICustomDtSettings<any>);
		}

		describe("removes not permitted or null cols/btns", () => {
			
			let items: any[] = [];
			
			it("removes null items", () => {
				items = [null, {}, {}, {}, undefined, {}, false, 0] as any;
				procBtns(items);
				expect(items).toHaveLength(4);
				expect(items.find(i => !i)).toBeUndefined();

				items = [{}, null, {}, undefined, {}, false, 0] as any;
				procCols(items);
				expect(items).toHaveLength(3);
				expect(items.find(i => !i)).toBeUndefined();
			});

			it("Checks the authorization and removes items not permitted", () => {
				AuthService.auth.client.tokenAuthz.user.att = [5];
				const mock = jest.spyOn(Helpers, 'isAuthorizedForItem');

				const fn = (fnToUse) => {
					mock.mockClear();
					// delete first and third item
					let counter = -1;
					mock.mockImplementation(() => ++counter === 1)
	
					const base = [{}, {}, {}];
					items = [...base];
					fnToUse(items);
					// it's called for each item
					expect(mock).toHaveBeenCalledTimes(base.length);
					// in the mock we delete first and third item
					expect(items).toHaveLength(1);
					expect(items[0]).toBe(base[1]);

					// basic tests

					mock.mockReturnValue(false);
					items = [...base];
					fnToUse(items);
					expect(items).toHaveLength(0);

					mock.mockReturnValue(true);
					items = [...base];
					fnToUse(items);
					expect(items).toHaveLength(3);
				}

				fn(procBtns);
				fn(procCols);

				mock.mockRestore();
			});

		});

		describe("btns", () => {

			let items: Partial<ICustomDtButtons<any>>[] = [];
			
			it("transform menuSingle into a type == menu and calls with first array element", () => {

				const onClickFn0 = jest.fn();
				const onClickFn1 = jest.fn();
				const onClickFn2 = jest.fn();

				items = [
					{type: {name: 'menu', items: [{title: "", onClick: onClickFn0}]}},
					{type: {name: 'menuSingle', items: [{title: "", onClick: onClickFn1}]}},
					{type: {name: 'menuSingle', items: [{title: "", onClick: onClickFn2}]}},
				];
				procBtns(items);

				// all tranformed to menu
				expect(items.filter(i => i.type.name === 'menu')).toHaveLength(items.length);

				items[0].type.items[0].onClick({} as any, [{}, {}]);
				expect(onClickFn0).toHaveBeenCalledTimes(1);
				expect(onClickFn0).toHaveBeenCalledWith(expect.anything(), [{}, {}]);

				items[1].type.items[0].onClick({} as any, []);
				expect(onClickFn1).toHaveBeenCalledTimes(1);
				expect(onClickFn1).toHaveBeenCalledWith(expect.anything(), undefined);

				items[2].type.items[0].onClick({} as any, [{}]);
				expect(onClickFn2).toHaveBeenCalledTimes(1);
				expect(onClickFn2).toHaveBeenCalledWith(expect.anything(), {});
			});

			describe("processes select field", () => {

				const isEnabled = (b: Partial<ICustomDtButtons<any>>, fnArg: any[]): boolean => {
					if (typeof b.enabled === 'undefined') { return true; }
					if (typeof b.enabled === 'boolean') { return b.enabled; }
					return b.enabled(fnArg)
				}

				it("is always off if button.enabled = false", () => {
					items = [{select: {type: 'single'}, enabled: false}, {select: {type: "multi"}, enabled: false}, {enabled: false}];
					procBtns(items);
					expect(items.filter(i => i.enabled === false)).toHaveLength(items.length);
				});

				it("adds the default function", () => {
					items = [{select: {type: 'single'}}, {select: {type: "multi"}}, {}];
					procBtns(items);
					// only the last item is not a select btn
					expect(items.filter(i => typeof i.enabled === 'function')).toHaveLength(items.length - 1);
	
					// test the single select
					expect(isEnabled(items[0], [])).toBe(false);
					expect(isEnabled(items[0], [{}])).toBe(true);
					expect(isEnabled(items[0], [{}, {}])).toBe(false);
	
					// test the multi
					expect(isEnabled(items[1], [])).toBe(false);
					expect(isEnabled(items[1], [{}])).toBe(true);
					expect(isEnabled(items[1], [{}, {}])).toBe(true);
	
					// test the always on
					expect(isEnabled(items[2], [])).toBe(true);
					expect(isEnabled(items[2], [{}])).toBe(true);
					expect(isEnabled(items[2], [{}, {}])).toBe(true);
				});

				it("uses the custom given logic", () => {
					const singleFn = jest.fn().mockImplementation((m) => m.a === 5);
					const multiFn = jest.fn().mockImplementation((ms) => ms.length === 5);
					items = [
						{select: {type: 'single', enabled: singleFn}}, 
						{select: {type: "multi", enabled: multiFn}},
						{}
					];
					procBtns(items);
					// only the last item is not a select btn
					expect(items.filter(i => typeof i.enabled === 'function')).toHaveLength(items.length - 1);
	
					// ensure the custom function is triggered only if there is one item in array
					// as the type is select single
					expect(isEnabled(items[0], [])).toBe(false);
					expect(singleFn).toHaveBeenCalledTimes(0);
					expect(isEnabled(items[0], [{}])).toBe(false);
					expect(singleFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[0], [{}, {}])).toBe(false);
					expect(singleFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[0], [{a: 5}])).toBe(true);
					expect(singleFn).toHaveBeenCalledTimes(2);
					expect(isEnabled(items[0], [{a: 5}, {a: 5}])).toBe(false);
					expect(singleFn).toHaveBeenCalledTimes(2);
	
					// ensure the custom function is triggered only if there is at least 1 item in the array
					expect(isEnabled(items[1], [])).toBe(false);
					expect(multiFn).toHaveBeenCalledTimes(0);
					expect(isEnabled(items[1], [{}])).toBe(false);
					expect(multiFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[1], [{}, {}])).toBe(false);
					expect(multiFn).toHaveBeenCalledTimes(2);
					expect(isEnabled(items[1], [{}, {}, {}])).toBe(false);
					expect(multiFn).toHaveBeenCalledTimes(3);
					expect(isEnabled(items[1], [{}, {}, {}, {}, {}])).toBe(true);
					expect(multiFn).toHaveBeenCalledTimes(4);
	
					// test the always on
					expect(isEnabled(items[2], [])).toBe(true);
					expect(isEnabled(items[2], [{}])).toBe(true);
					expect(isEnabled(items[2], [{}, {}])).toBe(true);

					// ensure no more calls
					expect(singleFn).toHaveBeenCalledTimes(2);
					expect(multiFn).toHaveBeenCalledTimes(4);
				});

				it("uses the root enabled fn before the custom given fn", () => {
					const singleFn = jest.fn().mockImplementation((m) => m.a === 5);
					const multiFn = jest.fn().mockImplementation((ms) => ms.length === 5);
					const singleRootFn = jest.fn().mockImplementation((m) => false);
					const multiRootFn = jest.fn().mockImplementation((m) => false);
					items = [
						{select: {type: 'single', enabled: singleFn}, enabled: singleRootFn},
						{select: {type: "multi", enabled: multiFn}, enabled: multiRootFn},
					];
					procBtns(items);

					// ensure that the base fn is called only if the sleected rows are 1
					// as its a select signle
					expect(isEnabled(items[0], [])).toBe(false);
					expect(singleRootFn).toHaveBeenCalledTimes(0);
					expect(isEnabled(items[0], [{}])).toBe(false);
					expect(singleRootFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[0], [{a: 5}])).toBe(false);
					expect(singleRootFn).toHaveBeenCalledTimes(2);
					expect(isEnabled(items[0], [{a: 5}, {a: 5}])).toBe(false);
					expect(singleRootFn).toHaveBeenCalledTimes(2);
					// as root return always false, the custom has never been called
					expect(singleFn).toHaveBeenCalledTimes(0);
	
					// ensure the root function is triggered only if there is at least 1 item in the array
					expect(isEnabled(items[1], [])).toBe(false);
					expect(multiRootFn).toHaveBeenCalledTimes(0);
					expect(isEnabled(items[1], [{}])).toBe(false);
					expect(multiRootFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[1], [{}, {}])).toBe(false);
					expect(multiRootFn).toHaveBeenCalledTimes(2);
					expect(isEnabled(items[1], [{}, {}, {}])).toBe(false);
					expect(multiRootFn).toHaveBeenCalledTimes(3);
					expect(isEnabled(items[1], [{}, {}, {}, {}, {}])).toBe(false);
					expect(multiRootFn).toHaveBeenCalledTimes(4);
					// as root return always false, the custom has never been called
					expect(multiFn).toHaveBeenCalledTimes(0);


					// ensure it passes thru if the root return true
					singleRootFn.mockReturnValue(true).mockClear();
					multiRootFn.mockReturnValue(true).mockClear();

					// single
					expect(isEnabled(items[0], [{}])).toBe(false);
					expect(singleRootFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[0], [{a: 5}])).toBe(true);
					expect(singleRootFn).toHaveBeenCalledTimes(2);

					// multi
					expect(isEnabled(items[1], [{}, {}, {}])).toBe(false);
					expect(multiRootFn).toHaveBeenCalledTimes(1);
					expect(isEnabled(items[1], [{}, {}, {}, {}, {}])).toBe(true);
					expect(multiRootFn).toHaveBeenCalledTimes(2);

				});

			});

		});

		describe("cols", () => {

			let items: Partial<ICustomDtColumns<any>>[] = [];

			it("sets orderable to false on field that access .fetched in data", () => {

				items = [{data: "123"}, {data: "asd"}, {data: "aaa.fetched.asdasd"}, {data: "sda.fetched"}];
				procCols(items);

				const noOrderable = items.filter(i => i.orderable === false);
				expect(noOrderable).toHaveLength(2);

				expect(noOrderable[0]).toBe(items[2]);
				expect(noOrderable[1]).toBe(items[3]);
			});

		});

	});

	describe("processing dt state for query params", () => {

		const fn = (dtParams: DTDataRequestObject, columns: Partial<ICustomDtColumns<any>>[] = []) => {
			return AbstractDtHelper.processDtParameters(dtParams, columns as DTColumn<any>[]);
		}

		it("adds base params", () => {
			
			expect(fn({}))
			.toEqual({});

			expect(fn({limit: 10}))
			.toEqual({limit: 10});

			expect(fn({order: [{column: 1, dir: 'asc'}]}, [{}, {data: "data-f"}]))
			.toEqual({sort: {"data-f": 1}});

			expect(fn({skip: 20}))
			.toEqual({skip: 20});

			// note the reversed sort order
			expect(fn({limit: 20, skip: 40, order: [{column: 0, dir: 'desc'}]}, [{data: "fname"}]))
			.toEqual({limit: 20, skip: 40, sort: {'fname': -1}});

		});

		describe("search field", () => {

			const searchFn = (dtParams: DTDataRequestObject, columns: Partial<ICustomDtColumns<any>>[] = []) => {
				const res = fn(dtParams, columns);
				return res && res.filter ? res.filter[0] : {};
			}

			it("basic search", () => {
				expect(searchFn({search: {value: "test", regex: true}}))
				.toEqual({})
	
				expect(searchFn({search: {value: "", regex: true}}, [{data: "f1"}]))
				.toEqual({})

				// ensure that there is no "falsy" check, so that 0 is not accidentaly discarded
				expect(searchFn({search: {value: "0", regex: true}}, [{data: "f1", search: {toInt: true}}]))
				.toEqual({$or: [{f1: 0}]})
	
				expect(searchFn({search: {value: "v", regex: false}}, [{data: "f1"}]))
				.toEqual({$or: [{f1: "v"}]})

				expect(searchFn({search: {value: "v", regex: false}}, [{data: "f1"}, {data: "f2"}, {data: "f3"}]))
				.toEqual({$or: [{f1: "v"}, {f2: 'v'}, {f3: 'v'}]})

				// with regex enabled
				expect(searchFn({search: {value: "v", regex: true}}, [{data: "f1"}, {data: "f2"}, {data: "f3"}]))
				.toEqual({$or: [{f1: {$regex: "v", $options: "i"}}, {f2: {$regex: "v", $options: "i"}}, {f3: {$regex: "v", $options: "i"}}]})
			});

			it("uses the column search options", () => {

				expect(searchFn(
					{search: {value: "v", regex: false}}, 
					[
						{data: "f0"}, 
						{data: "f1", search: {regex: true}}, 
						{data: "f2", search: false}, 
						{data: "f3", search: {toInt: true}},
						{data: "f4", search: {manual: (v) => ({f4: v + '_manual'})}},
					],
				))
				.toEqual({$or: [
					{f0: "v"}, 
					{f1: {$regex: "v", $options: "i"}}, 
					// {f2: 'v'}, 
					// {f3: 'v'},
					{f4: 'v_manual'},
				]});


				// invert regex rules
				// and check for toInt
				expect(searchFn(
					{search: {value: "123", regex: true}}, 
					[
						{data: "f0"}, 
						{data: "f1", search: {regex: false}}, 
						{data: "f2", search: false}, 
						{data: "f3", search: {toInt: true}},
						{data: "f4", search: {manual: (v) => ({f4: v + '_manual'})}},
					],
				))
				.toEqual({$or: [
					{f0: {$regex: "123", $options: "i"}}, 
					{f1: "123"}, 
					// {f2: 'v'}, 
					{f3: 123},
					{f4: '123_manual'},
				]});


			});

			it("adds byKey", () => {

				expect(searchFn({byKey: {a: [1, "2"], c: [2, {}]}}))
				.toEqual({$or: [{a: {$in: [1, "2"]}}, {c: {$in: [2, {}]}}]});

				// ensure it adds it in the array with already other filters on the field
				expect(searchFn(
					{
						search: {value: "tt", regex: false},
						byKey: {a: [1, "2"], c: [2, {}]},
					}, [
						{data: "f1"},
						{data: "a"},
					]
				))
				.toEqual({$or: [
					{f1: "tt"}, 
					{a: "tt"}, 
					{a: {$in: [1, "2"]}}, 
					{c: {$in: [2, {}]}},
				]});

			});

		});

	});

});

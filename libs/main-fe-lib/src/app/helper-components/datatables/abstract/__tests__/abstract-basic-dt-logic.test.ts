import { AbstractDbItemController } from "../../../../services/controllers/abstract-db-item.controller";
import { ModalComponentProps } from "@sixempress/theme";
import { CacheKeys } from "../../../../utils/enums/cache-keys.enum";
import { ICustomDtButtons, ICustomDtColumns, ICustomDtSettings } from "../../custom-dt-types";
import { DTToolbarProps } from "../../dt-logic/datatable.dtd";
import { AbstractBasicDtLogic } from "../abstract-basic-dt.logic";
import { AbstractDtHelper } from "../abstract-dt-helper";
import { ABDTAdditionalSettings, ABDTProps, TableVariation } from "../dtd";


const getController = () => {
	class Contr extends AbstractDbItemController<any> {
		bePath = "";
		fetchInfo = {};
		modelClass = '';
	}
	return new Contr();
}


const setInstance = (
	dtOpts?: Partial<ICustomDtSettings<any>>, 
	other: {
		passDtOptsAsRef?: Partial<ICustomDtSettings<any>>,
		keepbtnsOnselect?: boolean,
		defaultAvailableTables?: TableVariation[],
		addSetts?: ABDTAdditionalSettings<any>,
		mount?: boolean
	} = {},
	props: Partial<(ABDTProps<any> & ModalComponentProps)> = {}
) => {

	class TestClass extends AbstractBasicDtLogic<any> {
		constructor(p) {
			super(p);

			if (other.addSetts) {
				this.additionalSettings = other.addSetts;
			}
			if (other.keepbtnsOnselect) {
				this.removeButtonsOnSelectMode = false;
			}
			if (other.defaultAvailableTables) {
				this.defaultAvailableTables = other.defaultAvailableTables;
			}
			// for (const k in overrides) {
			// 	this[k] = overrides[k]
			// }
		}

		controller = getController();
		getDtOptions(): ICustomDtSettings<any> { 
			return other.passDtOptsAsRef as ICustomDtSettings<any> || {buttons: [], columns: [], ...(dtOpts || {})};
		}
	}

	instance = new TestClass(props);
	tt.setStateOverride(instance);
	
	// update controller Url
	if ((instance as any).controllerUrl) {
		availableTableCacheKey = CacheKeys.dataTableAvailableTablesPrefix + (instance as any).controllerUrl
	}

	if (other.mount !== false) {
		instance.componentDidMount();
	}

	return instance;
}

let availableTableCacheKey: string = CacheKeys.dataTableAvailableTablesPrefix;
let instance: AbstractBasicDtLogic<any>;

// beforeEach(() => {
// 	setInstance();
// })

describe("abstract-basic-dt-logic.ts", () => {

	describe("Prepares input for datatables", () => {

		const setInstanceDtOpts = (opts?: Partial<ICustomDtSettings<any>>, process: boolean = true) => {
			setInstance(opts, {mount: process});
			return instance;
		}

		// ensure that the creation of the table is on mount and not before
		// so that the children can extend the generation how much it wants
		it("sets the dtInput on mount", () => {
			setInstanceDtOpts({}, false);
			
			expect(instance.state.dtInput).toBeFalsy();
			instance.componentDidMount();
			expect(instance.state.dtInput).toBeTruthy();
		});


		it("processes cols and btns", () => {
			const mockCol = jest.spyOn(AbstractDtHelper, 'processDtColumns');
			const mockBtn = jest.spyOn(AbstractDtHelper, 'processDtButtons');

			setInstanceDtOpts({}, false);
			expect(mockCol).toHaveBeenCalledTimes(0);
			expect(mockBtn).toHaveBeenCalledTimes(0);
			
			instance.componentDidMount();
			expect(mockCol).toHaveBeenCalledTimes(1);
			expect(mockBtn).toHaveBeenCalledTimes(1);
			// ensure they are called with the same object that is in the state right now
			expect(mockCol).toHaveBeenLastCalledWith(instance.state.dtInput);
			expect(mockBtn).toHaveBeenLastCalledWith(instance.state.dtInput);
		});

		describe("toolbar", () => {

			// create the instance with given opts
			// mount it
			// and return the toolbar passed as dt props
			const fn = (opts: Partial<ICustomDtSettings<any>>) => {
				return setInstanceDtOpts(opts, true).state.dtInput.toolbar;
			}

			it("doesnt add toolbar if prop is false", () => {
				expect(fn({})).toBeTruthy();

				expect(fn({toolbar: false})).toBeFalsy();
			});


			it("sets the base auto toolbar", () => {
				expect(fn({buttons: [{title: "asd"}]})).toEqual(expect.objectContaining({buttons: [{title: "asd"}]}));
				
				expect(fn({hideDisabledButtons: true})).toEqual(expect.objectContaining({hideDisabledButtons: true}));
				
				expect(fn({hideDisabledButtons: false})).toEqual(expect.objectContaining({hideDisabledButtons: false}));
			});


			it("uses the given toolbar value to extend the automatically added", () => {
				expect(fn({toolbar: true})).toBeInstanceOf(Object);

				expect(fn({toolbar: "hello_title"})).toEqual(expect.objectContaining({title: "hello_title"}));

				expect(fn({toolbar: {title: "second_hello"}})).toEqual(expect.objectContaining({title: "second_hello"}));

				// notice the overridden buttons
				const extended: DTToolbarProps<any> = { hideDisabledButtons: true, title: "quack", buttons: [], search: false };
				expect(fn({buttons: [{title: "asd"}], toolbar: extended})).toEqual(expect.objectContaining(extended));
			});

			describe("Select mode", () => {

				// mounts and returns the buttons
				const selFn = (sel: {mode: 'single' | "multi", fn?: Function}, btns: ICustomDtButtons<any>[] = [], keepBtn: boolean = false) => {
					setInstance(
						{buttons: btns}, 
						{keepbtnsOnselect: keepBtn}, 
						{emeddedData: {selectMode: sel.mode, onSelectConfirm: (sel.fn || (() => {})) as any}, isEmbedded: 'select'},
					);
					instance.componentDidMount();
					return (instance.state.dtInput.toolbar as DTToolbarProps<any>).buttons;
				}

				it("removes all the buttons on select mode", () => {
					const allBtns = selFn({mode: "single"}, [{title: 'asd'}, {title: 'asd'}]);
					expect(allBtns).toHaveLength(1);
					expect(allBtns[0].title).toBe("Conferma");
				});

				it("keeps the buttons on select mode if the props says", () => {
					const allBtns = selFn({mode: "single"}, [{title: 'asd1'}, {title: 'asd2'}, {title: 'asd3'}], true);
					expect(allBtns).toHaveLength(4);
					expect(allBtns[0].title).toBe("Conferma");
					expect(allBtns.map(b => b.title).join('.')).toBe("Conferma.asd1.asd2.asd3");
				});

				it("the confirm button is enabled base on selectMode single/multi", () => {
					let allBtns = selFn({mode: "single"});
					let enabledFn = allBtns[0].enabled as Function;
					expect(enabledFn([])).toBe(false);
					expect(enabledFn([{}])).toBe(true);
					expect(enabledFn([{}, {}])).toBe(false);

					// multi
					allBtns = selFn({mode: "multi"});
					enabledFn = allBtns[0].enabled as Function;
					expect(enabledFn([])).toBe(false);
					expect(enabledFn([{}])).toBe(true);
					expect(enabledFn([{}, {}])).toBe(true);
				});

				it("triggers onClick passed prop", () => {
					// we trigger on click always if there is at least 1 item
					// regardless of single or multi mode
					const mock = jest.fn();
					const allBtns = selFn({mode: 'single', fn: mock});
					
					allBtns[0].onClick({} as any, []);
					expect(mock).toHaveBeenCalledTimes(0);

					allBtns[0].onClick({} as any, [{}]);
					expect(mock).toHaveBeenCalledTimes(1);

					allBtns[0].onClick({} as any, [{}, {}]);
					expect(mock).toHaveBeenCalledTimes(2);
				});

			});

		});

		it("adds default data source if not given", () => {
			setInstanceDtOpts();
			expect(instance.state.dtInput.data).toBeInstanceOf(Function);

			let d: any = [];
			setInstanceDtOpts({data: d});
			expect(instance.state.dtInput.data).toBe(d);

			d = (() => {});
			setInstanceDtOpts({data: d});
			expect(instance.state.dtInput.data).toBe(d);
		});

	});

	describe("Available Tables", () => {

		it("restores from cache else uses the default available", () => {
			// no def / no stored
			setInstance().componentDidMount();
			expect(instance.state.availableTables).toEqual([]);

			// use default 
			let def = [{name: "a", filters: {}}];
			setInstance({}, {defaultAvailableTables: def}).componentDidMount();
			expect(instance.state.availableTables).toBe(def);
			expect(instance.state.availableTables).toHaveLength(1);

			// prefer the stored
			let stored = [{name: "c", filters: {}}, {name: "zz", filters: {}}, {name: "quack", filters: {}}];
			localStorage.setItem(availableTableCacheKey, JSON.stringify(stored))
			setInstance({}, {defaultAvailableTables: def}).componentDidMount();
			expect(instance.state.availableTables).toEqual(stored);

			// prefer the stored
			// withouth def
			localStorage.setItem(availableTableCacheKey, JSON.stringify(stored))
			setInstance().componentDidMount();
			expect(instance.state.availableTables).toEqual(stored);
		})

	});

	describe("Default data function", () => {

		const fn = (setts?: ABDTAdditionalSettings<any>, cols: Partial<ICustomDtColumns<any>>[] = []) => {
			return setInstance({columns: cols as ICustomDtColumns<any>[]}, {addSetts: setts})['generateArgsToUse']({});
		}

		it("uses the returned object from dt helper", () => {
			const ref = {};
			const mock = jest.spyOn(AbstractDtHelper, 'processDtParameters').mockReturnValue(ref);
			// by just checking the ref, we know the fn was called
			expect(fn()).toBe(ref);
			mock.mockRestore();
		});

		describe("adds additionalGetParams", () => {
			
			it("adds fetch", () => {
				expect(fn({getParams: {"test__t": "yee"}}))
					.toEqual(expect.objectContaining({"test__t": "yee"}));
				
				expect(fn({toFetch: [{field: "test__t"}]}))
					.toEqual(expect.objectContaining({fetch: [{field: "test__t"}]}));


				// merge all
				let ret = fn({
					getParams: { fetch: [{field: "gp_f"}], options: {fetch: [{field: "gp_o_f"}]} }, 
					toFetch: [{field: "tf"}]
				});
				expect((ret.fetch as any).sort((a, b) => a.field > b.field ? 1 : -1))
					.toEqual([{field: "gp_f"}, {field: "gp_o_f"}, {field: "tf"}].sort((a, b) => a.field > b.field ? 1 : -1));
			});

			it("adds projection", () => {
				expect(fn({projection: {test__t: 1}}))
					.toEqual(expect.objectContaining({projection: {test__t: 1}}));

				expect(fn({getParams: {projection: {test__t: 1}}}))
					.toEqual(expect.objectContaining({projection: {test__t: 1}}));

				// merge all
				expect(fn({
					getParams: { projection: {getProj: 1}}, 
					projection: {root_proj: 1}
				}))
				.toEqual(expect.objectContaining({projection: {root_proj: 1, getProj: 1}}));


			});

		});

		describe("builded schema info", () => {

			it("adds the builded schema", () => {
				expect(fn({}, [{data: "quack"}]))
					.toEqual(expect.objectContaining({projection: {quack: 1}}));
	
				expect(fn({}, [{data: "quack"}, {data: "qq.fetched.asd"}]))
					.toEqual(expect.objectContaining({projection: {quack: 1, qq: 1}, fetch: [{field: "qq", projection: {asd: 1}}]}));
			})

			it("merges the builded schema with the already existing stuff", () => {
			
				let ret = fn(
					{
						getParams: {
							projection: {getProj: 1},
							fetch: [{field: "gp_f"}], 
							options: {fetch: [{field: "gp_o_f"}]} 
						}, 
						projection: {root_proj: 1},
						// notice the same fetching field as below
						toFetch: [{field: "tf"}, {field: "qq", projection: {ssss: 0}}]
					}, 
					[{data: "quack"}, {data: "qq.fetched.asd"}]
				);
				
				expect(ret.projection).toEqual(expect.objectContaining({
					qq: 1, getProj: 1, root_proj: 1, quack: 1
				}))

				expect((ret.fetch as any).sort((a, b) => a.field > b.field ? 1 : -1))
					.toEqual([{field: "qq", projection: {asd: 1}}, {field: "qq", projection: {ssss: 0}}, {field: "gp_f"}, {field: "gp_o_f"}, {field: "tf"}].sort((a, b) => a.field > b.field ? 1 : -1));

			});

		});


	});

});

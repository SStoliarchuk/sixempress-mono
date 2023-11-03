import React from 'react';
import { screen, within } from "@testing-library/react";
import { ICustomDtSettings } from "../../custom-dt-types";
import { AbstractBasicDt } from '../abstract-basic-dt';
import { DatatableToolbar_Internal } from '../../dt-logic/datatable-toolbar';
import { TutorialNodeIds } from '../../../../utils/enums/tutorial-keys.enum';
import { ModalService } from '../../../../services/modal-service/modal.service';
import { DataStorageService } from '@sixempress/utilities';
import { CacheKeys } from '../../../../utils/enums/cache-keys.enum';
import { Observable } from 'rxjs';
import { AbstractDbItemController } from '../../../../services/controllers/abstract-db-item.controller';
import { RequestService } from '../../../../services/request-service/request-service';

const getController = () => {
	class Contr extends AbstractDbItemController<any> {
		bePath = "";
		fetchInfo = {};
		modelClass = '';
	}
	return new Contr();
}
function setInstance(p: Partial<ICustomDtSettings<any>> = {}, classOverrides: {avTables?: typeof AbstractBasicDt['prototype']['defaultAvailableTables'], keepCache?: boolean} = {}) {

	p.sortAndProcessData = true;

	if (!classOverrides.keepCache) {
		DataStorageService.localStorage.clear();
		DataStorageService.sessionStorage.clear();
	}

	class TestClass extends AbstractBasicDt<any> {
		constructor(p) {
			super(p);
			this.defaultAvailableTables = classOverrides.avTables;
		}
		controller = getController();
		getDtOptions(): ICustomDtSettings<any> { 
			return {
				columns: [{data: "_id", title: "_id"}, {data: "idx", title: "idx"}],
				data: new Array(500).fill(undefined).map((r, idx) => ({_id: Math.random().toString(), idx})),
				buttons: [],
				...p
			};
		}
	}

	const T: any = TestClass;
	tc.render((
		<>
			<ModalService/>
			<T/>
		</>
	));
}

// disable debounce time for search test
DatatableToolbar_Internal.DEFAULT_DEBOUNCE_TIME_MS = 0;

const utils = {
	getReactInstance: () => {
		return tc.wrap(document.body.firstChild.firstChild).getReactInstance(2).getReactComponent() as AbstractBasicDt<any>;
	},
	reloadTable: () => {
		utils.getReactInstance().reloadTable();
	},
	openFilters: () => {
		tc.wrap(within(screen.getByTestId(TutorialNodeIds.tableFilterAndSettings)).getAllByRole("button")[0]).click();
	},
	openSettings: () => {
		tc.wrap(within(screen.getByTestId(TutorialNodeIds.tableFilterAndSettings)).getAllByRole("button")[1]).click();
	},
	getSelectedTableName: (): string => {
		return within(document.querySelector('[role="tablist"]')).getByRole("tab", {hidden: true, selected: true}).textContent;
	},
	addTable: (name: string) => {
		utils.openFilters();
		tc.wrap(screen.getByText("Salva nuova tavola")).click();
		tc.getMuiField("Nome tavola").type(name);
		tc.wrap(screen.getByText("Conferma")).click();
	},
	removeCurrentTable: () => {
		utils.openSettings();
		tc.wrap(screen.getByTestId("delete-available-dttable-button")).click();
	},
	getAvailableTableList: () => {
		return utils.getReactInstance().state.availableTables
	}
}


/**
 * This test contains some tests similar to those in dt-logic,
 * but they are really simple quick test to ensure that when abstract-dt overrides custom values etc..
 * they dont lose their original functionality :]
 */

describe("Abstract Basic Dt UI", () => {

	it("renders with empty data", async () => {
		setInstance({data: [], columns: [], buttons: []});
	});

	describe("buttons", () => {

		it('works with basic buttons', async () => {
			const mock = jest.fn();
			setInstance({buttons: [{title: "test_btn", onClick: mock}]});
			expect(mock).toHaveBeenCalledTimes(0);
			screen.getByText("test_btn").click();
			expect(mock).toHaveBeenCalledTimes(1);
		});

		it("with select type buttons", async () => {
			const mock = jest.fn();
			setInstance({
				buttons: [
					{title: "test_btn", onClick: mock, select: {type: "single"}},
					{title: "test_btn_2", onClick: mock, select: {type: "multi"}},
				],
				columns: [{title: "title_1", data: "f"}],
				data: [{f: "r0_c0"}, {f: "r1_c0"}, {f: "r2_c0"}],
			});
			
			await tt.wait(1);
			expect(mock).toHaveBeenCalledTimes(0);
			screen.getByText("test_btn").click();
			screen.getByText("test_btn_2").click();
			expect(mock).toHaveBeenCalledTimes(0);

			// select row
			screen.getByText("r0_c0").click();
			screen.getByText("test_btn").click();
			expect(mock).toHaveBeenCalledTimes(1);
			screen.getByText("test_btn_2").click();
			expect(mock).toHaveBeenCalledTimes(2);

			// select another row
			screen.getByText("r2_c0").click();
			screen.getByText("test_btn").click();
			expect(mock).toHaveBeenCalledTimes(3);
			screen.getByText("test_btn_2").click();
			expect(mock).toHaveBeenCalledTimes(4);

			// deselect row
			screen.getByText("r2_c0").click();
			screen.getByText("test_btn").click();
			expect(mock).toHaveBeenCalledTimes(4);
			screen.getByText("test_btn_2").click();
			expect(mock).toHaveBeenCalledTimes(4);
		});

	});

	describe("search", () => {

		it("filters the rows", async () => {
			setInstance({
				columns: [{title: "f", data: "f"}],
				data: [{f: "text_1"}, {f: "another_text"}, {f: "different"}],
			});
			await tt.wait(1);
			expect(screen.getAllByRole("row")).toHaveLength(3 + 1);

			tc.wrap(screen.getByPlaceholderText("Cerca", {exact: false})).type("text");
			await tt.wait(1);
			expect(screen.getAllByRole("row")).toHaveLength(2 + 1);
			
			tc.wrap(screen.getByPlaceholderText("Cerca", {exact: false})).clear().type("diff");
			await tt.wait(1);
			expect(screen.getAllByRole("row")).toHaveLength(1 + 1);

			tc.wrap(screen.getByPlaceholderText("Cerca", {exact: false})).clear();
			await tt.wait(1);
			expect(screen.getAllByRole("row")).toHaveLength(3 + 1);
		});

	});

	describe("multi-table basic ops (no filter check)", () => {
		
		it("generates table tabs", async () => {
			setInstance();
			expect(screen.queryByRole("tablist")).toBeNull();
			expect(screen.queryByText("BASE")).toBeNull();

			setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
			expect(screen.queryByRole("tablist")).not.toBeNull();
			const tabs = screen.getAllByRole("tab");
			expect(tabs[0].textContent).toBe("Base");
			expect(tabs[1].textContent).toBe("av_table_01");
			expect(tabs[2].textContent).toBe("av_table_02");
		});

		it("Navigates between tabs", async () => {

			// ensure it changes jsx key for the dt table to reload completely
			let lastKey;
			const getDtKey = () => tc.wrap(screen.getByRole('table').parentElement).getReactInstance(3).fiber.key;

			setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
			expect(utils.getSelectedTableName()).toBe("Base");
			expect(getDtKey()).not.toBe(lastKey);
			lastKey = getDtKey();

			tc.wrap(screen.getAllByRole("tab")[2]).click();
			expect(utils.getSelectedTableName()).toBe("av_table_02");
			expect(getDtKey()).not.toBe(lastKey);
			lastKey = getDtKey();

			// click twice just to be safe there's no "deselect" logic
			tc.wrap(screen.getAllByRole("tab")[0]).click();
			tc.wrap(screen.getAllByRole("tab")[0]).click();
			expect(utils.getSelectedTableName()).toBe("Base");
			expect(getDtKey()).not.toBe(lastKey);
			lastKey = getDtKey();

			tc.wrap(screen.getAllByRole("tab")[1]).click();
			expect(utils.getSelectedTableName()).toBe("av_table_01");
			expect(getDtKey()).not.toBe(lastKey);
			lastKey = getDtKey();
		});

		describe("Creates av tables", () => {
			
			it("Withouth other tables", async () => {
				setInstance({}, {});
				expect(document.querySelector('[role="tablist"]')).toBe(null);

				utils.addTable("man_table_01");
				expect(document.querySelector('[role="tablist"]')).not.toBe(null);
			});

			it("with other tables present", async () => {
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
				expect(utils.getSelectedTableName()).toBe("Base");

				// expect it to be immediately selected
				utils.addTable("man_table_01");
				expect(utils.getSelectedTableName()).toBe("man_table_01");
			});
		});

		it("deletes av tables", async () => {
			setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
			// change selected to delete
			expect(utils.getSelectedTableName()).toBe("Base");
			tc.wrap(screen.getByText("av_table_01")).click();
			expect(utils.getSelectedTableName()).toBe("av_table_01");

			utils.removeCurrentTable();

			// ensure the table was deleted and the selected is back to base
			expect(screen.queryByText("av_table_01")).toBeNull();
			expect(utils.getSelectedTableName()).toBe("Base");
		});

		it("rename av table", async () => {
			setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})

			tc.wrap(screen.getByText("av_table_01")).click();
			expect(utils.getSelectedTableName()).toBe("av_table_01");

			utils.openSettings();
			tc.getMuiField("Nome tavola").clear().type("modified_av_table_01");
			tc.wrap(screen.getByText("Applica")).click();

			expect(utils.getSelectedTableName()).toBe("modified_av_table_01");
		});

		it("can't delete/rename base table", async () => {
			setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
			expect(utils.getSelectedTableName()).toBe("Base");

			utils.openSettings();
			expect(screen.queryByTestId("delete-available-dttable-button")).toBeNull();
			expect(screen.queryByText("Nome tavola")).toBeNull();
		});

		describe("caches the table", () => {

			const getStored = () => {
				const k = Object.keys(DataStorageService.localStorage).find(k => k.indexOf(CacheKeys.dataTableAvailableTablesPrefix) === 0)
				return DataStorageService.getSafeValue(k, 'object');
			};

			it("doesnt store in cache if using the default values", async () => {
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
				expect(getStored()).toBeUndefined()

				// ensure it doesn save on just switch
				tc.wrap(screen.getByText("av_table_01")).click();
				expect(getStored()).toBeUndefined()
			});

			it("stores the av-tables on table delete", async () => {
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
				tc.wrap(screen.getByText("av_table_01")).click();
				utils.removeCurrentTable();

				expect(getStored()).toEqual([expect.objectContaining({name: "av_table_02"})]);
			});

			it("stores the av-tables on table add", async () => {
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
				utils.addTable("man_table_01")
				expect(getStored()).toEqual([
					expect.objectContaining({name: "av_table_01"}), 
					expect.objectContaining({name: "av_table_02"}), 
					expect.objectContaining({name: "man_table_01"})
				]);
			});

			it("stores the av-tables on table edit save", async () => {
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
				tc.wrap(screen.getByText("av_table_01")).click();
				utils.openFilters();
				tc.wrap(screen.getByText("Salva")).click();
				expect(getStored()).toEqual([
					expect.objectContaining({name: "av_table_01"}), 
					expect.objectContaining({name: "av_table_02"}), 
				]);
			});

			it("uses the cached av-tables", async () => {
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
				utils.addTable("man_table_01_toCache");

				// restore with no default tables
				setInstance({}, {keepCache: true});
				screen.getByText("man_table_01_toCache");

				// restore with defaults
				setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}], keepCache: true})
				screen.getByText("man_table_01_toCache");
			});

		});

	});

	describe("filters", () => {

		it("applies the filters to the query", async () => {
			const mock = jest.spyOn(RequestService, 'client').mockReturnValue(Promise.resolve({data: [], headers: {}} as any));
			
			setInstance({data: undefined});
			let lastParam = mock.mock.calls[0][2];
			
			
			// on reload, the same params
			utils.reloadTable();
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), lastParam);
			
			// on apply change params
			utils.openFilters();
			tc.wrap(screen.getByText("Applica")).click();
			expect(mock).not.toHaveBeenLastCalledWith(expect.anything(), expect.anything(), lastParam);

			// on reload after apply the applied params should remain
			utils.reloadTable();
			expect(mock).not.toHaveBeenLastCalledWith(expect.anything(), expect.anything(), lastParam);

			// remove filters
			tc.wrap(screen.getByText("Rimuovi filtri")).click();
			expect(mock).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), lastParam);

			mock.mockRestore();
		});

		it("saves the filters for the multi-table", async () => {
			setInstance({}, {avTables: [{name: "av_table_01", filters: {}}, {name: "av_table_02", filters: {}}]})
			tc.wrap(screen.getByText("av_table_01")).click();

			utils.reloadTable();
			expect(utils.getAvailableTableList()[0].filters).toEqual({});
			
			utils.openFilters();
			tc.wrap(screen.getByText("Applica")).click();
			expect(utils.getAvailableTableList()[0].filters).toEqual({});

			tc.wrap(screen.getByText("Salva")).click();
			expect(utils.getAvailableTableList()[0].filters).not.toEqual({});

			utils.addTable("man_table_01")
			expect(utils.getAvailableTableList()[2].filters).not.toEqual({});
			expect(utils.getAvailableTableList()[0].filters).toEqual(utils.getAvailableTableList()[2].filters);

			// just to be safe
			expect(utils.getAvailableTableList()[1].filters).toEqual({});
		});

		it("uses the multi-table filters on generation", async () => {
			const mock = jest.spyOn(RequestService, 'client').mockReturnValue(Promise.resolve({data: [], headers: {}} as any));
			const filterFieldName = "__filter_field_special_test";
			const filtersOne = {[filterFieldName]: {filterValueOneField: 123}};
			const filtersTwo = {[filterFieldName]: {quackQuack: 555}};
			
			setInstance({data: undefined}, {avTables: [{name: "av_table_01", filters: filtersOne}, {name: "av_table_02", filters: filtersTwo}]})
			const getLastCallParams = () => {
				const lastIdx = mock.mock.calls.length - 1;
				return mock.mock.calls[lastIdx][2].params.filter || {};
			}

			expect(mock).toHaveBeenCalledTimes(1)
			expect(getLastCallParams()).toEqual({})

			tc.wrap(screen.getByText('av_table_01')).click();
			expect(mock).toHaveBeenCalledTimes(2)
			expect(getLastCallParams()).toEqual(expect.objectContaining(filtersOne));

			// return to no 
			tc.wrap(screen.getByText('av_table_02')).click();
			expect(mock).toHaveBeenCalledTimes(3)
			expect(getLastCallParams()).toEqual(expect.objectContaining(filtersTwo));

			tc.wrap(screen.getByText('av_table_01')).click();
			expect(mock).toHaveBeenCalledTimes(4)
			expect(getLastCallParams()).toEqual(expect.objectContaining(filtersOne));

			tc.wrap(screen.getByText('Base')).click();
			expect(mock).toHaveBeenCalledTimes(5)
			expect(getLastCallParams()).toEqual({})
		});

	});

	describe("Settings", () => {

		it('toggles col visibility', async () => {
			const arrLength = 10;
			const colTitlePrefix = "_col_vis_";
			const cols = new Array(arrLength).fill(undefined).map((c, idx) => ({title: colTitlePrefix + idx, data: idx.toString()}));
			
			const expectHeaderNotPresent = async (idxs: number[]) => {
				await tt.wait(1);
				const ths = screen.getAllByRole("columnheader", {hidden: true});
				expect(ths).toHaveLength(arrLength - idxs.length);

				for (let i = 0; i < arrLength; i++) {
					const c = ths.find(c => c.textContent === colTitlePrefix + i) ? true : null;
					if (idxs.includes(i)) {
						expect(c).toBeNull();
					} else {
						expect(c).not.toBeNull();
					}
				}
			}

			setInstance({columns: cols, data: [{}]});
			utils.openSettings();
			await expectHeaderNotPresent([]);
			
			tc.getMuiField(colTitlePrefix + 1).click();
			await expectHeaderNotPresent([]);
			
			tc.wrap(screen.getByText("Applica")).click();
			await expectHeaderNotPresent([1]);

		});

	});

});

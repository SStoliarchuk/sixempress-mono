import React from 'react';
import { DTProps } from "../datatable.dtd";
import { Datatable_Internal } from "../datatable";
import { Observable } from 'rxjs';
import { cleanup, fireEvent, render, RenderResult, screen, within } from '@testing-library/react';
import { DatatableToolbar_Internal } from '../datatable-toolbar';
import to from 'await-to-js';


// as the update Table data is async, we have a problem where we need to add "await tt.wait(1)" after each ui update
// to avoid this we override the async return to make it sync where is possible to 
const ovveridde = (proto) => {

	// do not throw error
	const old = proto['updateTableDataInternal'];
	proto['updateTableDataInternal'] = async (...args) => {
		const [e, r] = await to(old(...args));
		return r;
	}

	proto['getDataForUpdateSwitchMap'] = (function (this: Datatable_Internal, ...args) {
		let r;
		let j;
		let succ;

		let cbs = {
			then: undefined,
			catch: undefined,
			finally: undefined,
		};

		const s = (success, d) => {
			succ = success;

			if (success) {
				r = d;
				if (cbs.then)
					cbs.then(r)
			} 
			else {
				j = d;
				if (cbs.catch)
					cbs.catch(j)
			}

			if (cbs.finally)
				cbs.finally();
		}


		const calls = {
			then: (cb) => {
				if (succ === true)
					cb(r);
				else
					cbs.then = cb;

				return calls;
			},
			catch: (cb) => {
				if (succ === false)
					cb(j);
				else
					cbs.catch = cb;

				return calls;
			},
			finally: (cb) => {
				if (typeof succ !== 'undefined')
					cb();
				else
					cbs.finally = cb;

				return calls;
			},
		}

		this['getDataForUpdate'](res => s(true, res), rej => s(false, rej), ...args);

		return calls;
	}) as any
}

const baseProps: DTProps<any> = {
	columns: [{data: "_id", title: "_id"}, {data: "idx", title: "idx"}],
	data: new Array(500).fill(undefined).map((r, idx) => ({_id: Math.random().toString(), idx})),
	initialSort: {column: 1, dir: 'asc'},
	possibleRowsPerPage: [10, 20, 30],
};

const setInstance = (p: Partial<DTProps<any>>) => {
	cleanup()
	class Datatable extends Datatable_Internal {
		constructor(a) {
			super(a);
			ovveridde(this);
		}
	}

	return comp = render(<Datatable {...baseProps} classes={{} as any} sortAndProcessData={typeof p.sortAndProcessData === 'undefined' && (!p.data || Array.isArray(p.data)) ? true : p.sortAndProcessData} {...p} />);
};

/**
 * The current component ref for a test
 */
let comp: RenderResult;

const changePage = (toGoIdx: number) => {
	const paginate = within(comp.getByTestId("datatable-table-pagination"));

	/**
	 * array 
	 * 	[0] = {start}-{end}
	 *  [1] = {total}
	 */
	const pagText = paginate.queryByText("su", {exact: false}).innerHTML.split(" su ");
	const pagInfo = {
		start: parseInt(pagText[0].split('-')[0]),
		end: parseInt(pagText[0].split('-')[1]),
		total: parseInt(pagText[1]),
	};

	
	const currLimit = pagInfo.end - (pagInfo.start - 1);
	let currPageIdx = (pagInfo.end / currLimit) - 1;
	if (!Number.isSafeInteger(currPageIdx)) { throw new Error("Page info error"); }
	if (currPageIdx === toGoIdx) { return; }

	// press btn until we are at the correct page
	const allBtns = paginate.getAllByRole('button');
	const ahead = allBtns[allBtns.length - 1];
	const back = allBtns[allBtns.length - 2];

	const goBack = toGoIdx < currPageIdx;
	while (toGoIdx !== currPageIdx) {
		if (goBack) {
			tc.wrap(back).click();
			currPageIdx--;
		} else {
			tc.wrap(ahead).click();
			currPageIdx++;
		}
	}
	
};

const changeLimit = (limit: number) => {
	const paginate = within(comp.getByTestId("datatable-table-pagination"));
	fireEvent.mouseDown(within(paginate.getByText("Righe").nextElementSibling as any).getByRole('button'));
	tc.wrap(within(comp.getByRole('listbox')).getByText(limit.toString())).click();
};

const changeSort = (colIdx: number) => {
	tc.wrap(comp.getAllByRole('columnheader')[colIdx].firstChild).click();
};

// render search syncronous
DatatableToolbar_Internal.DEFAULT_DEBOUNCE_TIME_MS = 0;
const search = (text: string | number) => {
	tc.wrap(comp.getByRole('search')).clear().type(text);
};



describe("Datatable", () => {

	describe("saving state", () => {
		
		const fn = (key?: string, p: Partial<DTProps<any>> = {}) => {
			return setInstance({ saveStateCacheKey: key, ...p });
		};

		it("doesnt save anything if no key", () => {
			const ks = Object.keys(localStorage);
			fn().unmount();
			expect(Object.keys(localStorage)).toEqual(ks);
		});

		it("saves the state if given the key", () => {
			const ks = Object.keys(localStorage);
			fn("__storage_key").unmount();
			expect(Object.keys(localStorage)).toHaveLength(ks.length + 1);
			expect(JSON.parse(localStorage['__storage_key'])).toBeInstanceOf(Object);
		});

		it("respects column visibility", () => {
			const arrLength = 10;
			const stoKey = '_col_vis_k'
			const colTitlePrefix = '_col_vis_';

			let e = fn(stoKey, {columns: new Array(arrLength).fill(undefined).map((c, idx) => ({
				data: colTitlePrefix + idx,
				title: colTitlePrefix + idx,
			}))});
			const getInstance = (): Datatable_Internal => tc.wrap(e.baseElement.firstChild.firstChild).getReactInstance(2).getReactComponent() as any;
			const getColsState = () => getInstance().getState().columns;
			
			const expectHeaderNotPresent = (idxs: number[]) => {
				expect(screen.getAllByRole("columnheader")).toHaveLength(arrLength - idxs.length);
				
				for (let i = 0; i < arrLength; i++) {
					const c = screen.queryByText(colTitlePrefix + i);
					if (idxs.includes(i)) {
						expect(c).toBeNull();
					} else {
						expect(c).not.toBeNull();
					}
				}
			}

			getColsState().forEach((c, idx) => expect(c.visible).toBe(true));
			expectHeaderNotPresent([]);

			getInstance().changeColumnVisibility([{idx: 4, vis: false}]);
			getColsState().forEach((c, idx) => expect(c.visible).toBe(idx !== 4));
			expectHeaderNotPresent([4]);

			getInstance().changeColumnVisibility([{idx: 4, vis: true}, {idx: 1, vis: false}, {idx: 2, vis: false}]);
			getColsState().forEach((c, idx) => expect(c.visible).toBe(idx !== 1 && idx !== 2));
			expectHeaderNotPresent([1, 2]);

			// ensure the check is the same as above after unmount
			e.unmount();
			const stored = JSON.parse(localStorage[stoKey]);
			stored.columns.forEach((c, idx) => expect(c.visible).toBe(idx !== 1 && idx !== 2));

			// ensure when it's remounted that the cols vis are restored
			e = fn(stoKey, {columns: new Array(10).fill(undefined).map((c, idx) => ({
				data: "_col_vis_" + idx,
				title: "_col_vis_" + idx,
			}))});
			getColsState().forEach((c, idx) => expect(c.visible).toBe(idx !== 1 && idx !== 2));
			expectHeaderNotPresent([1, 2]);
		});

	});

	describe("table lengths/pages", () => {

		describe("props.possibleRowsPerPage / props.initialRowsPerPage", () => {
			
			const fn = (rowsPerPage: number[], p: Partial<DTProps<any>> = {}) => {
				return setInstance({ possibleRowsPerPage: rowsPerPage, ...p });
			};

			const expectSetRows = (n: false | number) => {
				if (n === false) {
					expect(comp.queryByText("Righe")).toBeNull();
				} else {
					within(comp.getByText("Righe").parentElement).getByText(n.toString(), {selector: "[role='button']"});
				}
			};
	
			it("if a set limit is not given, it uses the first available limit", () => {
				fn([]);
				expectSetRows(false);
				
				fn([10, 20, 30]);
				expectSetRows(10);

				fn([50, 20, 30]);
				expectSetRows(50);
			});
	
			it("if a set limit is given, it uses the limit instead of checking the possibile limits", () => {
				// it is generated only if there are options
				fn([], {initialRowsPerPage: 10});
				expectSetRows(false);
				
				fn([10, 20, 30], {initialRowsPerPage: 20})
				expectSetRows(20);

				fn([10, 50, 30], {initialRowsPerPage: 20})
				expectSetRows(20);
			});
		});

		describe("TablePagination", () => {
			
			it("changes the pages on click", () => {
				const activePageLimit = 15;
				setInstance({initialRowsPerPage: activePageLimit, possibleRowsPerPage: [20, 30, 40]});
				
				const fn = (pageN: number) => {
					changePage(pageN);
					comp.getByText((pageN * activePageLimit).toString(), {exact: true, selector: 'td'});
				};

				fn(1);
				fn(2);
				fn(0);

			});

			it("changes the rows limit on click and always returns to first page", () => {
				const initialLimit = 15;
				setInstance({initialRowsPerPage: initialLimit, possibleRowsPerPage: [20, 30, 40, 4, 100]});
				// plus 1 for the thead
				expect(comp.getAllByRole('row')).toHaveLength(initialLimit + 1)

				const fn = (limit: number) => {
					changePage(2);
					expect(comp.queryByText("0", {exact: true, selector: 'td'})).toBeFalsy();
					
					changeLimit(limit);

					// plus 1 for the thead
					expect(comp.getAllByRole('row')).toHaveLength(limit + 1)
					// ensure it resotres to the first page always
					comp.getByText("0", {exact: true, selector: 'td'});
				};

				fn(20);
				fn(100);
				fn(4);
				fn(15);

			});

		});

	});

	describe("data to show", () => {

		it("handles empty", () => {
			setInstance({data: [], columns: [], toolbar: true});
			// ensure the searh still works
			search("Hello");

			setInstance({data: [{a: 1}], columns: [], toolbar: true});
			search("Hello");
		});

		describe("Static array", () => {

			const namesArr = ['bob', 'marge', 'billy', 'lemonade', 'palmtree', 'magic', 'super', 'ok'];

			const fn = (arrLength: number, p: Partial<DTProps<any>> = {}) => {

				return setInstance({
					data: new Array(arrLength).fill(undefined).map((r, idx) => ({
						_id: Math.random(), 
						idx,
						text: namesArr[idx % namesArr.length],
					})), 
					columns: [
						{data: "_id", title: "_id"}, 
						{data: 'idx', title: 'idx', search: {toInt: true}},
						{data: "text", title: 'text'},
					],
					sortAndProcessData: typeof p.sortAndProcessData === 'undefined' && (!p.data || Array.isArray(p.data)) ? true : p.sortAndProcessData,
					...p
				});
			};

			describe("automatically filters/sorts/limits the static array given", () => {

				it("it generates base array", () => {
					const ref = [{a: "aa_11"}, {a: "aa_12"}];
					fn(0, {data: ref, columns: [{data: "a", title: "col__1"}]});
					expect(comp.getAllByRole('row')).toHaveLength(2 + 1);
					comp.getByText('aa_11');
					comp.getByText('aa_12');
				});
				

				it("sorts", () => {
					fn(20, {initialRowsPerPage: 10, initialSort: {column: 1, dir: 'asc'}})
					
					const test = (text: string | number) => {
						expect(comp.getAllByRole('cell')[1]).toHaveTextContent(text.toString());
					};
					
					test(0);
					changeSort(1);
					test(19);
				});


				it("filters", () => {
					fn(20, {initialRowsPerPage: 10, toolbar: true});

					const test = (val: string | number, matchingCol: 1 | 2, forceEqualTo?: string | number) => {
						search(val);

						const colText: string = comp.getAllByRole("cell")[matchingCol].innerHTML.toString();
						if (typeof forceEqualTo !== 'undefined') {
							expect(colText === forceEqualTo.toString()).toBe(true)
						} else {
							expect(colText.includes(val.toString())).toBe(true)
						}
					};
							
					test(2, 1, 2);
					test("bob", 2, "bob");
					test("b", 2);
					
				});

				it("limits", () => {
					fn(0, {initialRowsPerPage: 10});
					// 1 header +
					// 1 empty row that say "no results"
					expect(comp.getAllByRole('row')).toHaveLength(1 + 1);
	
					fn(5, {initialRowsPerPage: 10});
					expect(comp.getAllByRole('row')).toHaveLength(5 + 1);
					
					// expect some remaining rows if the data array doesnt reach the whole limit
					fn(25, {initialRowsPerPage: 10});
					expect(comp.getAllByRole('row')).toHaveLength(10 + 1);
					changePage(1);
					expect(comp.getAllByRole('row')).toHaveLength(10 + 1);
					changePage(2);
					expect(comp.getAllByRole('row')).toHaveLength(5 + 1);
				});

			});

		});

		describe("Function", () => {

			const expectParams = (mock: any) => {
				setInstance({
					data: mock,
					columns: [{data: "_id", title: "_id"}, {data: "idx", title: "idx"}],
					initialSort: {column: 0, dir: 'asc'},
					initialRowsPerPage: 10,
					possibleRowsPerPage: [10, 20, 200, 1],
				});
				
				expect(mock).toHaveBeenCalledTimes(1);

				changeLimit(1);
				expect(mock).toHaveBeenCalledTimes(2);

				changeSort(0);
				expect(mock).toHaveBeenCalledTimes(3);

				changePage(1);
				expect(mock).toHaveBeenCalledTimes(4);
			};

			describe("Sync", () => {

				it("uses the returned values", () => {
					const ref = [{a: "bb_11"}, {a: "bb_12"}, {a: "bb_22"}];
					setInstance({columns: [{title: "a", data: "a"}], data: () => ({data: ref, totalItems: 2})});
					expect(comp.getAllByRole('row')).toHaveLength(3 + 1);
					comp.getByText('bb_11');
					comp.getByText('bb_12');
					comp.getByText('bb_22');
				});
	
				it("passes the current state object to the function", () => {
					const mock = jest.fn().mockReturnValue({data: [{_id: "a", idx: 0}, {_id: "bcd", idx: 0}], totalItems: 2});
					expectParams(mock);
				});

			});

			describe("Observable", () => {

				it("uses the returned values", () => {
					const ref = [{a: "cc_11"}, {a: "cc_12"}, {a: "cc_22"}];
					setInstance({columns: [{title: "a", data: "a"}], data: () => new Observable((obs) => (obs.next(({data: ref, totalItems: 2})), obs.complete()))});
					expect(comp.getAllByRole('row')).toHaveLength(3 + 1);
					comp.getByText('cc_11');
					comp.getByText('cc_12');
					comp.getByText('cc_22');
				});
	
				it("passes the current state object to the function", () => {
					const mock = jest.fn().mockReturnValue(new Observable((obs) => (obs.next(({data: [{_id: "a", idx: 0}, {_id: "bcd", idx: 0}], totalItems: 2})), obs.complete())));
					expectParams(mock);
				});

			});
			
			it("catches the error, and shows text withouth dying", async () => {
				// it throws correctly in both cases, but here it doesnt see that it throws, so ok
				// we will use this to test the state
				let counter = -1;
				setInstance({data: () => new Observable((o) => ++counter === 0 ? o.error(new Error("123")) : (o.next({data: [{a: '1'}], totalItems: 1}), o.complete()))});

				// with the counter above, we know it errors on first paint
				// on the second paint (reloadTable)
				// the error is no longer present
				// ensure that the message is gone
				await tt.wait(1);
				comp.getByText("Errore durante la visualizzazione della tabella")
				expect(comp.queryAllByRole('cell')).toHaveLength(0);

				tc.wrap(comp.getByText("Ricarica")).click();
				await tt.wait(10);
				expect(comp.queryByText("Errore durante la visualizzazione della tabella")).toBeNull();
				// ensure a cell is present
				comp.getAllByRole('cell');
			});

		});

	});

	describe("Paper wrapper", () => {

		it('able to toggle the paper wrapper', () => {
			
			setInstance({});
			expect(((comp.asFragment().firstChild as any).classList[0] as string).toLowerCase().includes("paper")).toBe(true);

			setInstance({removePaper: false});
			expect(((comp.asFragment().firstChild as any).classList[0] as string).toLowerCase().includes("paper")).toBe(true);

			setInstance({removePaper: true});
			expect(((comp.asFragment().firstChild as any).classList[0] as string).toLowerCase().includes("paper")).toBe(false);

		});

	});

	describe("Select", () => {

		const btnMock = jest.fn();

		const fn = (select?: DTProps<any>['select'], p: Partial<DTProps<any>> = {}) => {
			return setInstance({select, ...p, toolbar: {buttons: [{title: "BTN_SELECT_CB", onClick: (e, s) => btnMock(s)}]}});
		};

		const clickRow = (idx: number) => {
			tc.wrap(comp.getAllByRole('row')[idx + 1]).click();
		};

		const getSelectedArray = () => {
			tc.wrap(comp.getByText("BTN_SELECT_CB")).click();
			return btnMock.mock.calls[btnMock.mock.calls.length - 1][0];
		}

		it("removes the radio/checkbox", () => {
			fn(undefined, {removeSelectVisualColumn: true});
			expect(comp.queryAllByRole('checkbox').length === 0).toBe(true);
			expect(comp.queryAllByRole('radio').length === 0).toBe(true);

			fn("multi");
			expect(comp.queryAllByRole('checkbox').length === 0).toBe(false);
			expect(comp.queryAllByRole('radio').length === 0).toBe(true);

			fn("single");
			expect(comp.queryAllByRole('checkbox').length === 0).toBe(true);
			expect(comp.queryAllByRole('radio').length === 0).toBe(false);

			fn("multi", {removeSelectVisualColumn: true});
			expect(comp.queryAllByRole('checkbox').length === 0).toBe(true);
			expect(comp.queryAllByRole('radio').length === 0).toBe(true);

			fn("single", {removeSelectVisualColumn: true});
			expect(comp.queryAllByRole('checkbox').length === 0).toBe(true);
			expect(comp.queryAllByRole('radio').length === 0).toBe(true);
		});

		it("uses radio/checkbox based on the select type", () => {
			fn();
			expect(comp.queryAllByRole('checkbox').length === 0).toBe(true);
			expect(comp.queryAllByRole('radio').length === 0).toBe(true);

			fn("multi");
			expect(comp.queryAllByRole('checkbox').length > 0).toBe(true);
			expect(comp.queryAllByRole('radio')).toHaveLength(0);

			fn("single");
			expect(comp.queryAllByRole('checkbox')).toHaveLength(0);
			expect(comp.queryAllByRole('radio').length > 0).toBe(true);
		});

		it("keeps selected only 1 row on single select", () => {
			fn('single');
			expect(getSelectedArray()).toHaveLength(0);

			clickRow(0);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(0);

			clickRow(1);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(1);

			clickRow(1);
			expect(getSelectedArray()).toHaveLength(0);
		});

		it("it keeps a list of selected on multi", () => {
			fn('multi');
			expect(getSelectedArray()).toHaveLength(0);
			
			// add 0 0
			clickRow(0);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(0);

			// add 0 1
			clickRow(1);
			expect(getSelectedArray()).toHaveLength(2);
			expect(getSelectedArray()[0].idx).toBe(0);
			expect(getSelectedArray()[1].idx).toBe(1);

			// remove 0 1
			clickRow(1);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(0);

			// add 2 0
			changePage(2);
			clickRow(0);
			expect(getSelectedArray()).toHaveLength(2);
			expect(getSelectedArray()[0].idx).toBe(0);
			expect(getSelectedArray()[1].idx).toBe(20);

			// remove 0 0
			changePage(0);
			clickRow(0);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(20);

			// remove 2 0
			changePage(2);
			clickRow(0);
			expect(getSelectedArray()).toHaveLength(0);
		});

		it("keeps the selected array on page change", () => {
			fn('single');
			clickRow(0);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(0);

			changePage(2);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(0);

			clickRow(0);
			expect(getSelectedArray()).toHaveLength(1);
			expect(getSelectedArray()[0].idx).toBe(20);


			fn('multi');
			clickRow(0);
			clickRow(1);
			expect(getSelectedArray()).toHaveLength(2);
			expect(getSelectedArray()[0].idx).toBe(0);
			expect(getSelectedArray()[1].idx).toBe(1);

			changePage(2);
			expect(getSelectedArray()).toHaveLength(2);
			expect(getSelectedArray()[0].idx).toBe(0);
			expect(getSelectedArray()[1].idx).toBe(1);

			clickRow(0);
			expect(getSelectedArray()).toHaveLength(3);
			expect(getSelectedArray()[0].idx).toBe(0);
			expect(getSelectedArray()[1].idx).toBe(1);
			expect(getSelectedArray()[2].idx).toBe(20);
		});

		describe("set selected indicator", () => {
		
			const getAllChecked = (type: 'radio' | 'checkbox') => {
				return comp.getAllByRole(type).filter(c => (c as any).checked)
			}

			it("single mode", () => {
				fn("single");
				expect(getAllChecked('radio')).toHaveLength(0);
	
				clickRow(0);
				expect(getAllChecked('radio')).toHaveLength(1);
	
				clickRow(1);
				expect(getAllChecked('radio')).toHaveLength(1);
	
				changePage(1);
				expect(getAllChecked('radio')).toHaveLength(0);
	
				changePage(0);
				expect(getAllChecked('radio')).toHaveLength(1);
			});

			it("multi mode", () => {
				fn("multi");
				expect(getAllChecked('checkbox')).toHaveLength(0);
	
				clickRow(0);
				expect(getAllChecked('checkbox')).toHaveLength(1);
	
				clickRow(1);
				expect(getAllChecked('checkbox')).toHaveLength(2);
	
				changePage(1);
				expect(getAllChecked('checkbox')).toHaveLength(0);
	
				changePage(0);
				expect(getAllChecked('checkbox')).toHaveLength(2);
	
				clickRow(1);
				expect(getAllChecked('checkbox')).toHaveLength(1);
			});

		});

	});

});

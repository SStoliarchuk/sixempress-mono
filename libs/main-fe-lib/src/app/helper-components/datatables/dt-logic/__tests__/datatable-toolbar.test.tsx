import React from 'react';
import { DatatableToolbar, DTTProps as DTTProps_Internal } from '../datatable-toolbar';
import { DTToolbarProps } from '../datatable.dtd';
import { cleanup, render, RenderResult } from '@testing-library/react';

const baseProps: DTTProps_Internal = {
	selected: [],
	canSelect: false,
	config: "true",
};

const getShallow = (p: Partial<DTTProps_Internal>) => {
	cleanup();
	return comp = render(<DatatableToolbar {...baseProps} {...p}/>);
};

/**
 * The current component ref for a test
 */
let comp: RenderResult;


describe("Datatable Toolbar", () => {

	describe("Title", () => {
		
		const fn = (title: DTTProps_Internal['config'], p: Partial<DTTProps_Internal> = {}) => {
			return getShallow({config: title, ...p});
		};

		it("Generates the toolbar with given title", () => {
			fn(true);
			comp.getByText("Tavola Dati");

			fn("__Title02");
			comp.getByText("__Title02");

			fn({title: "__title_in_object_01"});
			comp.getByText("__title_in_object_01");

			fn({title: "__title_in_object_02", buttons: [{title: "hello"}]});
			comp.getByText("__title_in_object_02");
		});

		it("replaces the title with the selected array length", () => {

			const test = (toFind: DTTProps_Internal['config']) => { 
				const titleStr: string = (typeof toFind === 'object' ? toFind.title : toFind).toString();
				
				fn(toFind);
				comp.getByText(titleStr);

				fn(toFind, {selected: [{}]});
				expect(comp.queryByText(titleStr)).toBeNull();
				comp.getByText("1 Riga Selezionata");

				fn(toFind, {selected: [{}, {}, {}]});
				expect(comp.queryByText(titleStr)).toBeNull();
				comp.getByText("3 Righe Selezionate");
			};

			test("__Title01");
			test({title: "__Title01"});
			test({title: "__Title01", buttons: [{title: "hello"}]});
		});

	});

	describe("Buttons", () => {

		const fn = (btns: DTToolbarProps<any>['buttons'], dtp: Partial<DTToolbarProps<any>> = {}, p: Partial<DTTProps_Internal> = {}) => {
			return getShallow({config: {buttons: btns, ...dtp}, ...p});
		};

		it("generates the list", () => {
			fn([{title: "btn__01"}, {title: "btn__02"}]);
			comp.getByText("btn__01");
			comp.getByText("btn__02");
			expect(comp.getAllByRole("button")).toHaveLength(2);
		});

		it("disables the buttons", () => {
			fn([{title: "b1"}, {title: "b2"}]);
			expect(comp.getAllByRole("button")[0]).not.toBeDisabled();
			expect(comp.getAllByRole("button")[1]).not.toBeDisabled();

			fn([{title: "b1", enabled: false}, {title: "b2"}]);
			expect(comp.getAllByRole("button")[0]).toBeDisabled();
			expect(comp.getAllByRole("button")[1]).not.toBeDisabled();

			fn([{title: "b1", enabled: true}, {title: "b2", enabled: false}, {title: "b3", enabled: () => true}, {title: "b4", enabled: () => false}]);
			expect(comp.getAllByRole("button")[0]).not.toBeDisabled();
			expect(comp.getAllByRole("button")[1]).toBeDisabled();
			expect(comp.getAllByRole("button")[2]).not.toBeDisabled();
			expect(comp.getAllByRole("button")[3]).toBeDisabled();
		});

		it("hides disabled buttons", () => {
			
			const test = (btns: DTToolbarProps<any>['buttons'], dtp: Partial<DTToolbarProps<any>> = {}) => {
				fn(btns, dtp);

				for (let i = 0; i < btns.length; i++) {
					const b = btns[i];
					const isDisabled = Boolean(b.enabled === false || (typeof b.enabled === 'function' && (b.enabled as any)([]) === false));
					const isHidden = Boolean(isDisabled && (b.hideDisabled || dtp.hideDisabledButtons));

					isDisabled 
						? expect(comp.getAllByRole("button")[i]).toBeDisabled()
						: expect(comp.getAllByRole("button")[i]).toBeEnabled();

					expect(comp.getAllByRole("button")[i].className.includes("hiddenDisabledButton")).toBe(isHidden);
				}
			};

			test([
				{title: "b1", enabled: true}, 
				{title: "b2", enabled: false}, 
				{title: "b3", enabled: () => true}, 
				{title: "b4", enabled: () => false}
			], {hideDisabledButtons: true});

			test([
				{title: "b1", enabled: true, hideDisabled: true}, 
				{title: "b2", enabled: false}, 
				{title: "b3", enabled: () => true}, 
				{title: "b4", enabled: () => false, hideDisabled: true}
			], {hideDisabledButtons: false});

			test([
				{title: "b1", enabled: true, hideDisabled: true}, 
				{title: "b2", enabled: false}, 
				{title: "b3", enabled: () => true}, 
				{title: "b4"},
			]);
			
		});

		it("adds onclick event, and calls it with selected array", () => {
			const click = jest.fn();
			const click2 = jest.fn();
			const selectedRef = [{}];
			fn([{title: "asd", onClick: click}, {title: "asd", onClick: click2}], undefined, {selected: selectedRef});

			tc.wrap(comp.getAllByRole("button")[0]).click();
			expect(click2).toHaveBeenCalledTimes(0);
			expect(click).toHaveBeenCalledTimes(1);
			expect(click).toHaveBeenLastCalledWith(expect.anything(), selectedRef);
			
			tc.wrap(comp.getAllByRole("button")[1]).click();
			expect(click).toHaveBeenCalledTimes(1);
			expect(click2).toHaveBeenCalledTimes(1);
			expect(click2).toHaveBeenLastCalledWith(expect.anything(), selectedRef);
		});

	});

	describe("Search", () => {

		let onSearchMock = jest.fn();
		
		const fn = (title: DTTProps_Internal['config'], p: Partial<DTTProps_Internal> = {}) => {
			onSearchMock = jest.fn();
			return getShallow({config: title, onSearch: onSearchMock, ...p});
		};
		
		const search = (v: string | number) => {
			tc.wrap(comp.getByRole("search")).clear().type(v);
		};

		it("adds the search field", () => {
			fn("__title01", {onSearch: undefined});
			expect(comp.queryByRole('search')).toBeNull();

			fn({title: "__title01"}, {onSearch: undefined});
			expect(comp.queryByRole('search')).toBeNull();


			fn("__title01");
			comp.getByRole('search');

			fn({title: "__title01",});
			comp.getByRole('search');


			fn({title: "__title01", search: false});
			expect(comp.queryByRole('search')).toBeNull();

		});

		describe("calls onSearch", () => {
			
			it("immediately if debounceTime is 0", () => {
				fn(true, {searchDebounceMs: 0});
				expect(onSearchMock).toHaveBeenCalledTimes(0);
				
				let str = "hello"
				search(str);
				expect(onSearchMock).toHaveBeenCalledTimes(str.length);
				expect(onSearchMock).toHaveBeenLastCalledWith("hello");

				// clear field and reset
				search("");
				onSearchMock.mockClear();

				str = "how are you"
				search(str);
				expect(onSearchMock).toHaveBeenCalledTimes(str.length);
				expect(onSearchMock).toHaveBeenLastCalledWith("how are you");
			});

			it("uses the default debounceTime", async () => {
				fn(true);
				expect(onSearchMock).toHaveBeenCalledTimes(0);

				search("hello");
				// extra 100 ms for safety
				await tc.wait(600);
				expect(onSearchMock).toHaveBeenCalledTimes(1);
				expect(onSearchMock).toHaveBeenLastCalledWith("hello");
			});

			it("uses the given debounceTime", async () => {
				fn(true, {searchDebounceMs: 100});
				expect(onSearchMock).toHaveBeenCalledTimes(0);

				search("hello");
				// extra 100 ms for safety
				await tc.wait(200);
				expect(onSearchMock).toHaveBeenCalledTimes(1);
				expect(onSearchMock).toHaveBeenLastCalledWith("hello");


				search("typing1");
				search("typing2");
				search("typing3");
				await tc.wait(50);
				search("typing10");
				// extra 100 ms for safety
				await tc.wait(200);
				expect(onSearchMock).toHaveBeenCalledTimes(2);
				expect(onSearchMock).toHaveBeenLastCalledWith("typing10");
			});

		});

	});

});

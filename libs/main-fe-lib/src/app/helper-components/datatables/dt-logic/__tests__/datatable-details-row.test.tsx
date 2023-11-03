import React from 'react';
import { DatatableRow, DatatableDetailedRow, OnlyDetailedRowProps } from '../datatable-details-row';
import TableCell from '@material-ui/core/TableCell';
import { Observable } from 'rxjs';
import { cleanup, render, RenderResult, within } from '@testing-library/react';

const baseProps: OnlyDetailedRowProps = {
	onRowExpandToggle: () => {}, 
	renderDetails: () => "detailed_render_row_data", 
	rowIdx: 0, 
	children: [],
};

const getShallow = (p: Partial<OnlyDetailedRowProps> = {}) => {
	cleanup();
	return comp = render((<table><tbody><DatatableDetailedRow {...baseProps} {...p}/></tbody></table>));
};

/**
 * The current component ref for a test
 */
let comp: RenderResult;


describe("Datatable Row", () => {

	it("returns normal tr or custom tr based on prop", () => {
		const mock = jest.spyOn(console, 'error').mockImplementation(() => {});

		let jsx = render(<DatatableRow detailed={true}/>);
		expect(jsx.asFragment().childNodes.length).not.toBe(0);
		
		jsx = render(<DatatableRow detailed={false}/>);
		expect(jsx.asFragment().childNodes.length).toBe(0);

		mock.mockRestore();
	});

	describe("Detailed row", () => {
		const fn = (p: Partial<OnlyDetailedRowProps> = {}) => {
			return comp = getShallow(p);
		};

		const toggleRow = () => {
			tc.wrap(comp.getAllByRole('cell')[0]).click();
		};

		it("adds the hidden row that is used to show detailed content", () => {
			fn();
			expect(comp.getAllByRole('row')).toHaveLength(2);
		});

		it("generates extra td for toggle button, and ensures the details have only one column with the correct colSpan", () => {
			fn({});
			expect(within(comp.getAllByRole('row')[0]).getAllByRole('cell')).toHaveLength(1);
			expect(comp.getAllByRole('row')[1].childNodes).toHaveLength(1);
			expect(comp.getAllByRole('row')[1].firstChild).toHaveProperty("colSpan", 1);

			fn({children: [<TableCell key={"asdsxx"}>hello</TableCell>]});
			expect(within(comp.getAllByRole('row')[0]).getAllByRole('cell')).toHaveLength(2);
			expect(comp.getAllByRole('row')[1].childNodes).toHaveLength(1);
			expect(comp.getAllByRole('row')[1].firstChild).toHaveProperty("colSpan", 2);

			fn({children: [<TableCell key={"asdsxx"}>hello</TableCell>, [<TableCell key={"asdasd"}>hello2</TableCell>, <TableCell key={'zxczxc'}>hello3</TableCell>]]});
			expect(within(comp.getAllByRole('row')[0]).getAllByRole('cell')).toHaveLength(4);
			expect(comp.getAllByRole('row')[1].childNodes).toHaveLength(1);
			expect(comp.getAllByRole('row')[1].firstChild).toHaveProperty("colSpan", 4);
		});

		it("initial open state", () => {
			const renderFn = () => "Rendered_details_row_data";
			fn({renderDetails: renderFn});
			expect(comp.queryByText(renderFn())).toBeNull();

			fn({renderDetails: renderFn, initialExpanded: true});
			expect(comp.queryByText(renderFn())).not.toBeNull();
		});

		it("onOpen callback", () => {
			const mock = jest.fn();
			fn({onRowExpandToggle: mock, initialExpanded: false});
			expect(mock).toHaveBeenCalledTimes(0);

			fn({onRowExpandToggle: mock});
			expect(mock).toHaveBeenCalledTimes(0);

			fn({onRowExpandToggle: mock, initialExpanded: true});
			expect(mock).toHaveBeenCalledTimes(0);
			toggleRow();
			expect(mock).toHaveBeenCalledTimes(1);
			toggleRow();
			expect(mock).toHaveBeenCalledTimes(2);
		});

		describe("render fn", () => {
			
			const test = (mock: jest.Mock<any>, text: string) => {
				fn({renderDetails: mock, initialExpanded: true});
				expect(mock).toHaveBeenCalledTimes(1);
				expect(comp.queryByText(text)).not.toBeNull();

				mock.mockClear();
				fn({renderDetails: mock});
				expect(mock).toHaveBeenCalledTimes(0);
				expect(comp.queryByText(text)).toBeNull();

				toggleRow();
				expect(mock).toHaveBeenCalledTimes(1);
				expect(comp.queryByText(text)).not.toBeNull();

				toggleRow();
				expect(mock).toHaveBeenCalledTimes(1);
				// on close the item is still mounted, so the length is not 0
				expect(comp.queryByText(text)).not.toBeNull();
			};

			it("calls the sync fn and the async", () => {
				test(jest.fn().mockReturnValue("__jsxchild__SYNC"), "__jsxchild__SYNC");
				
				test(jest.fn().mockReturnValue(new Observable((obs) => obs.next("__jsxchild__OBS"))), "__jsxchild__OBS");

				test(jest.fn().mockReturnValue(new Observable((obs) => obs.next(() => "__jsxchild__OBS"))), "__jsxchild__OBS");
			});

		});

	});


});

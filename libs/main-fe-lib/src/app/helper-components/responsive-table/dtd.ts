import { TableProps } from "@material-ui/core/Table";
import { BoxProps } from "@material-ui/core/Box";
import { TableCellProps } from "@material-ui/core/TableCell";
import { TableRowProps } from "@material-ui/core/TableRow";
import { TableContainerProps } from "@material-ui/core/TableContainer";

declare type tableSimpleConf = number | boolean | string | JSX.Element;

export declare type ComplexCell = {
	props: TableCellProps,
	// props:
	// 	React.DetailedHTMLProps<React.ThHTMLAttributes<HTMLTableHeaderCellElement>, HTMLTableHeaderCellElement> |
	// 	React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableDataCellElement>, HTMLTableDataCellElement>,
	jsxEl: tableSimpleConf
};
export declare type TableInput = tableSimpleConf | ComplexCell;

export declare type ComplexRow = {
	props: TableRowProps,
	// props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>,
	tds: TableInput[]
};
export declare type TableHead = TableInput[] | ComplexRow;
export declare type TableBody = Array<( TableInput[] | ComplexRow )>;

export declare type TableConf = {
	/**
	 * If the table should be responsive or not
	 */
	responsive?: false | {
		// TODO implement
		// headerPosition: 'top' | 'left',
		breakPoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
		containerProps?: BoxProps,
	},
	/**
	 * Props for the table element
	 */
	tableProps?: TableProps
	tableContainerProps?: TableContainerProps;
	// tableProps?: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>
};

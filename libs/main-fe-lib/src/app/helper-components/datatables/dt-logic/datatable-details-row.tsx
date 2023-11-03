import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow, { TableRowProps } from '@material-ui/core/TableRow';
import Collapse from '@material-ui/core/Collapse';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import { isObservable, Observable } from 'rxjs';
import { makeStyles, darken, fade, Theme } from '@material-ui/core';
import clsx from 'clsx';

const useRowStyles = makeStyles((theme: Theme) => ({
	root: {
		'&:hover:not($selectedRow)': {
			background: darken(theme.palette.background.paper, 0.1) + " !important",
		},
	},
	selectedRow: {
		background: fade(theme.palette.primary.light, theme.palette.type === 'dark' ? 0.2 : 0.6) + " !important",
	},
	
	detailedRow: {
		// remove position relative
		// because it triggers a layer creation for each button
		'& > td:first-child > button': {
			position: 'unset',
		},
		'& > *': {
			borderBottom: 'unset',
		},
		'&$selectedRow + tr': { 
			background: fade(theme.palette.primary.light, theme.palette.type === 'dark' ? 0.2 : 0.6) + " !important",
		},
		'&:hover:not($selectedRow) + tr': {
			background: darken(theme.palette.background.paper, 0.1),
		},
	},
	collapsedCell: {
		paddingTop: "0",
		paddingBottom: "0",
	}
}));

/**
 * exporting for testing
 */
export type OnlyDetailedRowProps = {
	onRowExpandToggle: (e: React.MouseEvent<any>, state: boolean) => void, 
	initialExpanded?: boolean, 
	openClassName?: string, 
	renderDetails: (rowIdx: number) => any | Observable<any>, 
	rowIdx: number, 
	children: any
};

type DetailedRowProps = OnlyDetailedRowProps & TableRowProps;

export function DatatableRow<A extends boolean = false>(props: {detailed?: boolean} & (A extends true ? DetailedRowProps : Partial<DetailedRowProps>) ) {
	
	// clear the props
	if (props.detailed === true) {
		const {detailed, ...other} = props;
		return <DatatableDetailedRow {...other as DetailedRowProps}/>;
	}
	else {
		const { detailed, openClassName, rowIdx, renderDetails, initialExpanded, onRowExpandToggle: onRowExpand, ...other } = props;
		return <DatatableSimpleRow {...other}/>;
	}

}


/**
 * As the color props doesnt work i manually fix it here
 * 
 * exporting for testing
 */
export function DatatableSimpleRow(props: TableRowProps) {
	const classes = useRowStyles();

	return (
		<TableRow {...props} className={clsx(classes.root, props.className, {[classes.selectedRow]: props.selected})}/>
	);
}

/**
 * Creates a row that has allows to "open" the row and see the details of it
 * 
 * exporting for testing
 */
export function DatatableDetailedRow(props: DetailedRowProps) {
	const classes = useRowStyles();
	
	const {
		renderDetails: details,
		initialExpanded,
		onRowExpandToggle,
		rowIdx,
		className = '',
		openClassName,
		...other
	} = props;

	const [open, setOpen] = React.useState(initialExpanded || false);
	const [detailObj, setDetailObj] = React.useState<any>();
	// used to show the loading state of the observable
	// we start with undefined as a special case to know that we can load the data with "props.initialExpanded"
	const [isDetailSet, setIsDetailSet] = React.useState(undefined);

	
	const toggleOpen = (e: React.MouseEvent<any>) => {
		e.stopPropagation();

		if (open) {
			setOpen(false);
			onRowExpandToggle(e, false);
		} else {
			processRenderFn();
			onRowExpandToggle(e, true);
		}
	};

	const processRenderFn = () => {
		setIsDetailSet(false);
		setOpen(true);

		const toShow = details(rowIdx);
		if (!isObservable(toShow)) {
			setDetailObj(toShow);
			setIsDetailSet(true);
		}
		else {
			toShow.subscribe(r => {
				// so apparently if you useState and set a function as a value
				// react automatically resolves the function
				// for this reason i set this weird object here as to not make react resolve the function
				// and to keep a functional component
				//
				// what?
				setDetailObj(typeof r === 'function' ? {__jsxFn: r} : r);
				setIsDetailSet(true);
			});
		}
	};

	// we open the row if given inital state true
	if (initialExpanded && isDetailSet === undefined) {
		processRenderFn();
	}

	// count the colspan for the hidden row
	let colSpan = 1;
	if (props.children) {
		for (const k of props.children) {
			if (Array.isArray(k)) { 
				colSpan += k.length; 
			} else {
				colSpan += 1;
			}
		}
	}

	return (
		<React.Fragment>
			<TableRow {...other} className={clsx(classes.root, classes.detailedRow, className, {[classes.selectedRow]: props.selected})}>
				<TableCell onClick={toggleOpen} padding='none'>
					<IconButton size="small">
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
				{props.children}
			</TableRow>
			<TableRow>
				<TableCell className={classes.collapsedCell} colSpan={colSpan}>
					<Collapse in={open} timeout="auto">
						<Box margin={1}>
							{isDetailSet 
								? detailObj && detailObj.__jsxFn ? detailObj.__jsxFn() : detailObj
								: <Box textAlign='center' maxWidth="calc(100vw - 4em)"><CircularProgress/></Box>
							}
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</React.Fragment>
	);
}


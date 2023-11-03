import './generic-table-styling.css';
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Checkbox from '@material-ui/core/Checkbox';
import Paper from '@material-ui/core/Paper';
import TablePagination from '@material-ui/core/TablePagination';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Radio from '@material-ui/core/Radio';
import LinearProgress from '@material-ui/core/LinearProgress';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import clsx from 'clsx';
import { DTProps, DTState, DTPageChangeRequestObject, DTCachedState, DTDataObject } from './datatable.dtd';
import { isObservable } from 'rxjs';
import { withStyles } from '@material-ui/core';
import { DatatableToolbar } from './datatable-toolbar';
import { DataStorageService } from '@sixempress/utilities';
import { ObjectUtils } from '@sixempress/utilities';
import { DatatableRow } from './datatable-details-row';
import { SmallUtils } from '@sixempress/utilities';
import Skeleton from '@material-ui/lab/Skeleton';

const useDtStyles = {
	// tableContainer: {
	// 	// minHeight: '468px',
	// 	maxHeight: "600px",
	// },
	table: {
		whiteSpace: 'nowrap',
		'& > *': {
			borderBottom: 'unset',
		},

		// "& > thead > tr:nth-child(1) > *": {
		// 	background: darken(theme.palette.background.paper, 0.2),
		// },
			// remove padding for the loading icon
		"& > thead > tr:nth-child(2) > *": {
			padding: 0,
		}
	},
	tableIsLoading: {
		pointerEvents: 'none',
		"& > tbody": {
			opacity: 0.3,
		}
	},
	withDetailsRow: {
		// reset the childs whitespace
		'& > tbody > tr > td > *': {
			whiteSpace: 'normal',
		},
		'& > thead > tr > th:first-child': {
			width: "1px",
		},
		'& > tbody > tr > td:first-child': {
			width: "1px",
			paddingLeft: "13px",
			paddingRight: "5px",
		},
	}
};

declare type Props<T> = DTProps<T> & {classes: {[A in keyof typeof useDtStyles]: string}};
// declare type Props<T> = DTProps<T> & {classes: {[A in keyof ReturnType<typeof useDtStyles>]: string}};

/**
 * exporting for typing
 */
export class Datatable_Internal<T = any> extends React.Component<Props<T>, DTState> {

	private static defaultOrderDirection: 'asc' | 'desc' = 'desc';

	/**
	 * to update a row we have to change its key
	 * so here we store a custom prefix that we use
	 * so we can "toggle" it to update the row
	 * 
	 * instead of adding random numbers and possiblity having a key that too long
	 */
	private static updateJsxKeysPrefix = '_ujkp_';

	private static toggleJsxKeyPrefix(key: string | number): string {
		const k = key.toString();

		return k.indexOf(Datatable_Internal.updateJsxKeysPrefix) === 0
			? k.slice(Datatable_Internal.updateJsxKeysPrefix.length)
			: Datatable_Internal.updateJsxKeysPrefix + k;
	}

	constructor(p: Props<T>) {
		super(p);

		const possibleRows = p.possibleRowsPerPage || [10, 20, 50];
		const rowsToSet = p.initialRowsPerPage || possibleRows[0] || 0;
		// set initial data
		this.state = {
			rowsPerPage: rowsToSet,
			firstPaint: true,
			currentPage: 0,
			possibleRowsPerPage: possibleRows.includes(rowsToSet) ? possibleRows : [...possibleRows, rowsToSet],
			hasLoaded: false,
			selected: [],
			columnsVisibility: p.columns.map(c => c.visible === false ? false : true),
			sort: {column: 0, dir: Datatable_Internal.defaultOrderDirection},
			data: {data: [], rowJsxKey: [], totalItems: 0},
			expandedRows: {},
			searchFieldValue: '',
		};

		// restore cached
		const cached: DTCachedState = this.props.saveStateCacheKey && DataStorageService.getSafeValue(this.props.saveStateCacheKey, 'object');
		if (cached) {
			
			if (cached.rowsPerPage) {
				// reset if still available in values
				if (this.state.possibleRowsPerPage.includes(cached.rowsPerPage)) {
					(this.state as DTState).rowsPerPage = cached.rowsPerPage;
				}
			}

			if (cached.columns) {
				for (let i = 0; i < cached.columns.length; i++) {
					// try to match the current index
					if (this.props.columns[i] && this.props.columns[i].data === cached.columns[i].data) {
						this.state.columnsVisibility[i] = cached.columns[i].visible;
					}
					// if current index is not matching, fall back to manual search
					else {
						const idx = this.props.columns.findIndex(c => c.data === cached.columns[i].data);
						if (idx !== -1) { this.state.columnsVisibility[idx] = cached.columns[i].visible; }
					}
				}
			}
		}

		// always verify that the sort is possible and set it
		// use cached or fallback to given initial if present
		const sort = (cached && cached.sort) || 
			(p.initialSort && p.columns[p.initialSort.column] && {...p.initialSort, data: p.columns[p.initialSort.column].data})

		if (sort) {
			// try to match the cached idx
			// and if not the same col fallback to searching it
			const idx = this.props.columns[sort.column] && this.props.columns[sort.column].data === sort.data
				? sort.column
				: this.props.columns.findIndex(c => c.data === sort.data);
			
			// if target exists and is orderable
			// then restore the cached value
			if (this.props.columns[idx] && this.props.columns[idx].orderable !== false) {
				(this.state as DTState).sort = {column: idx, dir: sort.dir};
			}
		}


	}

	componentDidMount() {
		this.updateTableData();
	}

	componentWillUnmount() {
		if (this.props.saveStateCacheKey) {
			DataStorageService.localStorage.setItem(this.props.saveStateCacheKey, JSON.stringify(this.getState()));
		}
	}

	/**
	 * Allows to hide/view a column
	 */
	public changeColumnVisibility = (toSet: {idx: number, vis: boolean}[]) => {
		this.setState(s => {
			const cols = [...s.columnsVisibility];
			for (const c of toSet) {
				if (typeof cols[c.idx] !== 'undefined') {
					cols[c.idx] = c.vis;
				}
			}
			return {columnsVisibility: cols};
		});
	}

	/**
	 * Does not checks if the values given are valid
	 */
	public setOrder = (idx: number, dir: 'asc' | 'desc') => {
		this.setState({sort: {column: idx, dir}}, this.updateTableData);
	}

	/**
	 * changes the rows data object
	 * @param keepExpanded used for detailed rows to prevent from closing the details
	 */
	public updateRowsData = (data: {idx: number, data: any}[], keepExpanded?: boolean) => {
		const ks = [...this.state.data.rowJsxKey];
		const dt = [...this.state.data.data];
		const ex = {...this.state.expandedRows};

		for (const d of data) {
			if (!dt[d.idx]) { continue; }
			
			dt[d.idx] = d.data;
			ks[d.idx] = Datatable_Internal.toggleJsxKeyPrefix(ks[d.idx]);

			if (ex[d.idx]) {
				ex[d.idx] = keepExpanded || false;
			}
		}

		this.setState({data: {...this.state.data, data: dt, rowJsxKey: ks}, expandedRows: ex});
	}

	/**
	 * closes all the columns or only the given indexes
	 */
	public collapseDetailedRows = (idx?: number[]) => {
		if (idx) {
			const ks = [...this.state.data.rowJsxKey];
			for (const i of idx) {
				if (!ks[i]) { continue; }
				ks[i] = Datatable_Internal.toggleJsxKeyPrefix(ks[i]);
			}
			this.setState({data: {...this.state.data, rowJsxKey: ks}});
		}
		else {
			this.setState((s) => {
				const data = {...s.data};
				data.rowJsxKey = data.rowJsxKey.map(k => Datatable_Internal.toggleJsxKeyPrefix(k));
				return {data};
			});
		}

	}

	/**
	 * Returns the current state of the datatable
	 */
	public getState = (): DTCachedState => {
		const toR: DTCachedState = {
			currentPage: this.state.currentPage,
			rowsPerPage: this.state.rowsPerPage,
			sort: {...this.state.sort},
			columns: this.state.columnsVisibility.map((c, idx) => ({visible: c, data: this.props.columns[idx].data})),
			search: this.state.searchFieldValue,
		}

		// add data if exists
		if (this.props.columns[this.state.sort.column]) {
			toR.sort.data = this.props.columns[this.state.sort.column].data;
		}

		return toR;
	};

	/**
	 * Returns the info necessary to generate a table page data-set
	 */
	public getCurrentDtPageInfo = (): DTPageChangeRequestObject => {
		const skip = this.state.currentPage * this.state.rowsPerPage;
		const length = this.state.rowsPerPage;
		const sort = this.state.sort;

		return {
			limit: length,
			order: [{...sort}],
			search: {value: this.state.searchFieldValue, regex: true},
			skip,
		};
	}

	/**
	 * Generates the jsx keys and set the array
	 */
	private setTablesData = (data: DTDataObject) => {
		
		// ensure the new keys are always completely updated
		const currKeys = this.state.data.rowJsxKey;
		const parallelArr = data.data.map((d, idx) => {
			const k = d._id || idx.toString();
			return currKeys[idx] === k
				? Datatable_Internal.toggleJsxKeyPrefix(k)
				: k;
		});

		this.setState({error: undefined, firstPaint: false, hasLoaded: true, data: {...data, rowJsxKey: parallelArr}, expandedRows: {}});
	}

	// public updateTableData = (keepSelectedRows?: boolean): void => {
	// }

	public reloadTable = (keepData?: boolean) => {
		if (keepData)
			return this.updateTableDataInternal(true);

		// restore possibile broken params and reload
		this.setState(
			{searchFieldValue: '', currentPage: 0},
			() => this.updateTableDataInternal(),
		);
	}

	private onClickReloadTable = () => {
		return this.reloadTable()
	};

	/**
	 * used as callback for setState
	 */
	private updateTableData = () => {
		return this.updateTableDataInternal(true);
	}

	/**
	 * Processes the props to get the data to show in the table
	 */
	private updateTableDataInternal = (keepSelectedRows?: boolean) => {
		// we manually return promise so we can override behavior for testing purposes
		return new Promise((r, j) => {
			this.getDataForUpdateSwitchMap(keepSelectedRows)
			.then(d => {
				this.setTablesData(this.props.sortAndProcessData ? this.orderAndProcessDataObj(d[0], d[1].data) : d[1]);
				r(d);
			})
			.catch(e => {
				this.setState({error: e});
				j(e);
			})
		});
	};

	/**
	 * Switch map for the table queries
	 */
	private getDataForUpdateSwitchMap = SmallUtils.switchPromise(async (keepSelectedRows?: boolean) => {
		return new Promise<[DTPageChangeRequestObject, DTDataObject]>((r, j) => this.getDataForUpdate(r, j, keepSelectedRows));
	});

	/**
	 * Returns the data to update the table
	 */
	private getDataForUpdate = (resolve: (d: [DTPageChangeRequestObject, DTDataObject]) => void, reject: (e: any) => void, keepSelectedRows?: boolean) => {

		const dtState = this.getCurrentDtPageInfo();
		this.setState({hasLoaded: false, selected: keepSelectedRows ? this.state.selected : []});

		const onSuccess = (data: DTDataObject) => resolve([dtState, data]);
		const onError = (e: any) => reject(e)
		
		// filter with array given as data
		if (Array.isArray(this.props.data))
			return onSuccess({data: this.props.data, totalItems: this.props.data.length});

		// wrap in try catch, as the data() function could be sync
		// so this way we catch even if the sync function has errored
		try {
			const maybe_obs = this.props.data(dtState);

			if (maybe_obs instanceof Promise)
				return maybe_obs.then(onSuccess).catch(onError)
			
			if (isObservable(maybe_obs))
				return maybe_obs.subscribe(onSuccess, onError);

			return onSuccess(maybe_obs);
		} 
		catch (e) {
			onError(e);
		}
	}

	/**
	 * Processes the data to return a subset ready for it to be displayed in the table
	 * @param dtState current state of the table
	 * @param data data to filter/order etc
	 */
	private orderAndProcessDataObj(dtState: DTPageChangeRequestObject, data: T[]): {data: T[], totalItems: number} {
		// filter
		const filtered = !dtState.search.value
			? data
			: data.filter(c => {

				for (const ref of this.props.columns) {
					if (ref.search === false) {
						continue;
					}

					const v = ObjectUtils.getValueByDotNotation(c, ref.data as string);

					if (typeof ref.search === 'undefined' || ref.search === true || ref.search.regex) {
						if (typeof v === 'string' && v.toString().match(new RegExp(dtState.search.value, 'i'))) {
							return true;
						}
					}
					else if (ref.search.toInt) {
						if (v === parseInt(dtState.search.value)) {
							return true;
						}
					}
					else if (ref.search.manual) {
						if (v === ref.search.manual(dtState.search.value)) {
							return true;
						}
					}
					else if (!ref.search.regex) {
						if (v === dtState.search.value) {
							return true;
						}
					}
					
				}

				return false;
			});

		// order
		const orderBy = this.props.columns[dtState.order[0].column] && this.props.columns[dtState.order[0].column].data;
		const sorted = !orderBy 
			? filtered 
			: filtered
				.sort((a, b) => dtState.order[0].dir === 'desc' 
					? ObjectUtils.getValueByDotNotation(a, orderBy as string) < ObjectUtils.getValueByDotNotation(b, orderBy as string) ? 1 : -1 
					: ObjectUtils.getValueByDotNotation(a, orderBy as string) > ObjectUtils.getValueByDotNotation(b, orderBy as string) ? 1 : -1
				);

		// slice
		const sliced = this.props.disablePagination ? sorted : sorted.slice(dtState.skip, dtState.skip + dtState.limit);

		// return all
		return {data: sliced, totalItems: filtered.length};
	}

	private handleRowSelect = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.idx;
		const relativeModel = this.state.data.data[idx];

		if (typeof this.props.select === 'object') {
			this.props.select.onSelect(e, relativeModel);
			return;
		}

		this.setState(s => {

			const inArrIdx = s.selected.indexOf(relativeModel);
			
			if (this.props.select === 'single') {
				if (inArrIdx === -1) {
					return {selected: [relativeModel]};
				} else {
					return {selected: []};
				}
			}
			else if (this.props.select === 'multi') {
				const arr = [...s.selected];

				if (inArrIdx === -1) {
					arr.push(relativeModel);
				} else {
					arr.splice(inArrIdx, 1);
				}

				return {selected: arr};
			}

		});
	}

	private handleSearch = (val: string) => {
		// goto first page on the search obviously
		// as if we are on page 2 and there are 1 result
		// it will show empty table
		this.setState({searchFieldValue: val, currentPage: 0}, this.updateTableData);
	}

	private handleChangePage = (event: unknown, newPage: number) => {
		this.setState({currentPage: newPage}, this.updateTableData);
	}
	
	private handleSortChange = (e: React.MouseEvent<any>) => {
		const colIdx = parseInt(e.currentTarget.dataset.idx);
		
		if (this.state.sort.column === colIdx) {
			const newDir = this.state.sort.dir === 'asc' ? 'desc' : 'asc';
			this.setState({sort: {...this.state.sort, dir: newDir}}, this.updateTableData);
		}
		else {
			this.setState({sort: {column: colIdx, dir: Datatable_Internal.defaultOrderDirection}}, this.updateTableData);
		}
		
	}

	private handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		const val = parseInt(event.target.value, 10);
		this.setState({rowsPerPage: val, currentPage: 0}, this.updateTableData);
	}
	
	private renderDetails = (rowIdx: number) => {
		const model = this.state.data.data[rowIdx];
		return this.props.renderDetails!(model);
	}
	
	private paginationFn = ({ from, to, count }) => {
		return `${from}-${to} su ${count !== -1 ? count : `più di ${to}`}`;
	}

	private onRowExpand = (e: any, state: boolean) => {
		const idx = e.currentTarget.parentElement.dataset.idx;
		const ex = {...this.state.expandedRows};
		ex[idx] = state;
		this.setState({expandedRows: ex});
	}

	/**
	 * returns the first parent that has vertical scroll
	 */
	private getScrollableParent(node: any): HTMLElement | null {
		// TODO move this function outside from the table as the id check is whitebox
		if (!node || (node.id && node.id[0] === 'm' && node.id[1] === 'w')) {
			return null;
		}
		if (node.scrollHeight > node.clientHeight) {
			return node;
		}
		else {
			return this.getScrollableParent(node.parentNode);
		}
	}

	render() {

		const isDetailed = Boolean(this.props.renderDetails);
		const Wrapper = this.props.removePaper === true ? React.Fragment : Paper;
		
		if (typeof this.state.error !== 'undefined') {
			return (
				<Wrapper>
					<Box p={1}>
						Errore durante la visualizzazione della tabella
						<br/>
						<Button color='primary' onClick={this.onClickReloadTable}>Ricarica</Button>
					</Box>
				</Wrapper>
			);
		}

		const p = this.props;
		const data = this.state.data.data;
		const totalItems = this.state.data.totalItems;
		const rowsPerPage = this.state.rowsPerPage;
		const page = this.state.currentPage;

		const selectMode = this.props.select;

		const addSelectVisualColumn = selectMode && this.props.removeSelectVisualColumn !== true;

		let totColumn = p.columns.length;
		if (isDetailed) { totColumn++; }
		if (addSelectVisualColumn) { totColumn++; }

		// for tests/css/tutorial
		const tableTags = {datatable: "true"};
		if (isDetailed) { tableTags["detailed"] = "true"; }

		return (
			<Wrapper>

				{this.props.toolbar && (
					<DatatableToolbar selected={this.state.selected} config={this.props.toolbar} onSearch={this.handleSearch} initialSearchValue={this.state.searchFieldValue} canSelect={Boolean(selectMode)}/>
				)}

				<TableContainer component='div'>
					<Table size='small' className={clsx( p.classes.table, {[p.classes.withDetailsRow]: isDetailed, [p.classes.tableIsLoading]: !this.state.hasLoaded})} {...tableTags as any}>
						<TableHead>
							<TableRow>
								{isDetailed && ( 
									<TableCell/> 
								)}
								{addSelectVisualColumn && (
									<TableCell padding='checkbox'>
										{/* <Checkbox checked={}/> */}
									</TableCell>
								)}
								{p.columns.map((c, idx) => this.state.columnsVisibility[idx] === false ? (null) : (
									<TableCell
										key={c.title + (c.data as string) + idx}
										className={c.className}
										sortDirection={this.state.sort.column === idx ? this.state.sort.dir : false}
									>
										{c.orderable === false ? c.title : (
											<TableSortLabel
												active={this.state.sort.column === idx}
												direction={this.state.sort.column === idx ? this.state.sort.dir : Datatable_Internal.defaultOrderDirection}
												data-idx={idx}
												onClick={this.handleSortChange}
											>
												{c.title}
											</TableSortLabel>
										)}
									</TableCell>
								))}
							</TableRow>
							{!this.state.hasLoaded && (
								<TableRow>
									<TableCell colSpan={totColumn}>
										<LinearProgress color='secondary'/>
									</TableCell>
								</TableRow>
							)}
						</TableHead>
						<TableBody>
							{
							// on first paint page, add a skeleton
							!this.state.hasLoaded && this.state.firstPaint
							? new Array(rowsPerPage).fill(0).map((_, idx) => (
								<TableRow key={idx}><TableCell colSpan={totColumn}><Skeleton/></TableCell></TableRow>
							))
							
							// no data
							: data.length === 0 
							? (
									<TableRow>
										<TableCell colSpan={totColumn}>Nessun risultato</TableCell>
									</TableRow>
								)
							// show rows
							: data.map((row, idx) => {
								
								const isSelected = selectMode && (typeof selectMode === 'string' ? this.state.selected.includes(row) : selectMode.isSelected(row));

								return (
									<DatatableRow
										key={this.state.data.rowJsxKey[idx]} 
										detailed={isDetailed || undefined}
										hover 
										onRowExpandToggle={this.onRowExpand}
										initialExpanded={this.state.expandedRows[idx]}
										data-idx={idx} 
										onClick={selectMode && this.handleRowSelect} 
										rowIdx={idx}
										renderDetails={this.renderDetails}
										selected={isSelected}
									>
										{addSelectVisualColumn && (
											<TableCell padding='checkbox'>
												{typeof selectMode === 'object' && typeof selectMode.visualCell === 'function'
													? selectMode.visualCell(row)
													: (selectMode === 'single' || (selectMode as {visualCell: 'radio'}).visualCell === 'radio')
														? <Radio color='primary' checked={isSelected}/>
														: <Checkbox color='primary' checked={isSelected}/> 
												}
											</TableCell>
										)}
										{p.columns.map((c, idx) => this.state.columnsVisibility[idx] === false ? (null) : (
											<TableCell 
												key={c.title + (c.data as string) + idx}
												className={c.className}
											>
												{c.render ? c.render(ObjectUtils.getValueByDotNotation(row, c.data as string), row) : ObjectUtils.getValueByDotNotation(row, c.data as string)}
											</TableCell>
										))}
									</DatatableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>

				{!this.props.disablePagination && (
					<TablePagination
						rowsPerPageOptions={this.state.possibleRowsPerPage}
						component="div"
						count={totalItems}
						rowsPerPage={rowsPerPage}
						page={page}
						
						data-testid="datatable-table-pagination"
	
						backIconButtonText="Indietro"
						labelRowsPerPage="Righe"
						nextIconButtonText="Avanti"
						labelDisplayedRows={this.paginationFn}
	
						onPageChange={this.handleChangePage}
						onRowsPerPageChange={this.handleChangeRowsPerPage}
					/>
				)}
			</Wrapper>
		);
	}
}


// export const Datatable: React.ComponentType<DTProps<any> & {ref?: any}> = ((withStyles as any)(useDtStyles as any) as any)(Datatable_Internal as any) as any;
export const Datatable: React.ComponentType<DTProps<any> & {ref?: any}> = (withStyles as any)(useDtStyles)(Datatable_Internal);

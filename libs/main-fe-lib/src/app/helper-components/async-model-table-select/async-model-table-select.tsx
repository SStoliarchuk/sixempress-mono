import './amts.css';
import React from "react";
import type { ComponentClass } from "react";
import Paper from '@material-ui/core/Paper'; 
import Box from '@material-ui/core/Box'; 
import Input from '@material-ui/core/Input'; 
import CircularProgress from '@material-ui/core/CircularProgress'; 
import Divider from '@material-ui/core/Divider'; 
import Button from '@material-ui/core/Button';
import Edit from '@material-ui/icons/Edit';
import { IBaseModel } from "../../services/controllers/IBaseModel";
import { Subject, Observable } from "rxjs";
import { debounceTime } from 'rxjs/operators';
import { IAsyncModelSelectProps } from "./dtd";
import InfiniteScroll from 'react-infinite-scroller';
import { ModalService } from "../../services/modal-service/modal.service";
import { ObjectUtils } from "@sixempress/utilities";
import { ErrorNames, SystemError } from "../../utils/errors/errors";
import { IClientApiRequestOptions } from "../../services/dtd";
import { AbstractDtHelper } from "../datatables/abstract/abstract-dt-helper";
import IconButton from "@material-ui/core/IconButton";
import { AbstractEditorProps } from "../abstract-editor/dtd/abstract-editor.dtd";
import { RequestService } from "../../services/request-service/request-service";
import { QueryParameters } from "../../services/controllers/controllers.dtd";
import { UiSettings } from "../../services/ui/ui-settings.service";

interface AMTSState<T> {
	/**
	 * The items that will be displayed
	 */
	modelsArray: T[];
	/**
	 * The model that the user has clicked on
	 * it is used to display info about that model
	 */
	selectedModel?: T;

	/**
	 * Incase it errors, just show some text
	 */
	fetchError?: false | ErrorNames.AuthErr | true;
}
/**
 * This component allows to pick a model from the BE or Create a new one in async mode
 * 
 * Used to chose an item for the editor and to query all the items and then make a select
 * ( 
 *  as this items emits only the chosen (or created) item, it could work as a multi select too
 *  the multiselect should be implemented by the class that use this component
 * )
 * 
 * This component was designed to be used in a container (like a popper)
 */
export class AsyncModelTableSelect<T extends IBaseModel> extends React.Component<IAsyncModelSelectProps<T>, AMTSState<T>> {

	state: AMTSState<T> = { 
		modelsArray: []
	};

	/**
	 * A subject that emits every time there is a key press in the search field
	 */
	private searchFieldEmitter = new Subject<string>();
	/**
	 * The search parameters for the table
	 */
	protected searchKey: string;
	/**
	 * Hardcoded limit for react-infinite-scroll
	 */
	protected limit = 10;
	/**
	 * The offset used by react-infinite-scroll
	 * It is increased when the user scroll
	 */
	protected offset = 0;
	/**
	 * Signals to the scroller if there are more items to fetch
	 * If this is false, then react-infinite-scroll stops sending queries
	 */
	protected hasMoreToScroll: boolean = true;


	componentDidMount() {
		
		if (this.props.infoConf.columns.length === 0) {
			throw new Error("Cannot display amts withouth column array");
		}

		this.bindSearchEmitter();
		if (UiSettings.moreMd()) {
			const e = document.getElementById('searchField');
			if (e) { e.focus(); }
		}
	}

	/**
	 * Listen to the search field
	 */
	private bindSearchEmitter(): void {
		this.searchFieldEmitter.pipe(
			debounceTime(500)
		).subscribe(value => {
			this.offset = 0;
			this.searchKey = value;
			this.setItems(true).subscribe();
		});
	}


	/**
	 * Queries items and then sets the display array
	 * @param emptyArray If true, replaces the current queried items, with the new ones
	 */
	protected setItems(emptyArray?: true): Observable<void> {
		return new Observable(obs => {

			let opts: IClientApiRequestOptions<any> = {};
			if (this.props.requestOptions) {
				opts = typeof this.props.requestOptions === 'function'
					? this.props.requestOptions(this.generateQueryOptions() as any)
					: this.props.requestOptions;
			}

			if (typeof opts.disableLoading === 'undefined')
				opts.disableLoading = true;

			if (typeof opts.params === 'undefined')
				opts.params = this.generateQueryOptions();

			this.offset += this.limit;
			
			// get the items to display
			RequestService.client('get', this.props.bePath, opts as any).then(
				r => {
					const res = {items: r.data};

					// signals that there is no more items to fetc
					if (res.items.length < this.limit) { 
						this.hasMoreToScroll = false; 
					} else {
						this.hasMoreToScroll = true;
					}

					const newState: AMTSState<T> = {
						...this.state,
						fetchError: false,
					};
					// replace the result array
					if (emptyArray) {
						newState.modelsArray = res.items;
					} else {
						newState.modelsArray = [...this.state.modelsArray, ...res.items];
					}
					this.setState(newState);

					obs.next();
					obs.complete();
				}, 
				err => {
					// on auth error, simply show that its inacessible
					if (err && (err as SystemError).name === ErrorNames.AuthErr) {
						return this.setState({modelsArray: [], fetchError: ErrorNames.AuthErr});
					} 

					this.setState({modelsArray: [], fetchError: true});
					obs.error(err);
				}
			);

		});
	}

	/**
	 * Creates the query options used for the getMulti
	 */
	private generateQueryOptions(): QueryParameters<T> {


		// TODO when in the future dt-table will be replaced
		// move this logic in a dt-table:

		const opts: QueryParameters<T> = {
			// limit the retuned amounts
			'limit': this.limit,
			// skip the queried ones
			'skip': this.offset,
			// sort by latest
			'sort': {_id: -1},
		};

		if (typeof this.props.projection === 'object') {
			opts.projection = this.props.projection as any;
		}
		else if (this.props.projection !== false) {
			opts.projection = this.props.infoConf.columns.reduce((car: any, c) => { car[c.data] = 1; return car; }, {});
		}

		// add filters if the user has used the search function
		if (this.searchKey) {

			// add all the columns to the search
			const conditions: any = {};			
			for (const col of this.props.infoConf.columns) {
				// skip if not searchable
				if (col.searchable === false) { continue; }
				
				// add regex search
				if (!col.searchOptions || col.searchOptions.regex !== false) {
					conditions[col.data] = {$regex: this.searchKey, $options: 'i'};
				}
				
				// set to number search 
				if (col.searchOptions && col.searchOptions.castToInt) {
					// if nan then delete
					if (isNaN(parseInt(this.searchKey, 10))) {
						delete conditions[col.data];
					// else add as number
					} else {
						conditions[col.data] = parseInt(this.searchKey, 10);
					}	
				}
				
			}

			// add filters
			opts.filter = [AbstractDtHelper.mongoDbFilterToOr(conditions)];
		}

		if (this.props.getFilters) {
			const filter = AbstractDtHelper.mongoDbFilterToOr(this.props.getFilters);
			
			if (opts.filter) { (opts.filter as any).push(filter); } 
			else { opts.filter = [filter]; }
		}

		if (opts.filter) {
			if (!(opts.filter as any).length)
				delete opts.filter
			else 
				opts.filter = {$and: opts.filter};
		}

		return opts;
	}

	/**
	 * when you click on a row it adds the selected style on it
	 * and then saves the selected data
	 * @param rowId The id of the selected row
	 * @param client The client data of that row
	 */
	private selectRow = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.rowIdx;
		this.setState({...this.state, selectedModel: this.state.modelsArray[idx]});
	}

	private onClickModify = (e: React.MouseEvent<any>) => {
		const idx = e.currentTarget.dataset.rowIdx;
		this.openEditor(this.state.modelsArray[idx]._id);
	}
	/**
	 * Opens a modal with the given form as the content
	 * And overrides the default save behaviours, so when you save, you output the
	 * saved modal to the choseFn
	 */
	private addNewBtnClicked = (e?: any) => {
		this.openEditor();
	}

	private openEditor(idToModify?: string) {
			// notify the editor is open
			if (this.props.onEditorOpen) { 
				this.props.onEditorOpen();
			}
	
			// open the editor
			const modal = ModalService.open<ComponentClass<AbstractEditorProps<T>>>(
				{content: this.props.editor as any},
				{
					editorComponentId: idToModify,
					extendWrapper: true,
					onSaveSuccess: (savedObject: T, id: string) => { 
						modal.close(); 

						const fetch = this.generateQueryOptions().fetch;
						RequestService.client('get', this.props.bePath + id, fetch ? {params: {fetch}} : undefined)
						.then((r) => this.props.choseFn(r.data))
					},
				},
				{
					maxWidth: 'md',
					fullWidth: true,
					removePaper: true,
					onClosed: () => this.props.onEditorClose && this.props.onEditorClose(),
				},
			);

	}

	/**
	 * Fires everytime the scroll is almost to the bottom
	 * Adds items to the list
	 */
	private onScroll = () => { 
		this.setItems().subscribe(); 
	}
	/**
	 * Confirms the selected model from the table
	 */
	private confirmSelected = (e: React.MouseEvent<any>) => this.props.choseFn(this.state.selectedModel);
	/**
	 * Triggers the search field emitter
	 */
	private emitSearch = (e?: any) => this.searchFieldEmitter.next(e.target.value);

	
	render() {
		
		if (this.state.fetchError === ErrorNames.AuthErr ) {
			return (
				<Paper>
					<Box p={2} textAlign='center' display='flex' height='23.7em' width='303px' alignItems='center'>
						Non hai i permessi necessari per visualizzare questa lista
					</Box>
				</Paper>
			);
		}

		return (
			<Paper>
				{/* Using static height as to open the popover in the visible area */}
				<Box maxWidth='90vw' minWidth='20em' height='23.7em' p={2}>
					<Box pb={2}>
						<Input 
							onChange={this.emitSearch} 
							color='primary'
							placeholder="Cerca..."
							fullWidth
							id='searchField'
							autoComplete='off'
						/>
					</Box>
					{this.state.fetchError 
					? ( <Box textAlign='center'>Si e' verificato un errore imprevisto</Box> ) 
					: (
						<React.Fragment>
							<Box 
								className="search-results" 
								maxHeight='200px'
								overflow='auto'
								height='100%'
							>
								<InfiniteScroll
									pageStart={0}
									loadMore={this.onScroll}
									hasMore={this.hasMoreToScroll}
									// withouth this key, react says that each child should have unique key??
									// wut
									loader={<div key={0} className='text-center'><CircularProgress color='secondary'/></div>}
									useWindow={false}
									threshold={50}
									initialLoad={true}
								>
									<table className='table table-sm'>
										<thead>
											<tr>
												{this.props.editor && <th></th>}
												{this.props.infoConf.columns.map((col, idx) => (
													<th key={col.title + idx}>{col.title}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{this.state.modelsArray.map((model, idx) => (
												<tr 
													className={'mouse-link async_model_table_row ' + (this.state.selectedModel && this.state.selectedModel._id === model._id ? "selected" : "")}
													key={model._id || idx}
													data-row-idx={idx}
													onClick={this.selectRow}
												>
													{this.props.editor && (
														<td>
															<IconButton onClick={this.onClickModify} data-row-idx={idx} size='small'><Edit/></IconButton>
														</td>
													)}
													{this.props.infoConf.columns.map((col, colidx) => (
														<td key={idx + '' + colidx}>
															{
																col.render 
																? col.render(model)
																: ObjectUtils.getValueByDotNotation(model, col.data as string) 
															}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</InfiniteScroll>
							</Box>
							<Box my={1}>
								<Divider/>
							</Box>
							{/* Select chosen */}
							<Box display='flex'>
								{this.state.selectedModel && (
									<Button color='primary' fullWidth variant='contained' onClick={this.confirmSelected}>Conferma</Button>
								)}
								{/* Create new */}
								{this.props.editor && (
									<Button color='primary' fullWidth onClick={this.addNewBtnClicked}>Crea</Button>
								)}
							</Box>
						</React.Fragment>
					)}
				</Box>
			</Paper>
		);
	}

}

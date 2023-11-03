import React from 'react';
import { ICustomDtSettings } from '../custom-dt-types';
import { Datatable_Internal } from '../dt-logic/datatable';
import { IQueryStringParams, IMongoDBFetch, IMongoProjection } from '../../../services/controllers/dtd';
import { AbstractDtHelper } from './abstract-dt-helper';
import { ConfirmModalComponent } from '../../confirm-modal';
import { SmallUtils } from '@sixempress/utilities';
import { IBaseModel } from '../../../services/controllers/IBaseModel';
import { ABDTState, ABDTProps, TableVariation, ABDTAdditionalSettings } from './dtd';
import { DtFiltersSetting } from '../dt-filters/dtd';
import { DataStorageService } from '@sixempress/utilities';
import { CacheKeys } from '../../../utils/enums/cache-keys.enum';
import { RouterService } from '../../../services/router/router-service';
import { DTToolbarProps, DTButton, DTProps, DTDataRequestObject } from '../dt-logic/datatable.dtd';
import { ModalComponentProps } from '@sixempress/theme';
import { AbstractDbItemController } from '../../../services/controllers/abstract-db-item.controller';
import { RequestService } from '../../../services/request-service/request-service';
import { QueryFilter } from '../../../services/controllers/controllers.dtd';
import { LibSmallUtils } from '../../../utils/various/small-utils';

export abstract class AbstractBasicDtLogic<T extends IBaseModel, P extends ABDTProps<T> = ABDTProps<T>, S  extends ABDTState = ABDTState> extends React.Component<P & ModalComponentProps, S> {

	state: S = {
		tableFetched: false,
		dtFiltersComponentValue: {},
		selectedTableIdx: -1,
		availableTables: [],
	} as S;

	protected abstract controller: AbstractDbItemController<T>;

	protected removeButtonsOnSelectMode = true;

	protected defaultAvailableTables: TableVariation[];

	private buildedSchemaInfo: {fetch: IMongoDBFetch<T>[], projection: IMongoProjection<T>} = {fetch: [], projection: {}};

	protected additionalSettings?: ABDTAdditionalSettings<T>;

	/**
	 * Use this endpoint to send the delete request, instead of the controllerUrl
	 */
	protected deleteUrl: string;
	/**
	 * If this string is used, then the navigations will be from the absolute path given
	 * instead of the relative paths
	 *
	 * The path should start with a '/' and should end with a '/'
	 */
	public useAbsolutePath: string = RouterService.getCurrentPath();

	/**
	 * These are the configuration for the filters in the datatable,
	 * if this remains undefined then there will be no select filter generated
	 */
	protected filterSettings: DtFiltersSetting<T>;
	/**
	 * Reference to the instance of the created datatable
	 */
	protected dtTable = React.createRef<Datatable_Internal>();


	/**
	 * Generate the datatable options
	 */
	protected abstract getDtOptions(): ICustomDtSettings<T>;

	/**
	 * this var is here to be overridden from the abstract-dt.tsx
	 * as not to move the jsx in th abstract-dt.logic.tsx
	 */
	protected toolbarAddition: DTToolbarProps<T>['additional'];


	/**
	 * We keep the dtInput generations here and not before to allow the children that extends this class
	 * to be able to postpone the table generation if desired
	 */
	componentDidMount() {
		this.setState({
			dtInput: this.processDtInput(),
			availableTables: DataStorageService.getSafeValue(CacheKeys.dataTableAvailableTablesPrefix + (this.controller.bePath), 'object') || this.defaultAvailableTables || [],
		});
	}

	/**
	 * checks if the table is opened in select mode or default viewing mode
	 * @returns boolean
	 */
	protected isSelectMode = (p: P = this.props): p is P & {isEmbedded: "select"} => {
		return p.isEmbedded && ((p as ABDTProps<T>).isEmbedded === 'select');
	}

	/**
	 * takes the custom dt types and transforms it into dtprops
	 * and adds some custom base stuff
	 */
	protected processDtInput(): DTProps<T> {

		// get dt options
		const opts = this.getDtOptions();
		const isSelectMode = this.isSelectMode();

		// process data
		AbstractDtHelper.processDtColumns<T>(opts);
		AbstractDtHelper.processDtButtons<T>(opts);

		/**
		 * Cretes the custom toolbar
		 */
		if (opts.toolbar !== false) {
			const baseToolbar: DTToolbarProps<T> = {
				buttons: opts.buttons as DTButton<T>[],
				hideDisabledButtons: opts.hideDisabledButtons,
				search: typeof opts.search === 'undefined' ? true : opts.search,
				additional: this.toolbarAddition,
			};

			// add the select button to the toolbar
			if (isSelectMode) {
				opts.select = this.props.emeddedData.selectMode;
				opts.removeSelectVisualColumn = false;

				const selBtn: DTButton<T> = {
					title: "Conferma",
					// deicde the logic for the select
					enabled: this.props.emeddedData.selectMode === 'multi' 
						? (r) => r.length !== 0
						: (r) => r.length === 1,
					// close modal and yeet back if at least 1 item is present
					onClick: (e, models) => {
						if (models.length !== 0) {
							if (this.props.modalRef) { this.props.modalRef.close(); }
							this.props.emeddedData.onSelectConfirm(models.map(m => (m as T)._id), models);
						}
					}
				};

				// remove buttons by default
				const btnsToAdd: DTButton<T>[] = this.removeButtonsOnSelectMode
					? [selBtn] : [selBtn, ...opts.buttons as DTButton<T>[]];

				baseToolbar.buttons = btnsToAdd;
			}


			// if no values are given use the automatic toolbar
			if (typeof opts.toolbar === 'undefined' || opts.toolbar === true) {
				opts.toolbar = baseToolbar;
			}
			// set the title simply
			else if (typeof opts.toolbar === 'string') {
				baseToolbar.title = opts.toolbar;
				opts.toolbar = baseToolbar;
			} 
			// merge the manual and auto
			else {
				opts.toolbar = {...baseToolbar, ...opts.toolbar};
			}
		}

		/**
		 * sets default data function
		 */
		if (typeof opts.data === "undefined") {
			opts.data = async (dataTablesParameters: DTDataRequestObject) => {
				const res = await RequestService.client('get', this.controller.bePath, {
					disableLoading: true,
					params: {
						getCount: true,
						...this.generateArgsToUse(dataTablesParameters) as QueryFilter<T>,
					},
				});
				const filtered = +res.headers['x-filtered-count'];

				return {data: res.data, totalItems: isNaN(filtered) ? -1 : filtered};
			};
		}

		/**
		 * Creates the info for projections and fetch for the table
		 */
		const toBuildFetch = {};
		for (const c of opts.columns) {
			if (c.data) {
				toBuildFetch[c.data as any] = 1;
				if ((c.data as string).includes(".fetched")) {
					const p = (c.data as string).split(".fetched")[0];
					this.buildedSchemaInfo.projection[p as keyof T] = 1 as any;
				} 
				else {
					this.buildedSchemaInfo.projection[c.data as keyof T] = 1 as any;
				}
			}
		}
		this.buildedSchemaInfo.fetch = this.controller.getToFetchByProjection(toBuildFetch) as IMongoDBFetch<any>[];


		return opts as DTProps<T>;
	}

	/**
	 * Generates the arguments to use for the get request
	 */
	protected generateArgsToUse(dataTablesParameters: DTDataRequestObject): IQueryStringParams<any> {
		
		// gets the array of args to pass to client api
		const argsToUse = this.additionalSettings && this.additionalSettings.searchFields 
			? AbstractDtHelper.processDtParameters(dataTablesParameters, [...this.state.dtInput.columns, ...this.additionalSettings.searchFields])
			: AbstractDtHelper.processDtParameters(dataTablesParameters, this.state.dtInput.columns);

		if (!argsToUse.filter) 
			argsToUse.filter = [];

		// get additional get params
		const additionalGetParams = this.getAdditionalGetParams();

		// and apply them
		if (additionalGetParams) {
			for (const key in additionalGetParams) {
				if (key === 'filter') {
					argsToUse.filter.push(...additionalGetParams.filter);
				} else {
					argsToUse[key] = additionalGetParams[key];
				}
			}
		}

		// add filters from the dt filter component
		if (Object.keys(this.state.dtFiltersComponentValue).length)
			argsToUse.filter.push(this.state.dtFiltersComponentValue);
	
		if (argsToUse.filter.length === 1)
			argsToUse.filter = argsToUse.filter[0] as any;
		else if (argsToUse.filter.length)
			argsToUse.filter = {$and: argsToUse.filter} as any;
		else 
			delete argsToUse.filter;

		return argsToUse;
	}

	/**
	 * Generates extra get parameters to use when requesting ajax data from the be
	 */
	private getAdditionalGetParams(): void | IQueryStringParams<any> {

		// get the base params
		const additionalGetParams = this.additionalSettings && this.additionalSettings.getParams ? {...this.additionalSettings.getParams} : {};

		/**
		 * Add extra fields to fetch
		 */
		const toFetch: IMongoDBFetch<T>[] = [...this.buildedSchemaInfo.fetch];

		if (this.additionalSettings && this.additionalSettings.toFetch) { 
			toFetch.push(...this.additionalSettings.toFetch); 
		}
		if (additionalGetParams.options && additionalGetParams.options.fetch) {
			toFetch.push(...additionalGetParams.options.fetch);
		}

		// add fields to fetch
		if (toFetch.length) {
			additionalGetParams.fetch = additionalGetParams.fetch
				? [...additionalGetParams.fetch, ...toFetch]
				: toFetch;
		}


		/**
		 * Add extra projections
		 */
		const proj = this.additionalSettings && this.additionalSettings.projection
			? {...this.buildedSchemaInfo.projection, ...this.additionalSettings.projection}
			: {...this.buildedSchemaInfo.projection};

		additionalGetParams.projection = additionalGetParams.projection ? {...additionalGetParams.projection, ...proj} : proj;
		
		return additionalGetParams;
	}

	/**
	 * Returns the first item of an array of models
	 */
	protected getRowData(dt: T[] | T): T { 
		return Array.isArray(dt) ? dt[0] : dt;
	}

	/**
	 * Does a request to the BE to delete the object, upon successful delete reloads the table and shows a notification
	 * @param text Optional text as the body of the open modal
	 */
	protected sendDeleteRequest(dt: T[] | T, text?: string) {
		// TODO transform text to an object to customize every param
		ConfirmModalComponent.open(
			'Conferma eliminazione',
			text || 'Sei sicuro di voler eliminare questo elemento',
			(response) => {
				if (response) {
					RequestService.client('delete', (this.deleteUrl || this.controller.bePath) + this.getRowData(dt)._id).then(succ => {
						LibSmallUtils.notify('Eliminazione effettuata', 'success');
						this.reloadTable();
					});
				}
			}
		);
	}

	/**
	 * Opens the editor in add mode or edit mode
	 */
	protected openEditor(dt?: T[] | T): void {
		let editorPathToUse = '/editor';
		if (dt) {
			const id = this.getRowData(dt)._id;
			editorPathToUse += '/' + id;
		}
		this.relativeNavigation(editorPathToUse);
	}
	
	/**
	 * Navigates with this.router
	 * The function is here to remove boilerplate es.: {relativeTo: this.route}
	 * @param path The path to reach
	 */
	protected relativeNavigation(path: string): void {
		if (this.useAbsolutePath) {
			RouterService.goto(this.useAbsolutePath + path);
		} else {
			RouterService.goto(RouterService.getCurrentPath() + path);
		}
	}
	
	/**
	 * Reloads the datatable
	 */
	public reloadTable() {
		this.dtTable.current.reloadTable(true);
	}

}

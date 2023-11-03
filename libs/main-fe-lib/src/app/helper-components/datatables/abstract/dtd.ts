import { ICustomDtSettings } from "../custom-dt-types";
import { IBaseModel } from "../../../services/controllers/IBaseModel";
import { IUserFilter, IMongoProjection, IMongoDBFetch, IQueryStringParams } from "../../../services/controllers/dtd";
import { DTColumn, DTProps } from "../dt-logic/datatable.dtd";

export interface ABDTAdditionalSettings<T extends IBaseModel> {
	getParams?: IQueryStringParams<T>;
	toFetch?: IMongoDBFetch<T>[];
	projection?: IMongoProjection<T>;
	searchFields?: Pick<DTColumn<T>, 'search' | 'data'>[];
}

export interface TableVariation {
	name: string;
	filters: IUserFilter;
	// settings: DtSettings;
}

export interface ABDTState {
	/**
	 * This property adds custom fitlers to the generated ajax parameters
	 * 
	 * it should have to format for mongodb
	 */
	dtFiltersComponentValue: IUserFilter;
	// dtSettings: DtSettings;

	popoverFilters?: null | HTMLElement;
	popoverSettings?: null | HTMLElement;

	availableTables: TableVariation[];
	selectedTableIdx: number;

	/**
	 * A flag to signal to the dt that it can be generated (called after the fetch)
	 */
	tableFetched: boolean;
	/**
	 * The object to pass to the datatable logic configuration.
	 * The datatable will generate ONLY if this object is defined. Otherwise it
	 * generates an empty div
	 */
	dtInput?: DTProps<any>;
}

export interface ABDTProps<T extends IBaseModel> {

	isEmbedded: "select";
	emeddedData: { 
		/**
		 * When using this function be sure to requery the items, as the table can have custom projectsion
		 * so not all fields are ensured
		 */
		onSelectConfirm: (ids: string[], models: Partial<T>[]) => void,
		selectMode: "multi" | "single",
	};

}

export interface ABDTStoredState {
	isSelectMode: boolean;
	order: [[number, "asc" | "desc"]];
	columns: Array<{visible: boolean, data: string}>;
}

export interface ABDTCache<T> {
	/**
	 * The settings generated for the table
	 */
	dtOptions?: ICustomDtSettings<T>;
}


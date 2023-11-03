import { ISelectFilterOptions } from "./select-filter/dtd";
import { DtTimeFilterField } from "./datetime-filter/dtd";
import { AFCField } from "./amts-filter/dtd";

export interface ICustomFilter {
	setData(configuration: any): void;
	getData(configuration: any): void;
}

export interface IDateTimeFilter {
	fromData: number;
	toData: number;
}

export interface DtFiltersSetting<T> {
	addCreationTimeFilter?: boolean;
	
	timeFields?: DtTimeFilterField<T>[];
	selectFields?: ISelectFilterOptions<T>[];
	amtsFields?: AFCField<T>[];
}

export interface DtFiltersProps<T> extends DtFiltersSetting<T> {
	initialFilter: object;
	saveFilters?: (filters: IAppliedFilters) => void;
	saveAsNewTable: (tableName: string, filters: IAppliedFilters) => void;
	onApply: (filters: IAppliedFilters) => void;
	onClose: (e?: any) => void;
}


export interface IAppliedFilters {
	'_created._timestamp'?: { from: number, to: number };
	[key: string]: any;
}



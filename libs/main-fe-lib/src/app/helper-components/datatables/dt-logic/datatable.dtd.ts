import { Observable } from "rxjs";
import { Omit, ButtonProps } from "@material-ui/core";
import { JSXSupportedType } from "../../../../index";


export interface DTDataObject {
	totalItems?: number;
	data: any[];
}

export interface DTCachedState extends Pick<DTState, "rowsPerPage" | "currentPage"> {
	columns: Array<{visible: boolean, data: DTColumn<any>['data']}>;
	sort: DTState['sort'] & { data?: DTColumn<any>['data'] }
	search: string;
}

export interface DTPageChangeRequestObject {
	limit?: number,
	order?: [{column: number, dir: "asc" | "desc"}],
	skip?: number,
	search?: { value: string, regex: boolean, },
};

export interface DTColumn<T> {

	/**
	 * Anything that jsx supports
	 * it will be set as the th
	 */
	title: string;
	
	/**
	 * Path to the value to show
	 * it can have dots, example:\
	 * customer.fetched.name
	 */
	data: keyof T | (string & {});

	/**
	 * Additional classnames that will be applied to both the TH and TD
	 */
	className?: string

	/**
	 * If a column can be ordered
	 * @default true
	 */
	orderable?: boolean;

	/**
	 * Allows you to modify the rendered data in the column
	 * @param data is the the value of the field you have given
	 * @param model is the whole object of the row
	 */
	// TODO add observable :]
	render?: (data: any, model: T) => JSXSupportedType;

	/**
	 * If false then it doesnt search this column\
	 * If you pass an object, you can specify this columns settings only
	 * @default TRUE
	 */
	search?: boolean | {
		/**
		 * It matches any word split by space
		 * example  => "Last First" => {$regex: "Last|First", $options: "i"}
		 */
		split?: boolean,
		/**
		 * If to use regex or not
		 */
		regex?: boolean,
		/**
		 * searches the column as an int, not string
		 */
		toInt?: boolean,
		/**
		 * Manually return an object to use inside mongodb filter
		 */
		manual?: (searchValue: string) => any,
	}

	/**
	 * Can hide the column for example to add a search field but dont show anything in the DT :]
	 */
	visible?: boolean;

}

export interface DTButton<T> {

	/**
	 * special function for the types
	 */
	type?: {
		name: "menu",
		items: Pick<DTButton<T>, 'title' | 'onClick'>[];
	};

	/**
	 * Anything that jsx supports
	 * it will be set as the th
	 */
	title: JSXSupportedType;

	/**
	 * If the button is active or not
	 */
	enabled?: boolean | ((models: T[]) => boolean)

	className?: string

	onClick?: (e: React.MouseEvent<HTMLButtonElement>, selected: T[]) => void;

	/**
	 * Low-level override
	 */
	props?: ButtonProps;


	/**
	 * When a button is disabled, the button is not displayed
	 * @default undefined (false)
	 */
	hideDisabled?: boolean;

}

export interface DTState {
	error?: any;
	/**
	 * toggle to show/hide the loading icon
	 */
	hasLoaded: boolean;

	firstPaint: boolean,
	
	data: DTDataObject & { 
		/**
		 * An array parallel to the data array,
		 * these values will be used as JSX keys
		 * 
		 * we store them here so when we need to update a row
		 * or close that rows details we can simply update the key and it will regenerate :]
		 */
		rowJsxKey: (string)[];

	};

	/**
	 * a hashmap of rows state
	 */
	expandedRows: {[idx: string]: boolean};
	
	currentPage: number;

	rowsPerPage: number;
	
	possibleRowsPerPage: number[];

	/**
	 * An array parallel to that given in the opts.columns
	 * that contains the visibility of a column
	 */
	columnsVisibility: boolean[];

	sort: {column: number, dir: "asc" | 'desc'};

	/**
	 * array of rows data object
	 * so they are compared by reference :]
	 */
	selected: any[];

	searchFieldValue: string;
}

export interface DTProps<T> {

	/**
	 * If given the cache key it will automatically save the state and load it
	 */
	saveStateCacheKey?: string;

	/**
	 * allows the user to select the rows
	 */
	select?: "multi" | 'single' | {
		visualCell?: "checkbox" | "radio" | ((model: T) => JSX.Element),
		isSelected: (model: T) => boolean,
		onSelect: (e: React.MouseEvent<any>, model: T) => void,
	};

	/**
	 * removes the pagination, and shows all the items all the time
	 */
	disablePagination?: boolean;
	
	/**
	 * if true the it removes the column that contains the checkbox/radio to show which column is selected
	 * @default false
	 */
	removeSelectVisualColumn?: boolean;

	/**
	 * The list of columns to show and some specific logic for each column
	 */
	columns: Array<DTColumn<T>>;

	/**
	 * The starting table rows length
	 */
	initialRowsPerPage?: number;

	initialSort?: {column: number, dir: 'asc' | 'desc'};

	/**
	 * The possibile pagination lengths
	 */
	possibleRowsPerPage?: number[];

	/**
	 * adds a button to the row to "open" it and see whatever this function returns
	 */
	renderDetails?: (model: T) => JSXSupportedType | Observable<JSXSupportedType | (() => JSXSupportedType)>;

	/**
	 * The rows that will be shown on the table
	 */
	data: any[] | ((setts: DTDataRequestObject) => DTDataObject | Promise<DTDataObject> | Observable<DTDataObject>)

	/**
	 * If true then the `data` array will be sorted and filtered by the dt logic
	 */
	sortAndProcessData?: boolean,

	/**
	 * If true then generates some generic toolbar\
	 * If string then it's like true, but uses the string as title\
	 * else pass an object with all the configs
	 * 
	 * @default undefined
	 */
	toolbar?: string | boolean | DTToolbarProps<T>;

	
	removePaper?: boolean;

}

export interface DTToolbarProps<T> {
	/**
	 * Addition title for the toolbar
	 */
	title?: JSXSupportedType;

	/**
	 * List of buttons that will interact with the table
	 */
	buttons?: Array<DTButton<T>>;

	/**
	 * when a button is disabled then it is hidden instead of being grayed out
	 */
	hideDisabledButtons?: boolean;

	/**
	 * @default true\
	 * if the toolbar should have a search function
	 */
	search?: boolean;

	/**
	 * any extra item added to the right side of the toolbar
	 */
	additional?: JSX.Element | (() => JSX.Element);

	/**
	 * If any row is selected, then we render this instead\
	 * if true then it uses the same config for multi and single
	 */
	withSelectedRows?: true | DTToolbarWithSelectdRowsObject<T> | ((selectedRows: T[]) => Omit<DTToolbarProps<T>, 'withSelectedRows'>);
}

export interface DTDataRequestObject extends DTPageChangeRequestObject {
	/**
	 * a hashmap of keys that the objects returned should have and the values has to be contained in the given array
	 * 
	 * for example if i pass {byKey: {_id: ['1', '2', '3']}, a: 2}\
	 * function should return {_id: "1", a: 2} or {_id: "2", a: 2} etc..\
	 * BUT NOT {_id: "1"} or {_id: "10", a: 2}
	 */
	byKey?: {[k: string]: any[]};
}

export interface DTToolbarWithSelectdRowsObject<T> {
	single: Omit<DTToolbarProps<T>, 'withSelectedRows'>;
	multi: Omit<DTToolbarProps<T>, 'withSelectedRows'>;
}

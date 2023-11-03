import { AbstractEditor } from "../abstract-editor/abstract-editor";
import { IClientApiRequestOptions } from "../../services/dtd";
import { IQueryStringParams } from "../../services/controllers/dtd";

export interface IAsyncModelSelectProps<T> {
	/**
	 * The path where to contact the BE to request the items
	 */
	bePath: string;
	/**
	 * The configuration for the table that displays the available models
	 */
	infoConf: IAsycnModelSelectTableConf<T>;
	/**
	 * The function to trigger once a model has been chosen
	 */
	choseFn: (model?: T) => void;
	
	/**
	 * @default TRUE
	 * applies the projections based on the columns given
	 */
	projection?: boolean | object;
	/**
	 * A default filter to use on the table
	 */
	getFilters?: {[key: string]: any};
	/**
	 * Full manual control on request options
	 */
	requestOptions?: IClientApiRequestOptions<T> | ((params: IQueryStringParams<T>) => IClientApiRequestOptions<T>);
	/**
	 * The editor component relative to the models that will be displayed
	 * 
	 * If the editor is not given, then the modal will not have a "Create new" button
	 */
	editor?: typeof AbstractEditor;
	/**
	 * This fn is triggered when the user opens the given editor in dialog window mode
	 */
	onEditorOpen?: () => void;
	/**
	 * This fn is triggered when the user closes the editor dialog window
	 */
	onEditorClose?: () => void;
}



export interface IAsycnModelSelectTableConf<T> {
	/**
	 * The columns that will be displayed by the select list
	 */
	columns: Array<{
		/**
		 * The title of the column
		 */
		title: string,
		/**
		 * The path to the data in the model to display
		 */
		data: keyof T,
		/**
		 * Optional function to modify the displayed data,
		 * the string returned will be treated as HTML
		 */
		render?: (model: T) => string,
		/**
		 * Desides if the column will be added to the search query or not
		 * DEFAULT: TRUE
		 */
		searchable?: boolean;
		/**
		 * Custom search options for the column
		 */
		searchOptions?: {
			/**
			 * Decides if to use regex
			 * DEFAULT: TRUE
			 */
			regex?: boolean
			/**
			 * Decides if to cast to integer the search param
			 * DEFAULT: FALSE
			 */
			castToInt?: boolean,
		};
	}>;
}

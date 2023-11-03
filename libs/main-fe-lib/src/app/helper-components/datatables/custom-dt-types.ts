import { DTButton, DTColumn, DTProps } from "./dt-logic/datatable.dtd";
import { Omit } from "@material-ui/core";

export interface ICustomDtButtons<T> extends Omit<DTButton<T>, 'type'> {

	/**
	 * the function is deprecated
	 * use the object instead
	 */
	select?: {
		type: 'single',
		enabled?: (model: T) => boolean,
	} | {
		type: 'multi',
		enabled?: (model: T[]) => boolean,
	};

	/**
	 * special function for the types
	 */
	type?: DTButton<T>['type'] | {
		name: 'menuSingle',
		items: (Omit<DTButton<T>['type']['items'][0], 'onClick'> & { onClick?: (e: React.MouseEvent<any>, m: T) => void; })[]
	};

	attributes?: {
		required?: (number | string)[],
	};

}


export interface ICustomDtColumns<T> extends DTColumn<T> {
	// TODO add fields here to generate the fields filters here
	// 		instead of having a separate object ??

	attributes?: {
		required?: (number | string)[],
	};

}



export interface ICustomDtSettings<T> extends Partial<Omit<DTProps<T>, 'columns' | 'buttons'>> {

	search?: boolean;
	
	buttons: Array<ICustomDtButtons<T>>;

	columns: Array<ICustomDtColumns<T>>;

	hideDisabledButtons?: boolean;

}




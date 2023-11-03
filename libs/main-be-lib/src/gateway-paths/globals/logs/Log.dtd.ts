import { LibModelClass } from "../../../utils/enums";
import { FetchableField } from "../../../object-format-controller/fetchable-field";
import { IBaseModel } from "../../../object-format-controller/IBaseModel.dtd";

export enum LogType {
	MODIFICATION = 1,
}

export interface Log extends IBaseModel {

	/**
	 * The subject that caused the the Log
	 */
	author: FetchableField<LibModelClass.User>;

	/**
	 * The time of the creation
	 */
	timestamp: number;

	/**
	 * what is the log about
	 */
	action: { 
		
		mode: LogType.MODIFICATION

		/**
		 * What item has been modified/created
		 */
		target: FetchableField<any>;

		/**
		 * We save only the old values change and the field
		 * as we can rebuild the history of the object this way
		 * because the db contains the most up to date version
		 * so we keep only the change values
		 * 
		 * @warning
		 * oldItem = { a: [{c: 1}, {b: 1, d: 1}] }
		 * newItem = { a: [{c: 1}] }
		 * produces
		 * [{field: "a.1.b": oldValue: 1}], [{field: "a.1.d": oldValue: 1}]
		 * and NOT
		 * [{field: "a.1": oldValue: {b: 1, d: 1}}]
		 * 
		 * this is to have the ability to search for a specific field changed, so you can query
		 * /^a...b/ and know when the b field changed :]
		 */
		changes: Array<{ field: string, oldValue: any }>,
	},

}



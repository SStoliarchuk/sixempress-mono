import { ObjectUtils } from "@sixempress/main-be-lib";

export class ModelUtils {


	/**
	 * compares the newRows and oldRows and returns the rows to add and those to delete
	 * the rows that are overriden are deleted and then reinserted, cause it's easy
	 */
	public static separateOldRowsAndNewRows<T extends object>(newRows: T[], oldRows: T[]): {toDelete: T[], toAdd: T[]} {
		
		const toDelete: T[] = [];
		const toAdd: T[] = [];

		// add toDelete all the extra oldRows
		if (newRows.length < oldRows.length) {
			toDelete.push(...oldRows.slice(newRows.length, oldRows.length));
		}

		// now we check for we rows
		for (let i = 0; i < newRows.length; i++) {
			if (oldRows[i]) {
				// if the rows are equal ensure that the private fields are reassigned
				if (ObjectUtils.areVarsEqual(newRows[i], oldRows[i], {ignorePrivateFields: true})) {
					this.reassignOldPrivateFieldsToObject(newRows[i], oldRows[i]);
				}
				else {
					toDelete.push(oldRows[i]);
					toAdd.push(newRows[i]);
				}
			}
			else {
				toAdd.push(newRows[i]);
			}
		}

		return {toDelete, toAdd};
	}


	/**
	 * // TODO move this to PUT
	 */
	private static reassignOldPrivateFieldsToObject(newObj: object, oldObject: object) {
		for (const k in oldObject) {
			
			// update the newobject with the private field if its not a fetchable id
			if (k.indexOf('_') === 0) {
				newObj[k] = oldObject[k];
				continue;
			}

			// recursevli set
			if (typeof oldObject[k] === 'object') {
				this.reassignOldPrivateFieldsToObject(newObj[k], oldObject[k]);
			}

		}
	}

	
}

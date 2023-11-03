import { AuthService } from "../../services/authentication/authentication";

// tslint:disable: curly

type Item = {
	attributes?: (number | string)[] | {required?: (number | string)[]},
	attribute?: (number | string)[] | {required?: (number | string)[]},
} & {[key: string]: any};

/**
 * A collection of specific functions
 */
export class Helpers {

	/**
	 * Checks if the item has the authorization to be seen by the current user
	 */
	public static isAuthorizedForItem(item: Item): boolean {
		const k = item.attribute || item.attributes
		if (!k)
			return true;

		const atts: (number | string)[] = Array.isArray(k) ? k : k.required || [];
		if (!atts.length)
			return true;

		for (const att of atts)
			if (AuthService.isAttributePresent(att))
				return true;

		return false;
	}

	/**
	 * Checks if the buttons|Columns given have the attributes property, and if they do, then it will
	 * remove them based on the rules given
	 * 
	 * @WARNING removes falsy values, so be careful
	 * 
	 * @param array Array of columns or buttons to check
	 */
	public static checkAttributes(array: Item[]) {
		
		for (let i = 0; i < array.length; i++) {
			if (!array[i] || !this.isAuthorizedForItem(array[i])) {
				array.splice(i, 1);
				i--;
			}
		}

	}

	/**
	 * Removes null | undefined values from array
	 */
	public static clearNullishValues<T>(arr: T[]): T[] {
		const toR = [];
		for (const i of arr) {
			if (i === null || i === undefined) {
				continue;
			}
			toR.push(i);
		}
		return toR;
	}

}

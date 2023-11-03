import { ICustomDtSettings } from "../custom-dt-types";
import { IQueryStringParams } from "../../../services/controllers/dtd";
import { Helpers } from "../../../utils/various/helpers";
import { DTButton, DTColumn, DTDataRequestObject } from "../dt-logic/datatable.dtd";

/**
 * This is helper class
 * 
 * This class is used by the abstract-basic-dt to process buttons and columns
 * AND
 * to generate the query object to send to the BE
 */
export class AbstractDtHelper {

	/**
	 * Adds some additional boilerplate code to the buttons and filters them
	 * @param buttons Buttons of the DataTable to generate
	 * @returns the corrected and filtered buttons  AND  an array of buttons with custom select logic
	 */
	public static processDtButtons<T>(opts: ICustomDtSettings<T>) {
		const buttons = opts.buttons;

		// const singleSelectBtns: ICustomDtButtons<T>[] = [];
		// const multiSelectBtns: ICustomDtButtons<T>[] = [];

		// cicles the buttons and sets custom properties
		for (let i = 0; i < buttons.length; i++) {
			const button = buttons[i];
			
			// check attributes
			if (!button || !Helpers.isAuthorizedForItem(button)) {
				buttons.splice(i, 1);
				i--;
				continue;
			}

			if (button.type) {
				switch (button.type.name) {
					case 'menuSingle':
						(button.type as any as DTButton<T>['type']) = {
							name: 'menu',
							items: (button.type.items || []).map(b => {
								const fn = b.onClick;
								return {...b, onClick: (e, m) => fn(e, m[0])};
							}),
						};
				}
			}

			// we dont move to toolbar.withSelectedRows.(multi | single)
			// because if we do there won't be any animation, and the buttons would be hidden by default instaed of disabled
			//
			// so here we create custom enabled logic that corresponds to the select mode given
			if (button.select && button.enabled !== false) {
				const oldEnabled = button.enabled;
				
				if (button.select.type === 'single') {
					const selEnabled = button.select.enabled;
					button.enabled = (m) => {
						if (m.length !== 1) { return false; }
						if (typeof oldEnabled === 'function' && !oldEnabled(m)) { return false; }
						if (selEnabled) { return selEnabled(m[0]); }
						return true;
					};
				}
				else if (button.select.type === 'multi') {
					const selEnabled = button.select.enabled;
					button.enabled = (m) => {
						if (m.length === 0) { return false; }
						if (typeof oldEnabled === 'function' && !oldEnabled(m)) { return false; }
						if (selEnabled) { return selEnabled(m); }
						return true;
					};
				}
			}

		}

		// return {
		// 	singleSelectBtns,
		// 	multiSelectBtns,
		// };
	}

	/**
	 * Adds some additional boilerplate code to the columns and filters them
	 * @param columns Columns of the DataTable to generate
	 * @returns the "fixed" columns  AND  a hashmap with columns that has custom search logic
	 */
	public static processDtColumns<T>(opts: ICustomDtSettings<T>): void {

		// hm of cols title to warn the user if cols have duplicate titles
		const columns = opts.columns;

		for (let i = 0; i < columns.length; i++) {
			const column = columns[i];

			// check attributes
			if (!column || !Helpers.isAuthorizedForItem(column)) {
				columns.splice(i, 1);
				i--;
				continue;
			}

			// remove orderable if the column is a fetched data
			if ((column.data as string).includes('.fetched')) {
				if (typeof column.orderable === 'undefined') {
					column.orderable = false;
				}
			}

		}

	}


	/**
	 * Transforms datatables parameters into an object that can be interpreted by the clientApi and then send
	 * the proper request to the BE
	 * @param dtParams datatables parameters like length, page, filters etc.. (usually received from ajax)
	 */
	public static processDtParameters(
		dtParams: DTDataRequestObject,
		columns: Pick<DTColumn<any>, 'search' | 'data'>[],
	): IQueryStringParams<any> {

		// what is this
		// sometimes dtParams is empty (wat)
		if (Object.keys(dtParams).length === 0) { return {} as any; }

		// Creates base filters
		const clientApiArgs: IQueryStringParams<any> = {};

		if (dtParams.limit) {
			clientApiArgs.limit = dtParams.limit;
		}
		if (dtParams.order) {
			const sortDir = dtParams.order[0].dir === 'asc' ? 1 : -1;
			clientApiArgs.sort = {[columns[dtParams.order[0].column].data]: sortDir as -1 | 1};
		}
		if (dtParams.skip) {
			clientApiArgs.skip = dtParams.skip;
		}

		// columns to search for mongodb
		const mongoDbOr = [];

		// don't create the mongo filter, cause no search :D
		if (dtParams.search && dtParams.search.value !== '') {
			for (const column of columns) {
	
				// add to the filter if the column is searchable only
				if (column.search === false) 
					continue;
	
				// start with basic search condition
				let regexSearch = dtParams.search.regex ? true : false;
				// value as string in input
				let value: string | number | undefined = dtParams.search.value || '';
	
				if (typeof column.search === 'object') {

					// if there is a manual search then we add the raw result to the OR match
					if (column.search.manual) {
						const manRes = column.search.manual(value);
						
						if (Array.isArray(manRes))
							mongoDbOr.push(...manRes)
						else 
							mongoDbOr.push(manRes)

						continue;
					}
					// else we check one of the available modes


					// start with turned off regex just to be safe
					regexSearch = false;

					// check if you have to cast to integer
					if (column.search.toInt) {
						value = parseInt(value, 10);
						if (isNaN(value)) 
							value = undefined;
					}
					else if (column.search.split) {
						regexSearch = true;

						const split = value.split(' ');
						// fix entries
						for (let i = 0; i < split.length; i++) {
							if (!split[i]) {
								split.splice(i--, 1);
								continue;
							}
							split[i] = split[i].trim();
						}
						
						value = split.join('|');
					}
					// check for regex as the last value
					// as the other fields don't require regex
					else {
						// default regex to true
						regexSearch = column.search.regex === false ? false : true;
					}
	
				}
	
				// avoid undefined values as there are no undefined in db
				// if you want to search {$exists: false}, you can use the manual fn
				if (typeof value !== 'undefined') {
					// and if the field is not an _id
					if (regexSearch && (column.data as string) !== "_id") {
						// try catch to see if the regexp is valid
						try {
							new RegExp(value as string)
							mongoDbOr.push({[column.data]: {$regex: value, $options: 'i'}});
						}
						// push as non regex just to add a filter even if invalid, so the table will be empty
						catch (e) {
							mongoDbOr.push({[column.data]: value});
						}
					}
					else {
						mongoDbOr.push({[column.data]: value});
					}
				}
	
			}
		}

		if (dtParams.byKey) {
			for (const k in dtParams.byKey) {
				mongoDbOr.push({[k]: {$in: dtParams.byKey[k]}});
			}
		}

		// adding search object for mongoDb
		if (mongoDbOr.length !== 0) {
			clientApiArgs.filter = [{$or: mongoDbOr}];
		}

		return clientApiArgs;
	}


	/**
	 * splits a filter into an array inside of $or
	 * INPUT: {	a: 1, b: 2 }
	 * OUTPUT: {$or: [{a: 1}, {b: 2}]}
	 */
	public static mongoDbFilterToOr(filter: object) {
		return {
			$or: Object.keys(filter).reduce((carry, currentKey) => {
				carry.push({[currentKey]: filter[currentKey]});
				return carry;
			}, [])
		};
	}
	
}


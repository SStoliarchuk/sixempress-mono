import { IBaseModel, } from "@sixempress/main-fe-lib";

export interface DBUpdateEmitterDt<T extends IBaseModel> {

	/**
	 * instead of comparing the row._id with the socket._id
	 * with this function you can return a customr row index
	 * 
	 * 
	 * for example in the products table, we have the row._id === productGroup._trackableGroupId
	 * so here we manually return the row index based on the productGroup models id
	 * 
	 * this function is used to compare the socket._id and the fetched items._id
	 * 
	 * so in the products example, the first time we should compare to the model._id and the second time to the model._productGroupId
	 * 
	 */
	findRowIndexBySocketUpdate?: (rowsData: T[], updatedId: string) => number;

	/**
	 * The custom key to use to query items instaed of using _id
	 */
	getFilterForSocketUpdate?: (rowsData: T[], idsToFetch: string[]) => {[key: string]: string[]};

}

import { IBaseModel, FetchableField } from '@sixempress/main-fe-lib';

export interface InventoryCategory extends IBaseModel {

	group?: string;
	
	name: string;
	extends?: FetchableField<InventoryCategory>;
	/**
	 * All the ids of the categories that this category extends up to the the "ROOT",
	 * AKA the category that doesn't extend any category
	 */
	_parentsTree?: string[];

	
}

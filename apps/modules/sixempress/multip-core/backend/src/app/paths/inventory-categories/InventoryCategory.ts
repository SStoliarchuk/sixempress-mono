import { IBaseModel, FetchableField, DeleteOptions } from '@sixempress/main-be-lib';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { SyncableModel } from '@sixempress/main-be-lib';

export interface InventoryCategoryControllerDeleteOptions extends DeleteOptions {
	/**
	 * If this is true, instead of removing the category and it's children,
	 * it's simply removes the category and moves the childs up
	 */
	spliceDelete?: true
}


export interface InventoryCategory extends SyncableModel {

	group?: string;

	name: string;
	extends?: FetchableField<ModelClass.InventoryCategory>;
	/**
	 * All the ids of the categories that this category extends up to the the "ROOT",
	 * AKA the category that doesn't extend any category
	 * 
	 * the array is in reverse order
	 * meaning _parentsTree[0] is the first parent and so on
	 */
	_parentsTree?: string[];

}

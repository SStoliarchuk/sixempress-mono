import { DBSaveOptions, DBSaveOptionsMethods, DeleteResult, DeleteOptions, IVerifiableItemDtd, FetchableField, AbstractDbApiItemController, ObjectUtils, Error404, DBSaveReturnValue, RequestHelperService, RestoreDeletedOptions } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { InventoryCategory, InventoryCategoryControllerDeleteOptions } from './InventoryCategory';
import to from 'await-to-js';
import { ObjectId } from 'mongodb';
import { Request, Response } from 'express';
import { Error403, } from '@sixempress/main-be-lib';
import { ProductController } from '../products/Product.controller';
import { AnyBulkWriteOperation, Filter } from 'mongodb';

export class InventoryCategoryController extends AbstractDbApiItemController<InventoryCategory> {

	modelClass = ModelClass.InventoryCategory;
	collName = ModelClass.InventoryCategory;
	bePath = BePaths.inventorycategories;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;
	
	Attributes = {
		view: Attribute.viewInventoryCategories,
		add: Attribute.addInventoryCategories,
		modify: Attribute.modifyInventoryCategories,
		delete: Attribute.deleteInventoryCategories,
	};
	
	dtd: IVerifiableItemDtd<InventoryCategory> = {
		group: { type: [Number, String], required: false, },
		name: { type: [String], required: true, },
		extends: FetchableField.getFieldSettings(ModelClass.InventoryCategory, false),
	};

	/**
	 * create parents tree and other stuff
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, InventoryCategory>, 
		toSave: A extends "insert" ? InventoryCategory[] : InventoryCategory, 
		oldObjInfo:  A extends "insert" ? undefined : InventoryCategory
	): Promise<DBSaveReturnValue<InventoryCategory>> {

		let revertGroupOnError: boolean;
		if (opts.method === 'update') {
			const item = toSave as InventoryCategory;
			
			// update all the childs group on change
			if (oldObjInfo.group !== item.group) {
				revertGroupOnError = true;
				await this.getCollToUse(req).updateMany(
					{_parentsTree: item._id.toString()}, 
					item.group ? {$set: {group: item.group}} : {$unset: {group: ""}}
				);
			}
		}


		const items: InventoryCategory[] = (Array.isArray(toSave) ? toSave  : [toSave]) as InventoryCategory[];
		const allExtendsIds = items.map(i => i.extends && i.extends.id);
		const extendsTarget = await this.findForUser(req, {_id: {$in: allExtendsIds.map(i => i && new ObjectId(i))}});

		const xtHm: {[id: string]: InventoryCategory} = ObjectUtils.arrayToHashmap(extendsTarget, '_id');
		for (const body of items) {
			if (body.extends) {
				const parentCat = xtHm[body.extends.id];
				
				if (!parentCat) { throw new Error404("body.extends.id not found in database"); }
				if (body.group !== parentCat.group) { throw new Error404("category.group should be equal to the category.group of the parent"); }
				
				// assign the tree
				body._parentsTree = parentCat._parentsTree && !parentCat._parentsTree.includes(body.extends.id) 
					? [body.extends.id, ...parentCat._parentsTree] 
					: [body.extends.id];
			}
			else {
				delete body._parentsTree;
			}
		}

		// execute
		const [e, d] = await to(super.executeDbSave(req, opts, toSave, oldObjInfo));
		if (e) {
			// reset back the group of the childs
			if (revertGroupOnError) {
				await this.getCollToUse(req).updateMany(
					{_parentsTree: oldObjInfo._id.toString()}, 
					oldObjInfo.group ? {$set: {group: oldObjInfo.group}} : {$unset: {group: ""}}
				);
			}

			throw e; 
		}


		return d;
	}

	public async restoreDeletedForUser(req: Request, filters: Filter<InventoryCategory>, options: RestoreDeletedOptions = {}): Promise<DeleteResult> {
		const items = await this.findItemsToDelete(req, filters, options);
		
		const e = await this.getCollToUse(req).updateMany(
			{_id: {$in: items.map(i => i._id)}},
			// remove extends as we don't know if it's deleted or not
			{$unset: {_deleted: 1, extends: 1}},
		);

		return {deletedCount: e.modifiedCount};
	}
	
	/**
	 * @WARNING
	 * use specific filters as this function ALWAYS uses {deleteMulti: true}\
	 * it automatically removes the category field from the items that uses the categories to be deleted
	 */
	public async deleteForUser(req: Request, filters: Filter<InventoryCategory>, options: InventoryCategoryControllerDeleteOptions = {}): Promise<DeleteResult> {
		const items = await this.findItemsToDelete(req, filters, options);
		
		// replacement id
		let replaceWithId: string;
		if (req.qs.replaceWith) {
			try { replaceWithId = new ObjectId(replaceWithId).toString(); }
			catch (e) { throw new Error403("Invalid ObjectId: query.replaceWithId"); } 
		}

		const allIds = items.map(i => i._id.toString());
		const allIdsObject = items.map(i => new ObjectId(i._id.toString()));
		
		// update the relative items that use the category
		await new ProductController().updateProductsCategory(req, allIds, replaceWithId);
		
		//
		// delete the targets and their childrens
		//
		if (!options.spliceDelete)
			return super.deleteForUser(req, {$or: [filters, {_parentsTree: {$in: allIds}}]}, {...options, deleteMulti: true});

		//
		// delete the targets and moves the children up a place
		//
		const bulkOps: AnyBulkWriteOperation<InventoryCategory>[] = [
			// remove ids from child trees
			{updateMany: {
				filter: {_parentsTree: {$in: allIds}}, 
				update: {$pullAll: {_parentsTree: allIds}}
			}},
			// delete the target objects
			{updateMany: {
				filter: {_id: {$in: allIdsObject}},
				update: {$set: {_deleted: RequestHelperService.getCreatedDeletedObject(req)}}
			}},
			// replace the first childs with the item parent or no parent
			...items.map(i => ({
				// we use updateMany as there could be multiple childs
				updateMany: {
					filter: {'extends.id': i._id.toString()},
					update: i.extends ? {$set: {'extends.id': i.extends.id}} : {$unset: {extends: ''}},
				}
			} as AnyBulkWriteOperation<InventoryCategory>)),
		];

		return this.getCollToUse(req).bulkWrite(bulkOps);
	}


}

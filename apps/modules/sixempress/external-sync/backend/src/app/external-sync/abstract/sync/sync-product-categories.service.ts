import { InventoryCategoryController, InventoryCategory, InventoryCategoryControllerDeleteOptions, ModelClass, ProductType } from '@sixempress/be-multi-purpose';
import { Request } from 'express';
import { ExternalConnection } from "../../external-conn-paths/sync-config.dtd";
import { WooBaseItem } from "@sixempress/contracts-agnostic";
import { DataSyncService } from "./data-sync.service";
import { ItemsBuildOpts } from '../woo.dtd';
import { AnyBulkWriteOperation, ObjectId } from 'mongodb';
import { SyncableModel } from '../../syncable-model';
import { WooPostBatchRespose } from '../../wordpress/woo.dtd';

// the additional data used to build categories from remote
type AddRemoteData = {categoriesHm: {[id: string]: InventoryCategory}};
type AddLocalData = {catsLocalRemoteIdHm: {[id: string]: {[extId: string]: number | string}}};
type BuiltWooCats<A extends WooBaseItem> = {remote: A[], ref: InventoryCategory[], deleteRemote: number[], ec: ExternalConnection};

export abstract class SyncProductCategories<A extends WooBaseItem> extends DataSyncService<A, InventoryCategory> {
	
	protected abstract getParentId(item: A): string | number | void;
	
	protected abstract sendPayload(req: Request, ec: ExternalConnection, items: A[], deleteIds: (number | string)[]): Promise<WooPostBatchRespose>;

	/**
	 * translates the remote object to a local one
	 * @param ep external connnection of the sync request
	 * @param ref the remote reference object
	 * @param loc the optional local object if present
	 */
	protected abstract translateItemToLocal(req: Request, ep: ExternalConnection, ref: A[], loc: Map<A, InventoryCategory>): Promise<Map<A, InventoryCategory>>;

	/**
	 * returns the additional data for the items to sync
	 * @param req request object for queries
	 * @param localProds the items that has to be synced online
	 */
	protected async getLocalAddData(req: Request, localProds: InventoryCategory[]): Promise<AddLocalData> {
		const allCatsIds: ObjectId[] = [];
		for (const ob of localProds)
			if (ob.extends)
				allCatsIds.push(new ObjectId(ob.extends.id));

		const cats = await new InventoryCategoryController().findForUser(
			req, 
			{_id: {$in: allCatsIds}},
			{skipFilterControl: true},
		);

		const catsIdHm: AddLocalData['catsLocalRemoteIdHm'] = {};

		for (const c of cats) {

			if (!c._metaData?._externalIds?.length)
				continue;

			const id = c._id.toString();
			catsIdHm[id] = {};

			for (const e of c._metaData._externalIds)
				catsIdHm[id][e._externalConnectionId] = e._id;
		}

		return { catsLocalRemoteIdHm: catsIdHm };
	}


	/**
	 * translates the items and saves them to db
	 * @param ep external connection where the sync request come from
	 * @param req the req object used5 for db ops
	 * @param ids the ids that have been crud changed
	 * @param referenceItems the items fetched for the relative ids
	 */
	public async receiveFromRemote(ep: ExternalConnection, req: Request, ids: (string | number)[], referenceItems: Map<number | string, A>, opts?: ItemsBuildOpts) {
		const order = this.buildCategorySyncOrder(ids, referenceItems);
		for (const o of order)
			await this.internalProcessCategoriesNoRefCategories(ep, req, o.ids, o.ref);
	}

	/**
	 * analyzes the referenceItems map and creates an ordered array to sync the items in order as to built the correct references
	 * because the refItems object can contain id 1, id 2, id 3
	 * and id 1 can have parent id 2
	 * 
	 * thus we need to order to account for this case
	 */
	private buildCategorySyncOrder(ids: (string | number)[], referenceItems: Map<string | number, A>): Array<{ids: (string | number)[], ref: Map<string | number, A>}> {
		
		// return immediately if the items are only to delete
		if (!referenceItems.size && ids.length)
			return [{ids, ref: referenceItems}];

		// shallow clone as they will be altered
		ids = [...ids];
		referenceItems = new Map(Array.from(referenceItems.entries()));

		// the items built
		const nonReferenced: Array<{ids: (string | number)[], ref: Map<string | number, A>}> = [];

		// build the objects untile the ref map is empty
		while (referenceItems.size) {
			const nonRef = new Map<string | number, A>();
			
			// we create an array that contains the current keys
			// as the keys in the ref item will be deleted in the loop
			const allids = Array.from(referenceItems.keys());

			for (const [id, val] of referenceItems.entries()) {
				const parent = this.getParentId(val);
				// if no father, or the father is not present in current object, then we add it
				if (!parent || !allids.includes(parent)) {
					nonRef.set(id, val);
					referenceItems.delete(id);
					ids.splice(ids.indexOf(id), 1);
				}
			}
			
			// add current ids only as to not add false positive and trigger a deletion
			nonReferenced.push({ids: Array.from(nonRef.keys()), ref: nonRef});
		}

		// add the remaining ids in case some ids were deleted and thus not present in referenceItems
		if (ids.length)
			nonReferenced[nonReferenced.length - 1].ids.push(...ids);

		return nonReferenced;
	}

	/**
	 * As the referenceItems can contains a category that has parent another object in the reference items, what we do is we have this internal Function
	 * that syncs the items that don't reference the "local" items
	 */
	private async internalProcessCategoriesNoRefCategories(ep: ExternalConnection, req: Request, ids: (string | number)[], referenceItems: Map<number| string, A>) {
		const c = new InventoryCategoryController();
		
		const acts = await this.automaticRemoteToLocalCompare(req, c, ep, ids, referenceItems, this.translateItemToLocal);

		// we use splice deleted as the wordpress gods request :>
		await this.executeCrudActions(req, c, acts, {deleteOptions: {spliceDelete: true} as InventoryCategoryControllerDeleteOptions});
	}


	/**
	 * Creates the additional data for the products that will be synced
	 * @param req request object for queries
	 * @param ep the external connection where we are sync data
	 * @param referenceItems the ref items that will be updated
	 */
	protected async getRemoteAddData(req: Request, ep: ExternalConnection, items: A[]): Promise<AddRemoteData> {
		const allCatsIds: (number | string)[] = [];
		for (const val of items)
			if (this.getParentId(val))
				allCatsIds.push(this.getParentId(val) as string | number);

		const cats = await new InventoryCategoryController().findForUser(
			req, 
			this.createQueryForMetadata(ep, {'_id': {$in: allCatsIds}}),
			{skipFilterControl: true},
		);

		const catsHmIds: {[id: string]: InventoryCategory} = {};
		for (const c of cats) {
			const id = this.getRemoteId(c, ep);
			if (id) catsHmIds[id] = c;
		}

		return { categoriesHm: catsHmIds, };
	}

	/**
	 * sends the built categories to the remote client and returns the bulk ops to update local metadata
	 * @param bData the built categories data to use
	 */
	protected async sendAndGenerateOps(req: Request, slug: string, bData: BuiltWooCats<A>): Promise<AnyBulkWriteOperation<InventoryCategory>[]> {

		const res = await this.sendPayload(req, bData.ec, bData.remote, bData.deleteRemote);

		const ops: AnyBulkWriteOperation<InventoryCategory>[] = [];
		
		// when a category is deleted
		// but then we POST a change to that category
		// woocommerce MUST create a new category
		for (const i of bData.ref) {
			
			const op = this.createLocalMetaDataBulkOps(bData.ec, i, i._deleted ? undefined : {
				_id: res.items[i._id.toString()], _externalConnectionId: bData.ec._id,
			});
			
			if (op)
				ops.push(...op);
		}

		return ops;
	}

}

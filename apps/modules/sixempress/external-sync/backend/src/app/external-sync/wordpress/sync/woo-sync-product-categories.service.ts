import { FetchableField, ObjectUtils } from '@sixempress/main-be-lib';
import { InventoryCategory, ModelClass, ProductType, ExternalConnectionType } from '@sixempress/be-multi-purpose';
import { Request } from 'express';
import { ExternalConnection } from "../../external-conn-paths/sync-config.dtd";
import { WooProductCategory } from "@sixempress/contracts-agnostic";
import { WooPostBatchRespose, WooProductCategorySimple } from '../woo.dtd';
import { AnyBulkWriteOperation } from 'mongodb';
import { WPRemotePaths } from '../woo.enum';
import { ExternalSyncUtils } from '../../external-sync.utils';
import { SyncProductCategories } from '../../abstract/sync/sync-product-categories.service';
import { AddedIdInfo } from '../../abstract/woo.dtd';
import to from 'await-to-js';

type BuiltWooCats = {remote: WooProductCategorySimple[], ref: InventoryCategory[], deleteRemote: number[], ec: ExternalConnection};

class _WooSyncProductCategories extends SyncProductCategories<WooProductCategory> {
	
	protected type: ExternalConnectionType = ExternalConnectionType.wordpress;

	protected sendPayload(req: Request, ec: ExternalConnection, items: WooProductCategory[], deleteIds: (string | number)[]): Promise<WooPostBatchRespose> {
		return ExternalSyncUtils.requestToWoo<WooPostBatchRespose>(req, ec, 'POST', WPRemotePaths.product_categories, {items, delete: deleteIds});
	}

	protected getParentId(item: WooProductCategory): string | number | void {
		return item.parent;
	}

	/**
	 * translates the remote object to a local one
	 * @param ep external connnection of the sync request
	 * @param items the remote reference object
	 * @param loc the optional local object if present
	 */
	protected async translateItemToLocal(req: Request, ep: ExternalConnection, items: WooProductCategory[], local: Map<WooProductCategory, InventoryCategory>): Promise<Map<WooProductCategory, InventoryCategory>> {
		const add = await this.getRemoteAddData(req, ep, items);

		const r = new Map<WooProductCategory, InventoryCategory>();
		for (const ref of items) {
			const l: InventoryCategory = local.has(ref) 
				? ObjectUtils.cloneDeep(local.get(ref)) 
				: {name: '', documentLocationsFilter: [ep.locationId]};
			
			l.name = ref.name;
			l.group = ModelClass.Product + ProductType.product;
	
			if (!ref.parent)
				delete l.extends;
			else 
				l.extends = new FetchableField(add.categoriesHm[ref.parent]._id, ModelClass.InventoryCategory);
	
			r.set(ref, l);;
		}

		return r;
	}


	/**
	 * Builds the remote item for each connection and returns the built data to be sent
	 * @param slug slug of the client
	 * @param data The data to update
	 */
	public async translateAndSendToRemote(req: Request, endpoints: ExternalConnection[], slug: string, data: AddedIdInfo, localItems: InventoryCategory[], opts?): Promise<Array<{errors: any[], ops: AnyBulkWriteOperation<InventoryCategory>[]}>> {

		const add = await this.getLocalAddData(req, localItems);
		
		const tor: BuiltWooCats[] = [];
		for (const ep of endpoints) {
			const toSend: WooProductCategorySimple[] = [];
			const toDelete: number[] = [];
			for (const s of localItems) {

				// ensure that this product should be synced online
				if (s.externalSync?.disabled?.some(e => e.id === ep._id)) 
					continue;

				// ensure url is active
				const omittedUrls = data.get(s._id.toString())?.omitOriginUrls;
				if (omittedUrls && omittedUrls.find(o => ep.originUrl.includes(o)))
					continue;

				const extId = this.getRemoteId(s, ep);

				// model deleted so we delete it
				if (s._deleted) {
					if (extId)
						toDelete.push(extId as number)
				}
				// else create/update
				else {
					const d: WooProductCategorySimple = {
						__id: s._id.toString(),
						name: s.name,
					};
					
					if (extId)
						d.id = extId as number;

					if (s.extends) {
						// add extendsId if the parent will be synced
						// this acts as a fallback in case the remote category id has problems
						//
						// TODO on error sync the whole tree ? idk ?
						const extendsId = s.extends.id.toString();
						if (data.get(extendsId))
							d.__extends = extendsId

						// if the item was already synced then add the id directly
						if (add.catsLocalRemoteIdHm[extendsId] && add.catsLocalRemoteIdHm[extendsId][ep._id])
							d.parent = add.catsLocalRemoteIdHm[extendsId][ep._id] as number; 
					}

					toSend.push(d);
				}
			}

			if (toSend.length || toDelete.length)
				tor.push({ec: ep, deleteRemote: toDelete, ref: localItems, remote: this.sortOrdersByTree(toSend)});
		}

		
		const res: Array<{errors: any[], ops: AnyBulkWriteOperation<InventoryCategory>[]}> = [];
		for (const bData of tor) {
			const [e, d] = await to(this.sendAndGenerateOps(req, slug, bData));
			res.push(e ? {errors: [e], ops: []} : {errors: [], ops: d});
		}

		return res;
	}

	/**
	 * As we could send an array of categories that contains [A, B] where A extends B\
	 * this means that we need to sort the array in order of dependences
	 * so [B, A], thus WooCommerce will save B first, then A
	 */
	private sortOrdersByTree(items: WooProductCategorySimple[]): WooProductCategorySimple[] {

		const remove = [...items];
		const ordered: WooProductCategorySimple[] = [];
		const orderedIds: string[] = [];

		// ensure no infinite loop
		let safeswitch = remove.length;

		while (remove.length) {
			// build array
			for (let i = 0; i < remove.length; i++) {
				const item = remove[i];
				if (!item.__extends || orderedIds.includes(item.__extends)) {
					ordered.push(item);
					orderedIds.push(item.__id)
					remove.splice(i, 1);
				}
			}

			// ensure we can exit the array
			if (safeswitch === remove.length)
				throw new Error('Could not order InventoryCategory tree to send to remote as some __extends are not found');
			safeswitch = remove.length;
		}

		return ordered;
	}

}

export const WooSyncProductCategories = new _WooSyncProductCategories();
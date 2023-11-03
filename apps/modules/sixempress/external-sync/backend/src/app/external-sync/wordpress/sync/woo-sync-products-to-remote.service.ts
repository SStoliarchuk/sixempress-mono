import { DataFormatterService } from "@sixempress/main-be-lib";
import { Product, ProductGroup, ProductGroupWithAmount, ProductWithAmounts } from '@sixempress/be-multi-purpose';
import { WooFetchedAggregatedInfo, WooProductSimple, WooSavedProductResponse } from "../woo.dtd";
import { WooProduct } from "@sixempress/contracts-agnostic";
import { WPRemotePaths, WooTypes } from "../woo.enum";
import { getMetaDataPrefix } from "../../syncable-model";
import { ExternalConnection, ExternalConnectionType } from "../../external-conn-paths/sync-config.dtd";
import { ExternalSyncUtils } from "../../external-sync.utils";
import { WooSyncProductMovementsService } from "./woo-sync-product-movements.service";
import { AddLocalData, ImagesOnlyUpdateCache, SyncProductsService } from "../../abstract/sync/sync-products.service";
import { ItemsBuildOpts } from "../../abstract/woo.dtd";
import { Request } from "express";
import { SyncProductCategories } from "../../abstract/sync/sync-product-categories.service";
import { WooSyncProductCategories } from "./woo-sync-product-categories.service";


export abstract class WooSyncProductsServiceToRemote extends SyncProductsService<WooProductSimple> {

	protected type: ExternalConnectionType = ExternalConnectionType.wordpress;

	protected productCatSync: SyncProductCategories<any> = WooSyncProductCategories;

	protected sendImageInformation(req: Request, ec: ExternalConnection, items: { id: number; images: { name?: string; src?: string; }[]; }[]): Promise<void> {
		return ExternalSyncUtils.requestToWoo(req, ec, 'PUT', WPRemotePaths.create_easy_products, {items: items});
	}

	protected async getAllRemoteIds(req: Request, ec: ExternalConnection): Promise<(string | number)[]> {
		const res = await ExternalSyncUtils.requestToWoo<{[WooType: string]: number[]}>(req, ec, 'GET', WPRemotePaths.aggregate_sync_ids, undefined, {
			params: {projection: {[WooTypes.product]: 1}}
		});

		return res[WooTypes.product] || [];
	}

	protected async fetchRemoteDataForAssociations(req: Request, ec: ExternalConnection, ids: (string | number)[]): Promise<Map<number, {name: string, id: number, sku: string}>> {
		const allRemote = await ExternalSyncUtils.requestToWoo<WooFetchedAggregatedInfo>(
			req, ec, 'POST', WPRemotePaths.aggregate_sync_ids, {[WooTypes.product]: ids}, 
			// ensure import fields are always present
			{params: {projection: {product: {id: 1, name: 1, sku: 1}}}}
		);

		const ret = new Map<number, {name: string, id: number, sku: string}>();
		for (const id in allRemote[WooTypes.product] || {})
			ret.set(allRemote[WooTypes.product][id].id || parseInt(id), allRemote[WooTypes.product][id] as Required<WooProductSimple>);
		
		return ret;
	}

	protected async sendPayload(req: Request, ec: ExternalConnection, slug: string, items: WooProductSimple[]): Promise<{ [localGid: string]: { [localPid: string]: { pid: number; gid: number; }; }; }> {
		
		const metadataPrefix = getMetaDataPrefix(slug);
		
		const res = await ExternalSyncUtils.requestToWoo<WooSavedProductResponse>(req, ec, 'POST', WPRemotePaths.create_easy_products, {items});
	
		// now that we have successfuly updated the items we need to remap the external ids unto the local products
		// this is to keep track of created products or if a product variable has a new id etc..etc..
		
		// create a hashmap of local _id to the relative group ids
		const localIdRemoteIdHm: {[localGid: string]: {[localPid: string]: {pid: number, gid: number}}} = {};
		for (const k in res.items) {
			const p = res.items[k];
			
			const groupid = p.meta_data.find(m => m.key === metadataPrefix + 'product_group_id').value;
			localIdRemoteIdHm[groupid] = {};
			
			// no variation so it's a simple prod
			if (!p.variations) {
				const md = p.meta_data.find(m => m.key === metadataPrefix + 'product_id');
				localIdRemoteIdHm[groupid][md.value] = {pid: parseInt(k), gid: parseInt(k)};
			}
			// map the variations
			else {
				for (const vk in p.variations) {
					const v = p.variations[vk];
					const md = v.meta_data.find(m => m.key === metadataPrefix + 'product_id');
					localIdRemoteIdHm[groupid][md.value] = {pid: parseInt(vk), gid: parseInt(k)};
				}
			}
		}

		return localIdRemoteIdHm;
	}

	public async receiveFromRemote(ep: ExternalConnection, req: Request, ids: (string | number)[], referenceItems: Map<number | string, WooProductSimple>, opts: ItemsBuildOpts = {}) {
		
		//
		// remap product_variation ids to product_group ids
		//
		for (const [id, val] of referenceItems.entries()) {
			if (val.parent) {
				const parent = val.parent;
				
				// replace variation id with father
				ids.splice(ids.indexOf(id), 1)
				ids.push(parent.id);

				// replace referenceItems ids
				referenceItems.delete(id);
				referenceItems.set(parent.id, parent);
			}
		}

		return super.receiveFromRemote(ep, req, ids, referenceItems, opts);
	}


	protected translatePgToRemote(ep: ExternalConnection, slug: string, add: AddLocalData, s: ProductGroupWithAmount, groupId: string | number, filteredModels: ProductWithAmounts[], opts: ItemsBuildOpts): {item: WooProductSimple, images: ImagesOnlyUpdateCache} {
		const r = this.translateSinglePgToRemote(ep, slug, add, s, groupId, filteredModels, opts);
		
		// store images to send as we will do this separetly
		const sendImages: ImagesOnlyUpdateCache = {};
		const metadataPrefix = getMetaDataPrefix(slug);

		// group images
		const gid = s._trackableGroupId;
		sendImages[gid] = { images: r.images || [], variations: {} };
		delete r.images;

		// specific variation
		if (r.variations) {
			for (const v of r.variations) {
				if (!v.images || !v.images.length) continue;
				
				const id = v.meta_data?.find(m => m.key === metadataPrefix + 'product_id')?.value;
				if (!id) continue;
				
				sendImages[gid].variations[id] = {images: v.images};
				delete v.images;
			}
		}

		return {item: r, images: sendImages};
	}

	protected translateSinglePgToRemote(ep: ExternalConnection, slug: string, add: AddLocalData, s: ProductGroupWithAmount, groupId: string | number, filteredModels: ProductWithAmounts[], opts: ItemsBuildOpts): WooProductSimple {

		const status: WooProductSimple['status'] = filteredModels[0]._groupDeleted ? 'trash' : 'publish';
		const type: WooProductSimple['type'] = filteredModels.find(m => m.variationData.variants.length) ? 'variable' : 'simple';

		// simple
		if (type === 'simple') {

			// take the product with most amounts
			const mostAMountInfo = filteredModels.reduce((car, cur, idx) => 
				cur._totalAmount > car.am
					? ({idx, am: cur._totalAmount})
					: car
			, {idx: 0, am: 0});
			const m = filteredModels[mostAMountInfo.idx];


			const toAdd: WooProductSimple = {
				name: m.groupData.name,
				type,
				status,
				manage_stock: true,
				regular_price: DataFormatterService.centsToScreenPrice(m.infoData.refSellPrice || m.variationData.sellPrice),
				meta_data: this.generateRemoteMetaData(slug, m._trackableGroupId, m._id.toString()),
			};
			this.addExtIdInfo(ep, toAdd, m, groupId);
			this.assignLocalToRemoteCommon(ep, add, s, m, toAdd, 'simple', opts);

			return toAdd;
		}
		// variable
		else {
			const allAttributesNames: WooProductSimple['attributes'] = [];
			const variations: WooProductSimple['variations'] = [];

			for (const m of filteredModels) {
				// create ttributes
				for (const v of m.variationData.variants) {
					// create voice in the array
					let relative: WooProductSimple['attributes'][0] = allAttributesNames.find(n => n.name === v.name);
					if (!relative) {
						relative = {name: v.name, options: []};
						allAttributesNames.push(relative);
					}
					// add option
					if (!relative.options.includes(v.value)) {
						relative.options.push(v.value);
					}
				}
				
				// add single variations
				const toAdd: WooProduct = {
					regular_price: DataFormatterService.centsToScreenPrice(m.infoData.refSellPrice || m.variationData.sellPrice),
					manage_stock: true,
					attributes: m.variationData.variants.map(v => ({name: v.name, option: v.value})),
					meta_data: this.generateRemoteMetaData(slug, m._trackableGroupId, m._id.toString()),
				};
				this.addExtIdInfo(ep, toAdd, m);
				this.assignLocalToRemoteCommon(ep, add, s, m, toAdd as WooProductSimple, 'variant', opts);

				variations.push(toAdd);
			}

			// add to array
			const toAdd: WooProductSimple = ({
				name: s.groupData.name,
				type,
				status,
				// remove manage_stock in case it was set
				manage_stock: false,
				attributes: allAttributesNames,
				variations: variations,
				meta_data: this.generateRemoteMetaData(slug, s._trackableGroupId, s.models.map(m => m._id.toString())),
			});
			this.addExtIdInfo(ep, toAdd, s.models[0], groupId);
			this.assignLocalToRemoteCommon(ep, add, s, null, toAdd, 'group', opts);

			return toAdd;
		}

	}

	/**
	 * Creates metadata to add to the remote items to track them and delete them if necessary
	 * @param slug used to generate the prefix
	 * @param groupId the local trackable group id
	 * @param prodId_s can be a single id for a variation or simple prod, or an array for the variations parent metadata 
	 */
	protected generateRemoteMetaData(slug: string, groupId: string, prodId_s: string | string[]): WooProductSimple['meta_data'] {
		// we add a namespace to the meta keys as to know which are ours
		// because we will need to do some operations with them
		const prefix = getMetaDataPrefix(slug);

		return Array.isArray(prodId_s)
			? [{
				key: prefix + 'product_group_id', 
				value: groupId,
			}]
			: [{
				key: prefix + 'product_group_id', 
				value: groupId,
			}, {
				key: prefix + 'product_id',
				value: prodId_s,
			}];
	}

	/**
	 * Searches for the corresponding remote id in the local product as to no create a new product, but update an existing one
	 * @param ep the info about the external conneciton
	 * @param remote the remote item to add the id to
	 * @param local the local product model that contains the metadata
	 * @param forceId to manually set the id of the remote item
	 */
	private addExtIdInfo(ep: ExternalConnection, remote: WooProduct | WooProductSimple, local: Product, forceId?: string | number) {

		// use the forcedId
		if (forceId) {
			remote.id = forceId as number;
		}
		// try to get the id from the model
		else {
			const id = this.getRemoteId(local, ep);
			if (id)
				remote.id = parseInt(id as string);
		}

	}

	/**
	 * Assigns common values between different product types in the WooProductSimple object
	 * so this function is present not to have duplicated logic
	 */
	private assignLocalToRemoteCommon(ep: ExternalConnection, add: AddLocalData, pg: ProductGroupWithAmount, local: Product, remote: WooProductSimple, mode: 'group' | 'variant' | 'simple', opts: ItemsBuildOpts) {

		// groupData objects
		if (mode === 'simple' || mode === 'group') {
		
			// replace local as product as we're in the group mode
			if (!local)
				local = pg as Product;

			if ((local as ProductGroup).groupData.description)
				// replace </br> as that \n is not usable in wp
				remote.short_description = (local as ProductGroup).groupData.description.replace('\n', '<br/>');

			// tags
			if ((local as ProductGroup).groupData.tags)
				remote.create_tags = (local as ProductGroup).groupData.tags;
	
			// category
			if ((local as ProductGroup).groupData.category) {
				// check to ensure that the category referenced exists in remote to be safe
				// it should exists 99% of the cases but a user could reference in a product a deleted category :/
				remote.category_ids = [
					add.categoriesHm[pg.groupData.category.id] && add.categoriesHm[pg.groupData.category.id][ep._id] as number,
					...(pg.groupData.additionalCategories || []).map(c => add.categoriesHm[c.id] && add.categoriesHm[c.id][ep._id] as number),
				];
				// remove falsy values
				remote.category_ids = remote.category_ids.filter(i => i);
			}

			if (local.groupData.uniqueTags && local.groupData.uniqueTags[0])
				remote.sku = local.groupData.uniqueTags[0];

		}

		// model specific items
		if (mode === 'simple' || mode === 'variant') {
			
			// reference stock in case the remote item was deleted and now restored
			const stock = WooSyncProductMovementsService.getStockByVariation(ep, pg, local);
			remote.current_stock = {
				stock_quantity: stock,
				stock_status: stock > 0 ? 'instock' : 'outofstock'
			};

			// if the item is new then we set the stock
			if (!remote.id || opts.forceProductStock) {
				remote.stock_quantity = remote.current_stock.stock_quantity;
				remote.stock_status = remote.current_stock.stock_status;
			}

			if (local.infoData.sku && local.infoData.sku[0])
				remote.sku = local.infoData.sku[0];

			// images
			if (local.infoData.images?.length)
				remote.images = local.infoData.images.map(i => ({name: i.name, src: i.url}));

			// discount
			remote.sale_price = DataFormatterService.centsToScreenPrice(local.variationData.sellPrice);

		}
		
		if (mode === 'group') {

			// // add stock status to the group
			// if ((remote.variations || []).some(v => (v as WooProductSimple).current_stock?.stock_status === 'instock'))
			// 	remote.current_stock = { stock_status: 'instock' };
			
			// add all images togheter for the slideshow :]
			// the first one will automatically be assigned as the main one
			if ((local as ProductGroup).models) {
				const allPgImages: WooProductSimple['images'] = [];
	
				for (const m of (local as ProductGroup).models)
					if (m.infoData.images?.length)
						for (const i of m.infoData.images)
							allPgImages.push({name: i.name, src: i.url});
					
				remote.images = allPgImages;
			}
		}


	}
	
}

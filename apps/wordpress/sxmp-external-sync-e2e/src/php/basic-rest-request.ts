import { parse } from "@wordpress/blocks";
import { AxiosRequestConfig, Method } from "axios";

type saveReturn = {
	[k: string]: {
		meta_data: Array<{key: string, option: string}>,
		variations?: {
			[k: string]: {
				meta_data: Array<{key: string, option: string}>,
			}
		}
	}
}

export const getBasicRest = (wooUrl: string, myUrl: string) => {
	return {
		...basicRest,
		wooGetIds: (ids: number[], opts?: AxiosRequestConfig) => basicRest.wooRequest('GET', wooUrl + '?include=' + ids.join(','), {}, opts),
		wooBatch: (body: any) => basicRest.wooBatch(wooUrl, body), 
		myPostRaw: (body: any, opts?: AxiosRequestConfig) => basicRest.myPostRaw(myUrl, body, opts),
		mySaveItems: (items: any[]) => basicRest.mySaveItems(myUrl, items),
		wooGet: (opts?: AxiosRequestConfig) => basicRest.wooRequest('GET', wooUrl, opts),
	}	
}

export const basicRest = {
	wooRequest: async (m: Method, wooUrl: string, body?: any, opts?: AxiosRequestConfig) => {
		const data = (await tt.apiRequest(m as any, 'wc/v3/' + wooUrl, body, opts)).data;
		return data;
	},
	wooBatch: async (url: string, body: any) => {
		const data = (await tt.apiRequest('POST', 'wc/v3/' + url + '/batch', body)).data;
		return data;
	},
	myPostRaw: async (myUrl: string, body: any, opts?: AxiosRequestConfig) => {
		const res = await tt.apiRequest('POST', 'sxmpes/woo/' + myUrl, body, opts);
		const data = res.data;
		return data;
	},
	mySaveItems: async (myUrl: string, items: any[]) => {
		const res = await basicRest.myPostRaw(myUrl, {items});
		return res.items;
	},
}

export const productsRest = {

	...basicRest,

	wooBatch: (body: any) => basicRest.wooBatch('products', body),

	META_DATA_FIELDS_PREFIX:  '_semp_slug_',

	wooProduct: async (url: string, body: any, opts: AxiosRequestConfig & {method?: string} = {}) => {
		const data = (await tt.apiRequest(opts.method || 'POST' as any, 'wc/v3/products/' + url, body, opts)).data;
		return data;
	}, 

	wooGet: async (ids: number[]): Promise<Array<{variations: Array<any>} & object>> => {
		const data = (await tt.apiRequest('GET', 'wc/v3/products?include=' + ids.join(','))).data;
		// add variations object back
		for (const p of data) {
			if (p.variations && p.variations.length)
				p.variations = (await productsRest.wooProduct(p.id + '/variations', undefined, {method: 'GET'}));
			else
				delete p.variations;
		}

		return data;
	},

	mySaveRaw: async (body: {items?: any[], delete?: number[]}, opts?: AxiosRequestConfig): Promise<{items: saveReturn, delete: number[]}> => {
		
		const items = body.items || [];
		const patchMetaData = (item: any | any[], reverse?: boolean) => {
			const arr: any[] = Array.isArray(item) ? item : [item];
			for (const i of arr) {
				if (i.meta_data) {
					for (const m of i.meta_data) {
						m.key = reverse 
							? m.key.replace(productsRest.META_DATA_FIELDS_PREFIX, '')
							: productsRest.META_DATA_FIELDS_PREFIX + m.key;
					}
				}
			}
		}
		// prefix meta data
		for (const i of items) {
			patchMetaData(i);
			if (i.variations) 
				patchMetaData(i.variations)
		}
		
		const res = await basicRest.myPostRaw('products', {items: items, delete: body.delete}, opts);
		const data: {items: saveReturn, delete: number[]} = res;
		
		// remove prefix
		for (const id in data.items) {
			patchMetaData(data.items[id], true);
			if (data.items[id].variations) 
				patchMetaData(Object.values(data.items[id].variations), true);
		}
		
		return data;
	},

	dropProducts: async () => {
		const data = (await tt.apiRequest('GET', 'sxmpes/aggregate_sync_ids')).data;
		await productsRest.wooBatch({delete: data.product});
	},

	mySave: async (items: any[], opts?: AxiosRequestConfig): Promise<number[]> => {
		const data = await productsRest.mySaveRaw({items: items}, opts);
		return Object.keys(data.items).map(k => parseInt(k));
	},

	myGet: async (req: number[] | object) => {
		let prodMode = Array.isArray(req);
		req = prodMode ? {product: (req as any[]).map(i => parseInt(i))} : req;
		const data = (await tt.apiRequest('POST', 'sxmpes/aggregate_sync_ids', req)).data;
		return prodMode ? data.product : data;
	},

};
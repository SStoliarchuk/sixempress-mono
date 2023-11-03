import { Request } from 'express';
import { Product, ProductType } from '../paths/products/Product';
import { ProductMovement, ProductMovementType } from '../paths/products/product-movements/ProductMovement';
import { ProductMovementController } from '../paths/products/product-movements/ProductMovement.controller';
import { ProductController } from '../paths/products/Product.controller';
import { AdditionalFindOptions, ProductGroup } from '../paths/products/ProductGroup';
import { ProductGroupController } from '../paths/products/ProductGroup.controller';
import { ExternalConnection, ExternalConnectionType } from '../services/multip-config/multip-config.dtd';
import { Filter, ObjectId } from 'mongodb';
import { FetchableField, FindDbOptions, MongoUtils, RequestHelperService } from '@sixempress/main-be-lib';
import { ModelClass } from '../utils/enums/model-class.enum';
export { connectToMongo, TestTools } from '@sixempress/main-be-lib-tests';
	
export type PartialGroup = DeepPartial<ProductGroup> & {
	gd?: Partial<ProductGroup['groupData']>, 
	ms?: Array<DeepPartial<Product> & {
		extId?: (number | {id: number, p?: number, ext?: string})[],
		v?: Partial<Product['variationData']>, 
		vv?: (string | {name: string, value: string})[],
		bar?: ProductGroup['infoData']['barcode'],
	}>
}

let counter = 0;
const getUniqueNumber = () => ++counter;

const partialToFull = (req: Request, extConfig: Pick<ExternalConnection, '_id'>, pgs: PartialGroup[]) => {
	for (const pg of pgs) {
		pg.groupData = pg.groupData || pg.gd as any;
		pg.models = pg.models || pg.ms as any;
		delete pg.gd;
		delete pg.ms;
		
		pg.groupData = { name: "name", type: ProductType.product, ...(pg.groupData || {}) };
		pg.models = pg.models || [{} as any];
		pg.documentLocationsFilter = pg.documentLocationsFilter || ["1"];
		
		const allExtConnId: string[] = [];
		
		pg.models = pg.models || [{}] as any;
		for (const p of pg.models) {
			const partial = p as any as PartialGroup['ms'][0];
			
			if (p._deleted && typeof p._deleted !== 'undefined')
				p._deleted = RequestHelperService.getCreatedDeletedObject(req);

			if (p._id)
				p._id = new ObjectId(p._id.toString());

			p.infoData = p.infoData || {};

			p.variationData = partial.v as any|| p.variationData;
			if (partial.bar) { 
				p.infoData.barcode = partial.bar; 
			}

			if (partial.extId) {
				partial._metaData = partial._metaData || {};
				partial._metaData._externalIds = partial._metaData._externalIds || [];
				for (const i of partial.extId) {
					const id  = typeof i === 'number' ? i : i.id;
					const ext = typeof i === 'number' ? extConfig._id : i.ext || extConfig._id;
					const gr  = typeof i === 'number' ? i : i.p || id;
					
					if (!partial._metaData._externalIds.some(ex => ex._externalConnectionId === ext))
						partial._metaData._externalIds.push({_id: id, _externalConnectionId: ext, _additional: {_wooProductGroupId: gr}});
				}

				for (const i of partial._metaData._externalIds) {
					allExtConnId.push(i._externalConnectionId);
				}
			}
			

			const vv = partial.vv;
			delete partial.extId;
			delete partial.v;
			delete partial.bar;
			delete partial.vv;

			p.variationData = { 
				buyPrice: getUniqueNumber(),
				sellPrice: getUniqueNumber(),
				variants: vv ? vv.map((v, idx) => typeof v === 'string' ? ({name: idx.toString(), value: v}) : v) : [],
				...(p.variationData || {})
			};
		}


	}
	return pgs as ProductGroup[];
};


export const MultipTestTools = {
	extConn: {
		_id: 'extconn_id', 
		originUrl: 'https://url', 
		type: ExternalConnectionType.wordpress,
		auth: {type: 'apikey', apiKey: 'apikey'},
		name: 'extconn_id_name',
		useFor: {crudFromLocal: true, crudFromRemote: true, defaultClientSite: true, rawFiles: true},
		locationId: '1',
	} as ExternalConnection,
	prodPartialToFull: partialToFull,
	getProdController: (conf: {req?: Request | (() => Request), extConn?: Partial<ExternalConnection>} = {}) => {
		const req = conf.req 
			? typeof conf.req === 'function' ? conf.req() : conf.req 
			: tt.generateRequestObject();

		const conn = conf.extConn || tt.extConn;

		const controller = tt.getBaseControllerUtils<ProductGroup, PartialGroup, ProductGroupController>({ 
			controller: new ProductGroupController(), 
			partialToFull: (i) => partialToFull(req, conn, i),
			reqObj: () => req
		});

		const setAmount = async (prodId: string | ObjectId | Product, am: number | {[locId: string]: number}) => {
			const id = typeof prodId === 'string' || MongoUtils.isObjectId(prodId) 
				? prodId.toString()
				: (prodId as Product)._id.toString();

			const prod: Product = await new ProductController().getCollToUse(req).findOne({_id: new ObjectId(id)});
			await new ProductMovementController().calculateAmountInProdsForUser(req, [prod]);
	
			const hm: {[locId: string]: number} = typeof am === 'number' ? {['1']: am} : am;
			const movs: ProductMovement[] = [];
			for (const locId in hm) {
				movs.push({
					amount: -((prod._amountData[locId] || 0) - hm[locId]),
					movementType: ProductMovementType.manualChange,
					targetProductInfo: {productsGroupId: prod._trackableGroupId, product: new FetchableField(prod._id, ModelClass.Product)},
					documentLocationsFilter: ['*'],
					documentLocation: locId,
				});
			}
	
			await new ProductMovementController().saveToDb(req, movs, {allowAllLocations: true});
		};

		return {
			...controller,
			find: (f?: Filter<ProductGroup>, opts?: FindDbOptions & AdditionalFindOptions): Promise<ProductGroup[]> => controller.find(f, opts),
			setAmount,
			save: (async (items: ProductGroup[], ...args: any[]) => controller.save(partialToFull(req, conn, items), ...(args as []))) as (typeof controller)['save']
		};
	}
}

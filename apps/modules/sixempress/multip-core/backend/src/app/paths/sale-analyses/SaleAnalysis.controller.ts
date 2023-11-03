import { RequestHandler, Express } from 'express';
import { Request } from 'express';
import { AbstractDbApiItemController, AuthHelperService, FetchableField, IVerifiableItemDtd, ModelFetchService, MongoDBFetch, RequestHandlerService, RequestHelperService } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { SaleAnalysis, SaleAnalysisGraph, SaleAnalysisStatus, SaleAnalysisStatusMapping } from './SaleAnalysis.dtd';
import { AnyBulkWriteOperation, ObjectId } from 'mongodb';

export class SaleAnalysisController extends AbstractDbApiItemController<SaleAnalysis> {

	modelClass = ModelClass.SaleAnalysis;
	collName = ModelClass.SaleAnalysis;
	bePath = BePaths.SaleAnalysis;

	Attributes = {
		view: Attribute.viewSaleAnalysis,
		add: false,
		modify: false,
		delete: false,
	}

	dtd: IVerifiableItemDtd<SaleAnalysis> = {};

	protected getFieldsToFetch(): MongoDBFetch[] {
		return [
			{field: 'list.*.products.*.item'}, 
			{field: 'list.*.services.*.item'}
		];
	}

	/**
	 * Populates the fetchable fields in the model
	 */
	public async setFetchedFields(req: Request, models: SaleAnalysis[]) {
		await ModelFetchService.fetchAndSetFields(req, this.getFieldsToFetch(), models);
	}

	public generateBePaths(app: Express, rhs: RequestHandlerService<SaleAnalysis>) {
		if (this.Attributes.view) {
			app.get(
				'/' + this.bePath + 'graph', 
				AuthHelperService.requireAttributes(this.Attributes.view), 
				RequestHelperService.safeHandler((req) => this.generateGraphInfo(req, req.qsParsed.filter))
			);
		}
		super.generateBePaths(app, rhs);
	}


	/**
	 * Idempotently adds an analysis to the db
	 */
	async addAnalysis(req: Request, modelClass: string, modelStatuses: SaleAnalysisStatusMapping, models: SaleAnalysis[]): Promise<void> {
		
		const bulkWrites: AnyBulkWriteOperation<SaleAnalysis>[] = [];
		for (const m of models) {
			if (!m._id)
				throw new Error('SaleAnalysis requires the relative model to have been saved prior to creating the analysis counterpart');

			// ensure we change the status to the one that is understandable by the saleAnalysis
			// default to the pending status if no other is found
			let mappedStatus = SaleAnalysisStatus.pending;
			for (const mode in modelStatuses)
				if ((modelStatuses[mode] as SaleAnalysisStatusMapping['draft']).includes(m.status) && SaleAnalysisStatus[mode])
					mappedStatus = SaleAnalysisStatus[mode];

			// update the object
			const filter = {_generatedFrom: new FetchableField(m._id, modelClass)}
			const copy: SaleAnalysis = {...m, ...filter, status: mappedStatus};
			delete copy._id;

			// Idempotent push
			bulkWrites.push({
				replaceOne: {
					filter: filter,
					replacement: copy,
					upsert: true,
				}
			});
		}

		await this.getCollToUse(req).bulkWrite(bulkWrites);
	}

	async removeAnalysis(req: Request, modelClass: string, models: SaleAnalysis[]) {
		await this.getCollToUse(req).deleteMany({
			'_generatedFrom.modelClass': modelClass,
			'_generatedFrom.id': {$in: models.map(m => m._id.toString())},
		});
	}

	deleteForUser(): Promise<any> {
		throw new Error('Operation not Allowed');
	}
	restoreDeletedForUser(): Promise<any> {
		throw new Error('Operation not Allowed');
	}
	executeDbSave(): Promise<any> {
		throw new Error('Operation not Allowed');
	}

	async generateGraphInfo(req: Request, filter: object): Promise<SaleAnalysisGraph> {

		const r = await this.aggregateForUser(req, [
			{$match: 
				filter
			},
			//
			// process products
			//
			// {$unwind: {
			// 	path: '$list',
    	// 	preserveNullAndEmptyArrays: true,
			// }},
			// {$unwind: {
			// 	path: '$list.products',
    	// 	preserveNullAndEmptyArrays: true,
			// }},
			// {$lookup: {
			// 	from: 'products',
			// 	as: 'list.products.item.fetched',
			// 	let: {searchId: {$toObjectId: "$list.products.item.id"}}, 
			// 	pipeline:[
			// 		{$match: {$expr: {$eq: ['$_id', '$$searchId']}}},
			// 		{$project: {_id: 0, 'variationData.sellPrice': 1, 'variationData.buyPrice': 1}}
			// 	],
			// }},
			// {$unwind: {
			// 	path: '$list.products.item.fetched',
    	// 	preserveNullAndEmptyArrays: true,
			// }},
			// {$group: {
			// 	_id: '$_id',
			// 	_priceMeta: {$first: '$_priceMeta'},
			// 	totalPrice: {$first: '$totalPrice'},
				
				
			// 	products: { $sum: { $multiply: ['$list.products.amount', '$list.products.item.fetched.variationData.sellPrice'] } },
			// 	productsOut: { $sum: { $multiply: ['$list.products.amount', '$list.products.item.fetched.variationData.buyPrice'] } },

			// 	__list_manual: {$first: '$list.manual'},
			// }},
			//
			// process manual rows (we keep them separate as $unwind creates duplicates)
			//
			// {$unwind: {
			// 	path: '$__list_manual',
    	// 	preserveNullAndEmptyArrays: true,
			// }},
			// {$group: {
			// 	_id: '$_id',
			// 	_priceMeta: {$first: '$_priceMeta'},
			// 	totalPrice: {$first: '$totalPrice'},
			// 	products: { $first: '$products' },
			// 	productsOut: { $first: '$productsOut' },
				
			// 	manual: { $sum: '$__list_manual.sellPrice' },
			// 	manualOut: { $sum: '$__list_manual.buyPrice' },
			// }},
			{$group: {
				_id: '',
				priceIncrease: { $sum: { $cond: [ {$gt: ['$_priceMeta.priceChange', 0] }, '$_priceMeta.priceChange', 0 ] } },
				priceReductions: { $sum: { $cond: [ {$lte: ['$_priceMeta.priceChange', 0] }, '$_priceMeta.priceChange', 0 ] } },
				
				netPositive: { $sum: { $cond: [ {$gt: ['$_priceMeta.net', 0] }, '$_priceMeta.net', 0 ] } },
				netNegative: { $sum: { $cond: [ {$lte: ['$_priceMeta.net', 0] }, '$_priceMeta.net', 0 ] } },
		
				sum: {$sum: '$totalPrice'},

				// manual: {$sum: '$manual'},
				// manualOut: {$sum: '$manualOut'},
		
				// products: {$sum: '$products'},
				// productsOut: {$sum: '$productsOut'},
			}}
		]);

		let result: Partial<SaleAnalysisGraph> = r[0] || {} as any;
		return {
			sum: result.sum || 0,
			netPositive: result.netPositive || 0,
			netNegative: result.netNegative || 0,
			// products: result.products || 0,
			// productsOut: result.productsOut || 0,
			// manual: result.manual || 0,
			// manualOut: result.manualOut || 0,
			priceIncrease: result.priceIncrease || 0,
			priceReductions: result.priceReductions || 0,
		};
	}

}
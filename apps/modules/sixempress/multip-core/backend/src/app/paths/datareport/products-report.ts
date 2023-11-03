import moment from 'moment';
import { ProductMovementController } from '../products/product-movements/ProductMovement.controller';
import { Request } from 'express';
import { ProductMovement, ProductMovementType } from '../products/product-movements/ProductMovement';
import { ProductController } from '../products/Product.controller';
import { ProductDataReport, TopSoldReport, TopSoldReportDetails } from './DataReport_dtd';
import { ObjectUtils } from '@sixempress/main-be-lib';
import { Product, ProductType } from '../products/Product';
import { ProductGroupController } from '../products/ProductGroup.controller';
import { SupplierController } from '../suppliers/Supplier.controller';
import { Filter, ObjectId } from 'mongodb';
import { ProductGroupNoAmounts } from '../products/ProductGroup';

export async function getProductsDataReport(req: Request): Promise<ProductDataReport> {

	const tots: ProductDataReport = await getProductsTotalAmounts(req);

	const negAmount: number = await new ProductGroupController().countForUser(
		req, 
		{ _approximateTotalAmount: {$lt: 0}},
	);
	if (negAmount !== 0)
		tots.negativeAmountProducts = true;

	const atZero: number = await new ProductController().countForUser(
		req, 
		{'variationData.sellPrice': {$lte: 0}, _deleted: {$exists: false}},
	);
	if (atZero)
		tots.sellingAtZero = true;

	return tots;
}


export async function getProductsTotalAmounts(req: Request): Promise<Omit<ProductDataReport, 'negativeAmountProducts'>> {

	const pipeline: any[] = [
		{$match: {
			_groupDeleted: {$exists: false}, 
		}},
		{$addFields: {
			__buy: {$multiply: ["$_approximateTotalAmount", "$variationData.buyPrice"]},
			__sell: {$multiply: ["$_approximateTotalAmount", "$variationData.sellPrice"]},
		}},
		{$group: {
			_id: '', 
			__totalSellPrice: {$sum: '$__sell'},
			__totalBuyPrice: {$sum: '$__buy'},
			__totalAmount: {$sum: "$_approximateTotalAmount"},
		}},
	];

	if (req.qs.globalDocumentLocationContent) {
		pipeline.splice(1, 0, {
			$project: {
				_approximateTotalAmount: '$_approximateAmountData.' + req.qs.globalDocumentLocationContent,
				'variationData.buyPrice': '$variationData.buyPrice',
				'variationData.sellPrice': '$variationData.sellPrice',
			}
		});
	}

	const prodAmount: {__totalAmount: number, __totalSellPrice: number, __totalBuyPrice: number}[] = 
		await new ProductController().aggregateForUser(req, pipeline, {skipDeletedControl: true, skipLocContent: true});

	const toR: Omit<ProductDataReport, 'negativeAmountProducts'> = {
		allProductAmount: prodAmount && prodAmount[0] ? prodAmount[0].__totalAmount : 0,
		pricestotal: prodAmount && prodAmount[0] ? {buy: prodAmount[0].__totalBuyPrice, sell: prodAmount[0].__totalSellPrice} : {buy: 0, sell: 0},
		earnings: { month: 0, today: 0, },
	};

	return toR;
}

/**
 * Returns the array of the top selling products of the system
 */
export async function getTopSoldProducts(req: Request, fromTime?: number, toTime?: number, limit?: number, detailedProducts?: true): Promise<TopSoldReport | TopSoldReportDetails> {

	if (!fromTime)
		fromTime = parseInt(req.qs.topSoldFrom) || moment().subtract(1, 'y').startOf('d').unix();
	if (!toTime)
		toTime = parseInt(req.qs.topSoldTo) || moment().endOf('d').unix();
	
	// create a default limit
	if (!limit && req.qs.limit)
		limit = parseInt(req.qs.limit)
	
	if (limit === Infinity)
		limit = -1
	else if (isNaN(limit))
		limit = 10;


	const filter: Filter<ProductMovement> = {
		"date": {$gte: fromTime, $lte: toTime}, 
		"movementType": ProductMovementType.sellProducts,
	};

	if (req.qsParsed.globalDocumentLocationContent)
		filter['physicalLocation'] = req.qsParsed.globalDocumentLocationContent;
	
	// get the most sold products in time frame
	let mostSoldIds: {_id: string, amount: number}[] = await new ProductMovementController().aggregateForUser(req, [
		{$match: filter},
		{$group: {_id: "$targetProductInfo.productsGroupId", amount: {$sum: "$amount"}}},
		{$sort: {amount: 1}},
		// TODO fix this
		{$limit: limit > 0 ? limit : 1_000_000},
	]);

	if (detailedProducts) {
		// get product groups by the product ids
		const mostSoldProds: ProductGroupNoAmounts[] = await new ProductGroupController().findForUser(
			req, 
			{_id: {$in: mostSoldIds.map(p => p._id)}}, 
			{keepAllVariations: true, returnFullGroupOnMatch: true, skipLocContent: true, skipAmountsCalculation: false}
		);
		const prodhm: {[id: string]: Product & {amount?: any}} = {};
		const suppId = {};
		for (const pg of mostSoldProds) {
			for (const p of pg.models) {
				prodhm[p._id as string] = p;
				if (p.variationData.supplier)
					suppId[p.variationData.supplier.id] = 1;
			}
		}

		const supps = await new SupplierController().findForUser(
			req, 
			{_id: {$in: Object.keys(suppId).map(i => new ObjectId(i)) as any[]}}, 
			{skipLocContent: true, skipFilterControl: true, base: {projection: {name: 1, _progCode: 1}}}
		);
		const suppHm = ObjectUtils.arrayToHashmap(supps, '_id');

		// refetch the data but now grouping by the product id and not groupId
		mostSoldIds = await new ProductMovementController().aggregateForUser(req, [
			{$match: {"date": {$gte: fromTime, $lte: toTime}, "targetProductInfo.productsGroupId": {$in: mostSoldIds.map(p => p._id)}, movementType: ProductMovementType.sellProducts}},
			{$group: {_id: "$targetProductInfo.product.id", amount: {$sum: "$amount"}}},
		]);

		// check if statement in case the user does not see some products due 
		for (const p of mostSoldIds)
			if (prodhm[p._id as string])
				prodhm[p._id as string].amount = -p.amount;
	
		for (const pg of mostSoldProds) {
			pg.models = pg.models.filter(m => (m as any).amount);
			(pg as any).amount = pg.models.reduce((car, cur) => car += (cur as any).amount, 0);
		}

		return {items: mostSoldProds as TopSoldReportDetails['items'], suppHm: suppHm};

	}
	else {

		// get even the deleted items as it's a "fetch" kind of thing
		// TODO remove internalTags from here after migration
		const mostSoldProds: {name: string, internalTags: string[], uniqueTags: string[]}[] = await new ProductController().getCollToUse(req).aggregate<{name: string, internalTags: string[], uniqueTags: string[]}>([
			{$match: { _trackableGroupId: {$in: mostSoldIds.map(p => p._id)}}},
			{$group: {_id: "$_trackableGroupId", name: {$first: "$groupData.name"}, internalTags: {$first: '$groupData.internalTags'}, uniqueTags: {$first: '$groupData.uniqueTags'}}}
		]).toArray();
	
		const prodhm = ObjectUtils.arrayToHashmap(mostSoldProds, '_id');
	
		
		const items: TopSoldReport['items'] = [];
		for (const p of mostSoldIds) {
			const allTags = [...(prodhm[p._id].uniqueTags || []), ...(prodhm[p._id].internalTags || [])]
			items.push({amount: -p.amount, name: (allTags.length ? '[' + allTags.join(', ') + '] ' : '') + prodhm[p._id].name});
		}
	
		return {items};
	}


}

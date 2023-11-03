import e, { Request } from 'express';
import { ProductGroupController, ProductGroup, Product, ProductType, ProductController } from "@sixempress/be-multi-purpose"
import { DBGetOptions, DBGetOptionsMethods, DBGetReturnValue } from "@sixempress/main-be-lib";
import { Filter } from "mongodb";


export class ProductTypeController extends ProductController {

	/**
	 * @inheritDoc
	 * 
	 * Also Adds groupData.type = 'ProductType.product' filter
	 */
	protected async executeDbGet<A extends DBGetOptionsMethods>(
		req: Request, 
		filterOrPipeline: A extends 'aggregate' ? object[] : Filter<Product>,
		opts: DBGetOptions<A>
	): Promise<DBGetReturnValue<A, Product>> {
		fixFilter(filterOrPipeline);
		return super.executeDbGet(req, filterOrPipeline, opts);
	}

}

export class ProductGroupTypeController extends ProductGroupController {

	/**
	 * @inheritDoc
	 * 
	 * Also Adds groupData.type = 'ProductType.product' filter
	 */
	protected async executeDbGet<A extends DBGetOptionsMethods>(
		req: Request, 
		filterOrPipeline: A extends 'aggregate' ? object[] : Filter<ProductGroup>,
		opts: DBGetOptions<A>
	): Promise<DBGetReturnValue<A, ProductGroup>> {
		fixFilter(filterOrPipeline);
		return super.executeDbGet(req, filterOrPipeline, opts);
	}

}

// adds filter for product type product
function fixFilter(filterOrPipeline: object[] | Filter<ProductGroup> | Filter<Product>) {
	// aggregate pipeline
	if (Array.isArray(filterOrPipeline)) {
		const obj = filterOrPipeline.find(o => o.hasOwnProperty('$match'));
		if (obj)
			obj['$match']['groupData.type'] = ProductType.product;
		else
			filterOrPipeline.unshift({$match: {'groupData.type': ProductType.product}});
	}
	// normal filter
	else {
		filterOrPipeline['groupData.type'] = ProductType.product;
	}
}
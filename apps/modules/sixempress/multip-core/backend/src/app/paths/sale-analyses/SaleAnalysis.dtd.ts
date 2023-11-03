import { ModelClass } from '../../utils/enums/model-class.enum';
import { PricedRowsSaleModel } from '../../utils/priced-rows-sale/priced-rows-sale.dtd';

// the name of the field has to be the same as the relative status enum
// this is for easier code writing
export interface SaleAnalysisStatusMapping {
	draft: any[],
	fail: any[],
	success: any[],
	successPrePay: any[],
}

export enum SaleAnalysisStatus {
	draft = 1,
	pending,
	fail,
	success,
	successPrePay,
}

export interface SaleAnalysis extends PricedRowsSaleModel<SaleAnalysisStatus> {
}

export interface SaleAnalysisGraph {
	sum: number,
	
	netPositive: number,
	netNegative: number,

	// products: number,
	// productsOut: number,
	// manual: number,
	// manualOut: number,

	priceIncrease: number,
	priceReductions: number,
}
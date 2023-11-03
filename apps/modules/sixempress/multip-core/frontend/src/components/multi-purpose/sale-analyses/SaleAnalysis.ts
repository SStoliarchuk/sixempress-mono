import { } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes";
import { ModelClass } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class";
import { PricedRowsSaleModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd";

export function getFilterModelClassList() {
	const toR: ModelClass[] = [];
	if (AuthService.isAttributePresent(Attribute.viewCustomerOrder))
		toR.push(ModelClass.CustomerOrder);

	if (AuthService.isAttributePresent(Attribute.viewSales))
		toR.push(ModelClass.Sale);

	return use_filter.sxmp_modelclass_values_for_sale_analysis(toR);
}

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

export enum SaleAnalysisStatusLabel {
	'Bozza' = SaleAnalysisStatus.draft,
	'In Processo' = SaleAnalysisStatus.pending,
	'Fallito' = SaleAnalysisStatus.fail,
	'Completato' = SaleAnalysisStatus.success,
	'Completato, Da Pagare' = SaleAnalysisStatus.successPrePay,
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
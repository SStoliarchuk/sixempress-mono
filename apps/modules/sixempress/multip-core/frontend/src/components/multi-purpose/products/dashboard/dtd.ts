import chartjs from 'chart.js';
import { Supplier } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/Supplier';
import { Product } from '../Product';
import { ProductGroup } from '../ProductGroup';

export interface PDState {
	topSoldProductsChart: {
		chartdata: chartjs.ChartData,
		chartoptions: chartjs.ChartOptions,
	};
	chartKey: string,
	beData?: ProductDataReport;
	from: number;
	to: number;
	canRender: boolean;
}

export interface ProductDataReport {
	/**
	 * Ordered by the amount sold
	 */
	allProductAmount: number;
	negativeAmountProducts?: true;
	sellingAtZero?: true;
	pricestotal: {
		sell: number,
		buy: number,
	},
	earnings: {
		month: number,
		today: number,
	};

}

export interface TopSoldReportDetails {
	items: (Omit<ProductGroup, 'models'> & { amount: number, suppliers?: string, models: (Product & { amount: number })[] })[];
	suppHm: { [id: string]: Supplier };
}
export interface TopSoldReport {
	items: { name: string, amount: number }[];
}
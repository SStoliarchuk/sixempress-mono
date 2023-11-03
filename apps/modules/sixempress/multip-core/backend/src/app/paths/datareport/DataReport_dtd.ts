import { Movement, MovementDirection } from "../movements/Movement";
import { Product } from "../products/Product";
import { ProductGroup } from "../products/ProductGroup";
import { Supplier } from "../suppliers/Supplier";

export interface MainGraph {
	newClients: number;
	delivered: number;
	newRepairs: number;
}


export interface TopSoldReportDetails {
	items: (Omit<ProductGroup, 'models'> & {amount: number, models: (Product & {amount: number})[]})[];
	suppHm: {[id: string]: Supplier};
}
export interface TopSoldReport {
	items: ({name: string, amount: number})[];
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

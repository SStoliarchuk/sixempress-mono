import { PricedRowsSaleModel } from "../../utils/priced-rows-sale/priced-rows-sale.dtd";

export enum SaleStatus {
	draft = 1,
	pending,
	fail,
	success,
	successPrePay,
	cancelled,
}

export interface Sale extends PricedRowsSaleModel<SaleStatus> {
	
}
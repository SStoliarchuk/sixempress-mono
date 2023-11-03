import { PricedRowsModel } from "../../utils/priced-rows/priced-rows.dtd";

export enum SupplierReturnStatus {
	draft = 1,
	processing,
	failed,
	completed,
	completedPrePay,
	replaced,
}

export interface SupplierReturn extends PricedRowsModel<SupplierReturnStatus> {
	

}

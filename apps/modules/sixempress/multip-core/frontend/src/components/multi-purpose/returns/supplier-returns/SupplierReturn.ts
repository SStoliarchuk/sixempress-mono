import { PricedRowsModel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows/priced-rows.dtd';

export enum SupplierReturnStatus {
	draft = 1,
	processing,
	failed,
	completed,
	completedPrePay,
	replaced,
}
export enum SupplierReturnStatusLabel {
	"Bozza"                    = SupplierReturnStatus.draft,
	"In Processo"              = SupplierReturnStatus.processing,
	"Cancellato"               = SupplierReturnStatus.failed,
	"Completato"               = SupplierReturnStatus.completed,
	"Completato, Da pagare"    = SupplierReturnStatus.completedPrePay,
	"Sostituito"               = SupplierReturnStatus.replaced,
}

export interface SupplierReturn extends PricedRowsModel<SupplierReturnStatus> {
}


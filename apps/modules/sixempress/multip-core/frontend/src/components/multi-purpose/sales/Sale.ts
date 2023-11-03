import { PricedRowsSaleModel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd';

export enum SaleStatus {
	draft = 1,
	pending,
	fail,
	success,
	successPrePay,
	cancelled,
}

export enum SaleStatusLabel {
	'Bozza' = SaleStatus.draft,
	'In Attesa' = SaleStatus.pending,
	'Fallito' = SaleStatus.fail,
	'Completato' = SaleStatus.success,
	'Completo, Da Pagare' = SaleStatus.successPrePay,
	'Annullato' = SaleStatus.cancelled,
}

export interface Sale extends PricedRowsSaleModel<SaleStatus> {
	
}

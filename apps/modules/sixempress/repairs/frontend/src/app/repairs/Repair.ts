import { User } from '@sixempress/abac-frontend';
import { FetchableField, IDeletedCreatedData } from '@sixempress/main-fe-lib';
import { PricedRowsSaleModel } from '@sixempress/multi-purpose';

export interface Repair extends PricedRowsSaleModel<RepairStatus> {

	deviceType: DeviceType;
	model: string;
	color: string;
	defects: string;
	diagnostic?: string;
	
	customerNotice?: CustomerNotice;
	deviceCode?: string;
	accessories?: string;
	estimatedRepairTime?: number;
	visibleDefects?: string;
	notes?: string;

	assignedTo?: FetchableField<User>;
	opReport?: string;
	_opReportLastAuthor?: IDeletedCreatedData;

}


export enum CustomerNotice {
	noNotice = 1,
	phone,
	phoneNoAnswer,
	cantReach,
	other,
}

export enum CustomerNoticeLabel {
	'Da chiamare' = CustomerNotice.noNotice,
	'Chiamato' = CustomerNotice.phone,
	'Chiamato non risponde' = CustomerNotice.phoneNoAnswer,
	'Non raggiungibile' = CustomerNotice.cantReach,
	'Contattato diversamente' = CustomerNotice.other,
}


export enum DeviceType {
	smartphone = 1,
	computer,
	notebook,
	tablet,
	other
}

export enum DeviceTypeLabel {
	'Smartphone' = DeviceType.smartphone,
	'PC Fisso' = DeviceType.computer,
	'Notebook' = DeviceType.notebook,
	'Tablet' = DeviceType.tablet,
	'Altro' = DeviceType.other,
}


export enum RepairStatus {
	entry = 1,
	working,
	waiting,
	exitSuccess,
	exitFailure,
	waitingForReplacement,
	draft,
	
	deliveredFailure,
	delivered,
	deliveredWillPay,
	
	reEntered,
}

export enum RepairStatusLabel {
	'Bozza' = RepairStatus.draft,
	'Entrata' = RepairStatus.entry,
	'Lavorazione' = RepairStatus.working,
	'Attesa Cliente' = RepairStatus.waiting,
	'Uscita Riparati' = RepairStatus.exitSuccess,
	'Uscita Non Riparati' = RepairStatus.exitFailure,
	'Attesa Ricambi' = RepairStatus.waitingForReplacement,

	'Consegnato Non Riparato' = RepairStatus.deliveredFailure,
	'Consegnato Riparato' = RepairStatus.delivered,
	'Consegnato Riparato, Da Pagare' = RepairStatus.deliveredWillPay,
	
	'Rientrato' = RepairStatus.reEntered,
}

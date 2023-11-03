import { FetchableField, IDeletedCreatedData, LibModelClass } from '@sixempress/main-be-lib';
import { PricedRowsSaleModel } from '@sixempress/be-multi-purpose';


export enum CustomerNotice {
	noNotice = 1,
	phone,
	phoneNoAnswer,
	cantReach,
	other,
}

export enum DeviceType {
	smartphone = 1,
	computer,
	notebook,
	tablet,
	other,
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


export interface Repair extends PricedRowsSaleModel<RepairStatus> {

	deviceType: DeviceType;
	model: string;
	color: string;
	defects: string;
	diagnostic?: string;
	
	customerNotice?: CustomerNotice;
	deviceCode?: string;
	accessories?: string;
	// we keep this in parallel with endDate to calculate the diff between estimate and actual
	// so we can see the delays % etc
	estimatedRepairTime?: number;
	visibleDefects?: string;
	notes?: string;

	assignedTo?: FetchableField<LibModelClass.User>;
	opReport?: string;
	_opReportLastAuthor?: IDeletedCreatedData;

}

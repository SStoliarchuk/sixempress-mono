import { ConnectionStatus } from "../../utils/enums/fe-error-codes.enum";
import { ConvertedError, NetworkErr } from "../../utils/errors/errors";


export interface UESState {
	/**
	 * The error to show,
	 * this is separate from the systemOfflineCheck
	 * 
	 * if this is present a modal WILL be shown
	 * withouth any check
	 * 
	 * so set it only if you know you need a modal
	 */
	err: null | ErrorModalData;
	
	openErrorReportDialog: boolean;
	errorReportSentSuccesfully: boolean;

	/**
	 * This is a flag that signals if a system is offline and shows a permanent snackbar
	 */
	systemOfflineCheck: false | ConnectionStatus;
}

// configuration for the modal data
export interface ErrorModalData { 
	err: ConvertedError,
	errId?: string,
}

// used as static -> instance trigger data
export declare type UiServiceTriggerRequest = {
	type: "generic",
	data: ErrorModalData,
} | {
	type: "connection",
	data: ConnectionStatus,
};



export declare type OSState = {
	status: ConnectionStatus,
	/**
	 * When 0, the text should be "TRYING TO CONNECT"
	 */
	secondsLeft: number,
};
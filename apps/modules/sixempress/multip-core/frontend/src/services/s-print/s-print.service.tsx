import React from 'react';
import ReactDOM, { createPortal } from 'react-dom';
import { MediaFileService, SnackbarService, SnackbarControl, DataStorageService, ObjectUtils, SimpleSnackbarServiceProps, SmallUtils, LibSmallUtils, W } from "@sixempress/main-fe-lib";
import { MultiPCKeys } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/various";
import Button from '@material-ui/core/Button';
import { SoftwareAddonsStatus, PrintRequest, PrinterTypes, defaultIpFieldName, LabelPrinterRequest } from './s-print.dtd';
import { SeasService } from '../seas/seas.service';
import { WebRTCCodes } from '@sixempress/main-fe-lib';
import to from 'await-to-js';

export class SPrintService {

	/**
	 * As we monkey-patch the MediaFileService class, we need a field to then forse the fallback to printjs
	 */
	private static forcePrintJS = '__monkeyPatched';

	// toggles
	private static _isActive = DataStorageService.localStorage.getItem(MultiPCKeys.sprintIsActive) === 'true' ? true : false;

	public static get isActive() {
		return SPrintService._isActive;
	}

	public static set isActive(v: boolean) {
		DataStorageService.localStorage.setItem(MultiPCKeys.sprintIsActive, String(v));
		SPrintService._isActive = v;
	}

	/**
	 * Configurations of the different addons to use based on printer type
	 */
	private static _configurations: {[type: string]: {machineId: string}} = DataStorageService.getSafeValue(MultiPCKeys.sprintConfig, 'object', 'localStorage') || {};

	public static set configurations(v: (typeof SPrintService)['_configurations']) {
		SPrintService._configurations = ObjectUtils.cloneDeep(v);
		DataStorageService.localStorage.setItem(MultiPCKeys.sprintConfig, JSON.stringify(SPrintService._configurations));
	}

	public static get configurations() {
		return ObjectUtils.cloneDeep(SPrintService._configurations);
	}

	/**
	 * Overrides the default behaviour of printJS to first try to print with the server
	 * and then fallback on default printJS
	 */
	public static initService() {

		// monkey patch printjs
		const old = MediaFileService.printJS;
		MediaFileService.printJS = (...args) => {
			
			const data = args[0];
			if (!SPrintService.isActive || data[SPrintService.forcePrintJS])
				return old(...args);

			const printRequestBody: PrintRequest = {
				printerTypes: [PrinterTypes.document],
				toPrint: data.type === 'pdf' 
					? {type: "pdf", base64: data.printable} 
					: data.printable,
			};

			SPrintService.sendPrintRequest(printRequestBody, PrinterTypes.document, WebRTCCodes.requestDefaultPrint, () => old(...args));
		};
	}

	/**
	 * As isActive returns only the state of the service, not if it's actually simple printing because that depends on the presence of ip/port configuration
	 * we have this function that actually check the existance of ip/port and isActive
	 */
	private static getSocketId(type: PrinterTypes | defaultIpFieldName) {
		if (!SPrintService.isActive)
			return;

		// check default always
		const target = SeasService.getSocketIdByDescriptionId(SPrintService._configurations[type]?.machineId);
		if (!target)
			return

		return target;
	}

	/**
	 * Prints from the default document printer "type: 1"
	 */
	public static documentPrint(data: string | {base64: string, type: 'pdf'}) {
		SPrintService.sendPrintRequest(
			{toPrint: data, printerTypes: [PrinterTypes.document]}, PrinterTypes.document, WebRTCCodes.requestDefaultPrint,
			() => 
				MediaFileService.printJS(typeof data === 'string' 
					? { [SPrintService.forcePrintJS]: true, printable: data, type: 'raw-html' }
					: { [SPrintService.forcePrintJS]: true, printable: data.base64, type: 'pdf', base64: true, })
		);
	}
	
	/**
	 * Prints from the receipt printer "type: 2"
	 */
	public static receiptPrint(html: string) {
		SPrintService.sendPrintRequest(
			{toPrint: html, printerTypes: [PrinterTypes.receipt]}, PrinterTypes.receipt, WebRTCCodes.requestDefaultPrint,
			() => MediaFileService.printJS({[SPrintService.forcePrintJS]: true, printable: html, type: 'raw-html' })
		);
	}

	/**
	 * Sends the request to print labels
	 */
	public static async labelPrint(body: LabelPrinterRequest) {
		SPrintService.sendPrintRequest(
			body, PrinterTypes.label, WebRTCCodes.requestLabelPrint,
			() => LibSmallUtils.notify('Stampa etichette non riuscita!', 'error'),
		);
	}

	/**
	 * Returns the list of the available label printers otherwise void
	 */
	public static async getLabelPrinterList(): Promise<void | SoftwareAddonsStatus['availableLabelPrinters']> {
		const socket = SPrintService.getSocketId(PrinterTypes.label);
		if (!socket)
			return;

		return SeasService.seasMessage(socket, WebRTCCodes.getLabelPrinterList);
	}

	/**
	 * Sends the body to the seas service and shows control for the user, 
	 * IT assumes all the request point to the same socketID printerTypes
	 */
	private static async sendPrintRequest(body: PrintRequest | LabelPrinterRequest, type: PrinterTypes, webrtcCode: WebRTCCodes.requestLabelPrint | WebRTCCodes.requestDefaultPrint, onManualPrintRequest: () => void) {

		const socketId = SPrintService.getSocketId(type);
		if (!socketId)
			return onManualPrintRequest();

		let alreadyPrinted = false;
		let s: SnackbarControl;

		const onClickManual = () => {
			alreadyPrinted = true;
			s?.close();
			onManualPrintRequest();
		};

		const toggleSnack = (text: string, opts?: SimpleSnackbarServiceProps) => {
			s?.close()
			// give the possibility to print manually too, just in case
			s = SnackbarService.openSimpleSnack(text, {
				action: <W ruhTag='span'><Button color='inherit' onClick={onClickManual}>Stampa manuale</Button></W>,
				...(opts || {})
			});
		};

		toggleSnack("Stampa semplice inviata", {variant: 'success'});
		const [e] = await to(SeasService.seasMessage(socketId, webrtcCode, body));
		if (e && !alreadyPrinted)
			toggleSnack("Errore di stampa semplice", {variant: "error"});
	}


}

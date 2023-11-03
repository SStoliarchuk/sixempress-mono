import { CodeScannerService, IBaseModel, IUserFilter } from '@sixempress/main-fe-lib';
import { Product } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/Product';
import { CodeScannerEventsActiveStatus } from './code-scanner-active-status';
import { ExternalConnService } from 'apps/modules/sixempress/multip-core/frontend/src/services/external-conn/external-conn.service';

// we add here other modules to have a single view of the different codes used
export const AdditionalScannedItemType = {
	repairs: 'sxrp',
}

export const ScannedItemType = {
	product: '',
	customerorder: 'sxco',
	sale: 'sxsa',
}


/**
 * The fixed code is the one to use as the querying value, that is beacuse sometimes a barcode can have an ID in the string
 * so when you get the type you also fix the code
 */
export declare type codeScanTypeInfo = {prefix: string | number, fixedCode: string};

/**
 * This service listens for barcode emitted from CodeScannerService,
 * and then performs actions based on the content that was read
 *
 * To use it simply add it to the constructor of the bootstrapped component (usually app.component.ts)
 */
class _CodeScannerEventsService {

	/**
	 * If true, acts on barcode scans
	 */
	public static get isActive() { return CodeScannerEventsActiveStatus.isActive; };

	/**
	 * Starts listening to the barcode scanned events and then
	 * acts accordingly to plan >:]
	 */
	public static start() {
		CodeScannerService.emitter.subscribe(o => CodeScannerEventsService.isActive && this.processRead(o.value));
		(window as any).__sixempress_scan_barcode_debug = (str) => CodeScannerService.emit({origin: 'barcode', value: str});
	}

	/**
	 * Resolves encoded barcode type
	 */
	public static getTypeFromCodeScan(code: string = ''): codeScanTypeInfo {
		return use_filter.sxmp_codescanner_events_decompose_codescan_type(CodeScannerEventsService._getTypeFromCodeScan(code), code);
	}

	private static _getTypeFromCodeScan(code: string = ''): codeScanTypeInfo {
		// decode redirect url
		if (code.includes('http') || code.includes('&'))
			code = ExternalConnService.getScannerCodeValueFromRedirectUrl(code) as string;

		// check if the decoded still works
		if (!code) 
			return {prefix: null, fixedCode: code};

		for (const v of Object.values(ScannedItemType))
			if (v && code.indexOf(v) === 0)
				return {prefix: v, fixedCode: code.substr(v.length)};

		// generic barcode
		return {prefix: ScannedItemType.product, fixedCode: code};
	}

	/**
	 * Adds special chars to signal what type of barcode
	 */
	public static encodeBarcodeType(prefix: string | number, obj: IBaseModel): string {
		return use_filter.sxmp_codescanner_events_compose_barcode(String(prefix) + (obj._progCode || obj._id), prefix, obj);
	}

	/**
	 * Does an action based on the string that was read with the barcode
	 * @param string The string that was read by the scanner
	 */
	private static async processRead(string: string): Promise<void> {
		const r = this.getTypeFromCodeScan(string);
		await use_action.sxmp_codescanner_events_process_read(r);
	}
	
}


globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.CodeScannerEventsService = (globalThis.__sixempress.CodeScannerEventsService || _CodeScannerEventsService);
export const CodeScannerEventsService = globalThis.__sixempress.CodeScannerEventsService as typeof _CodeScannerEventsService;
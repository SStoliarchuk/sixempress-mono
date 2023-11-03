import { Subject } from 'rxjs';
import { BarcodeFormat } from '@zxing/library';
import { beep } from '@sixempress/utilities';
import { DataStorageService } from '@sixempress/utilities';
import { CacheKeys } from '../utils/enums/cache-keys.enum';

export interface CodeScannerOutput {
	origin: 'camera' | 'barcode';
	value: string;
	type?: BarcodeFormat;
}

type ActionFunction = (e: CodeScannerOutput) => void;

/**
 * This services is used to listen for barcodereader inputs, to use it
 * simply add this class to the constructor of app.component.ts
 */
class _CodeScannerService {

	/**
	 * Active flag just in case
	 */
	private static isActive = true;

	/**
	 * The default aciton of this service, is to emit the read code to this subject
	 * such default action can be modified, so this subject works only if the default service actions are active
	 * 
	 * @warning
	 * DO NOT USE THIS TO .next();
	 * IF YOU WANT TO EMIT USE THE CodeScannerService::emit();
	 * 
	 * @warning
	 * Remember to unsubscribe on componentWillUnmout before destroyin the application
	 */
	public static emitter: Subject<CodeScannerOutput> = new Subject();

	/**
	 * Time-based timeout\
	 */
	private static timeoutHandler: NodeJS.Timeout;
	
	/**
	 * Time-based value
	 */
	private static inputString = '';

	/**
	 * the barcodes are minimum 3 chars pls
	 * {idchar}{idchar}{somecode}
	 * example zz3
	 */
	public static minimumCharsLength = DataStorageService.localStorage.getItem(CacheKeys.barcodeCharsBeforeTimeout)
		? parseInt(DataStorageService.localStorage.getItem(CacheKeys.barcodeCharsBeforeTimeout))
		: 3;

	/**
	 * 50 ms seems good enough for the bluetooth ones
	 * 20 is base
	 */
	public static keyupTimeoutMs = DataStorageService.localStorage.getItem(CacheKeys.barcodeTimeoutMs)
		? parseInt(DataStorageService.localStorage.getItem(CacheKeys.barcodeTimeoutMs))
		: 20;

	/**
	 * Contains all the function executed on barcode scan
	 */
	private static onScanActions: ActionFunction[] = [
		(e) => CodeScannerService.emitter.next(e)
	];

	/**
	 * Sets the only action of the code scanner to emit from the subject emitter
	 */
	public static restoreDefaultAction() {
		this.onScanActions = [
			(e) => CodeScannerService.emitter.next(e)
		];
	}

	/**
	 * Overrides the current code scanner actions and sets the given one
	 */
	public static setAction(act: ActionFunction | ActionFunction[]) {
		this.onScanActions = Array.isArray(act) ? act : [act];
	}

	/**
	 * Allows to remove a custom action added
	 * works by reference
	 */
	public static removeAction(act: ActionFunction) {
		const idx = this.onScanActions.indexOf(act);
		~idx && this.onScanActions.splice(idx, 1);
	}

	/**
	 * Allows to add additional action to the barcode scan event withouth modifyin old actions
	 */
	public static addAction(act: ActionFunction) {
		this.onScanActions.push(act);
	}

	/**
	 * allows the service to emit and trigger action\
	 * also enables keyup barcode scanner
	 */
	public static start() {
		CodeScannerService.stop();
		CodeScannerService.isActive = true;
		window.addEventListener('keyup', CodeScannerService.keyup);
	}

	/**
	 * Stops the barcode scanner
	 */
	public static stop() {
		CodeScannerService.isActive = false;
		window.removeEventListener('keyup', CodeScannerService.keyup);
	}

	/**
	 * Listens for fast keyboard input, and then outputs an event
	 * the fast keyboard input is the way barcodes are read by the barcode-scanner
	 */
	private static keyup(e: KeyboardEvent) {
		// don't trigger if its in input or textarea
		if ((e.target as any).tagName.toUpperCase() === 'INPUT' || (e.target as any).tagName.toUpperCase() === 'TEXTAREA') {
			return;
		}

		// remove the old timeout immediately
		// as later we could emit directly instead of creating another timeout
		// for example when we scan \r or \n
		clearTimeout(CodeScannerService.timeoutHandler);
		// 32  is space, so we ignore it and take all above
		// 48  is "0"
		// 122 is "z"
		// 126 is ~ we ignore it
		// all from 0-9 + A-Z + a-z + some other special chars
		// the special chars are used in urls and we need to scan urls in the system too, for qr codes
		//
		// basically we just take the ASCII subset of chars
		// 
		// this prevents sending special chars like \u0014 \r \n etc..
		// that could be stored in DB and not be read by other barcodes
		// so we "normalize" the barcode here
		if (e.which > 32 && e.which < 126) {
			CodeScannerService.inputString += String.fromCharCode(e.which);
		}
		// \n     (10)
		// \r     (13)
		// \u0014 (20)
		// if we encounter these, then we treat them as output because
		// sometimes some barcodes add them to the end
		// so we can use this to speed up the emit()
		else if (e.which === 10 || e.which === 13 || e.which === 20) {
			CodeScannerService.emitInputString();
			return;
		}

		// add a timeout to prevent triggering emit() if its normal typing
		CodeScannerService.timeoutHandler = setTimeout(
			CodeScannerService.emitInputString, 
			CodeScannerService.keyupTimeoutMs
		);
	}

	/**
	 * Emits the inputString to the world and clears the string for next scan
	 */
	private static emitInputString() {
		// ensure the minimum string length has been reached
		if (CodeScannerService.inputString.length < CodeScannerService.minimumCharsLength) {
			CodeScannerService.inputString = '';
			return;
		}

		// yeet
		CodeScannerService.emit({origin: 'barcode', value: CodeScannerService.inputString});
		// clear for the next scan
		CodeScannerService.inputString = '';
	}

	/**
	 * Executes all the registered actions
	 */
	public static emit(data: CodeScannerOutput): void {
		if (!CodeScannerService.isActive) {
			return
		}

		// remove the special charactes (does this as people can have different scanner config)
		// some scanner append \r some append \n
		// set to lowecase cause barcodes are different pt.2
		//
		// we do this operatino here as the emit is used by the barcode scanner AND
		// the camera scanner
		// we normalize it
		//
		// TODO remove all chars that are not 47 < x < 123 ????
		data.value = data.value
			.replace(/\n|\r|\\n|\\r|/gi, '')
			.toLowerCase();

		for (const f of this.onScanActions) {
			beep();
			f(data);
		}
	}

}

globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.CodeScannerService = (globalThis.__sixempress.CodeScannerService || _CodeScannerService);
export const CodeScannerService = globalThis.__sixempress.CodeScannerService as typeof _CodeScannerService;
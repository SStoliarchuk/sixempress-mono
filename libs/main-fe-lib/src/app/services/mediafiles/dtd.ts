import printJS from 'print-js';
import { Omit } from '@material-ui/core';

export declare type CustomPrintJsxSettings = PrintJsDownloadMediaFile | CustomPrintJs;

interface CustomPrintJs extends printJS.Configuration {
	type: 'raw-html' | 'html' | 'json' | 'pdf';
	/**
	 * If the print fails, then the file is simply downloaded
	 * @default true
	 */
	downloadOnError?: false | true | {
		fileName?: string,
		mimeType?: string,
		extension?: string,
	};
}

interface PrintJsDownloadMediaFile extends Omit<CustomPrintJs, 'type'> {

	type: 'image';
	/**
	 * If the print fails, then the file is simply downloaded
	 * @default true
	 */
	downloadOnError?: false | {
		fileName?: string,
		mimeType: string,
		extension: string,
	};
}


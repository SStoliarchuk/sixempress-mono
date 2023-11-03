export interface PrintRequest {
	/**
	 * Element to print
	 */
	toPrint: string | {
		type: "pdf",
		base64: string,
	};
	/**
	 * the amount of copies to print
	 * @default 1
	 */
	copies?: number;
	/**
	 * The types of printer to use
	 * @defaut PrinterType.document (1)
	 */
	printerTypes: PrinterTypes[];
	/**
	 * The printer names to use to print instead of the printer type
	 */
	// printerNames?: string[];
}

export interface PrintRequestByType {
	printerType: number;
	toPrint: string | { type: 'pdf', base64: string };
	
	printerNames?: string[];
	copies?: number;
}

export enum PrinterTypes {
	document = 1,
	receipt,
	label,
}
export enum PrinterTypesLabel {
	"Documenti" = PrinterTypes.document,
	"Scontrini" = PrinterTypes.receipt,
	"Etichette" = PrinterTypes.label,
}

export declare type defaultIpFieldName = 'default';


export interface LabelPrinterRequest {
	/**
	 * The xml schema to use as the print
	 */
	schema: string;

	printerNames?: string[];

	/**
	 * This is a parallelized array,
	 * instead of sending [{a: 1}, {a: 1}]
	 * we send {a: [1, 1]}
	 * 
	 * as to consume less space,
	 * so instead of not adding a value, you need to add undefined
	 * so if the "normal" input is  [{a: 1, b: 2}, {a: 1}, {a:1, , b: 3}]
	 * this value should be {a: [1, 1, 1], b: [1, null, 3]}
	 */
	data?: {[key: string]: string[]}
}


export interface SoftwareAddonsStatus {
	/**
	 * Specific pritner for labels
	 */
	availableLabelPrinters: Array<{
		name: string
	}>;

	/**
	 * printers that accept base64/html images etc
	 */
	availablePrinters: Array<{
		/**
		 * the name of the printer as shown in Print Preview.
		 */
		displayName: string,
		/**
		 * the name of the printer as understood by the OS.
		 */
		name: string,
		/**
		 * Current status of the printer
		 */
		status: number,
	}>;
}

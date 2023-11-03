import printJS from 'print-js';
import downloadJS from 'downloadjs';
import { CustomPrintJsxSettings } from './dtd';
import { Omit } from '@material-ui/core';
import { ErrorFactory } from "../../utils/errors/error-factory";
import { SmallUtils } from '@sixempress/utilities';
import { LibSmallUtils } from '../../utils/various/small-utils';

/**
 * This service manages all the mediafiles of the system
 * prints/downloads/resizes etc
 */
export class MediaFileService {


	/**
	 * Opens a new tab writes the html and prints the tab
	 * @param html The html to print
	 * @param downloadOnError If the print fails, then the file is downloaded DEFAULT true
	 */
	static printHtml(html: string, downloadOnError?: boolean) {
		MediaFileService.printJS({printable: html, type: 'raw-html', downloadOnError});
	}

	/**
	 * @param data can be:
	 * 	url
	 * 	dataUrl
	 * 	string
	 * 	html string
	 *  File
	 * 	Blob
	 * 	Uint8Array
	 * 	aliens
	 */
	static downloadJS( data: string | File | Blob | Uint8Array, fileName?: string, mimeType?: string ) {
		return downloadJS(data, fileName, mimeType);
	}

	/**
	 * Returns the printJs from the main-fe-lib
	 * with some overrides to make it cooler
	 */
	static printJS( config: CustomPrintJsxSettings ) {
		
		// defualt configs
		const defaultConfigs: Omit<printJS.Configuration, 'printable'> = {
			onError: (e) => { throw e; },
			showModal: true,
			modalMessage: 'Creazione File...',
		};

		// set the download onerror configuration
		if (config.downloadOnError !== false) {

			let contentToDownload: any;
			let fileName: string = 'download';
			let mimeType: string;
			let extension: string;
	
			switch (config.type) {
				case 'raw-html':
					mimeType = 'text/html';
					contentToDownload = config.printable;
					extension = 'html';
					break;
	
				case 'html':
					mimeType = 'text/html';
					// get node by id
					const el = document.getElementById(config.printable);
					contentToDownload = el && el.textContent;
					extension = 'html';
					break;
	
				case 'json':
					// TODO manually generate the table to download
					mimeType = 'text/html';
					break;
	
				case 'image':
					contentToDownload = config.printable;
					break;
					
				case 'pdf':
					contentToDownload = config.base64 && 'data:application/pdf;base64,' + config.printable;
					mimeType = 'application/pdf';
					extension = 'pdf';
					break;
			}

			// set the data manually
			if (typeof config.downloadOnError === 'object') {
				fileName = config.downloadOnError.fileName || fileName;
				mimeType = config.downloadOnError.mimeType || mimeType;
				extension = config.downloadOnError.extension || extension;
			}

			// download on err
			config.onError = (e) => {
				if (contentToDownload) {
					// notify 
					LibSmallUtils.notify("Impossibile stampare. Il file verra' scaricato", 'error');

					// try to download the beast
					MediaFileService.downloadJS(contentToDownload, fileName + '.' + extension, mimeType);
				} 
				else { throw e; }
			};
		}

		// TODO add a printJS call queue, because if we call it at the same time twice, only one item is generated as it uses iframe id ...
		// and then it gets stuck
		//
		// it happened only once, but it's better to be "safe"
		
		// print with config override
		printJS({
			...defaultConfigs,
			...config,
		});
	}


	/**
	 * Changes the size of a base64 images
	 * @param datas base64 image
	 */
	public static resizeDataUrl(datas: string, wantedWidth?: number, wantedHeight?: number): Promise<string> {
		return new Promise((resolve, reject) => {
			// create an image to receive the Data URI
			const img = document.createElement('img');

			img.onerror = (err) => reject(ErrorFactory.make(err.toString()));

			// When the event "onload" is triggered we can resize the image.
			img.onload = () => {
				// create a canvas and get its context.
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

				// if no wantedWidth and Height, return the original size
				if (!wantedWidth && !wantedHeight) {
					wantedHeight = img.height;
					wantedWidth = img.width;
				} 
				// if only one of the two. then get the other by image proportion
				else if (wantedHeight) {
					wantedWidth = Math.floor(wantedHeight * img.width / img.height);
				} 
				else if (wantedWidth) {
					wantedHeight = Math.floor(wantedWidth * img.height / img.width);
				}

				// set the dimensions at the wanted size.
				canvas.width = wantedWidth as number;
				canvas.height = wantedHeight as number;

				// resize the image with the canvas method drawImage();
				ctx.drawImage(img, 0, 0, wantedWidth as number, wantedHeight as number);

				// return the image
				const dataURI = canvas.toDataURL();
				resolve(dataURI);
			};

			// put the Data URI in the image's src attribute to trigger img.onlonad
			img.src = datas;
		});
	}

	/**
	 * transforms a base64 string to blob
	 */
	public static b64toBlob(base64Data: string, contentType: string = '') {
		// defines slices size
		const sliceSize = 1024;
		// convert the base64
		const byteCharacters = atob(base64Data);
		// get the length of b64 string
		const bytesLength = byteCharacters.length;
		// get the amount of slices by divining the lenght and sliceSize
		const slicesCount = Math.ceil(bytesLength / sliceSize);
		// create a byte array based on the slices
		const byteArrays = new Array(slicesCount);

		for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
			// define start
			const begin = sliceIndex * sliceSize;
			// and define end
			const end = Math.min(begin + sliceSize, bytesLength);

			// what is happening here
			const bytes = new Array(end - begin);
			for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
				bytes[i] = byteCharacters[offset].charCodeAt(0);
			}

			// store the generetad bytes inside the end array as an Uint8Array
			byteArrays[sliceIndex] = new Uint8Array(bytes);
		}
		// return the blob
		return new Blob(byteArrays, { type: contentType });
	}

	/**
	 * Controls the extension of the file that should be 'png' | 'jpeg' | 'jpg',
	 * and then converts it to base64
	 */
	public static imageToBase64(file: File): Promise<string> {
		return new Promise<string>((resolve, reject) => {

			// Getting basic file info
			// const mimeType = file.type;
			const name = file.name;
			const extension = ( name.match(/\.([a-z]+)$/) || ['file'] )[1];

			// Check if the file is allowed
			const allowedExtension = ['png', 'jpeg', 'jpg'];
			if (allowedExtension.indexOf(extension) === -1) {
				reject(ErrorFactory.make('File type "' + extension + '" not allowed'));
			} else {

				// reads the file
				const reader = new FileReader();
				reader.onerror = (err) => reject(err);
				reader.onload = () => { resolve((reader.result as any).toString()); };
				reader.readAsDataURL(file);

			}

		});
	}

	/**
	 * Allows you to download an html table as a xlsx format
	 * @param tableId Table id to use to get The NODE elemnt
	 * @param worksheetName the name of the workseet to return
	 * @param downloadName the download file name
	 */
	public static tableToExcel(tableId: string, worksheetName?: string, downloadName?: string) {
		// set download and worksheet name
		worksheetName = worksheetName || 'download';
		downloadName = (downloadName || worksheetName) + '.xls';

		// xlsx metadata and teamplte
		const uri = 'data:application/vnd.ms-excel;base64,';
		const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><title></title><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>';
		// replace the template with the table data
		const base64 = (s: any) => window.btoa(decodeURIComponent(encodeURIComponent(s)));
		const format = (xlsxTemplate: string, c: {worksheet: string, table: string}) => xlsxTemplate.replace(/{(\w+)}/g, (m: any, p: 'worksheet' | 'table') => c[p]);

		// get the table
		const tableNode = document.getElementById(tableId);
		if (!tableNode) { throw ErrorFactory.make('No table with tableid: "' + tableId + '" found'); }
		const ctx = {worksheet: worksheetName, table: tableNode.innerHTML};

		// create link to download with name
		const link = document.createElement('a');
		link.download = downloadName;
		// remove unneccesary and broken chars and create table uri
		link.href = uri + base64(format(template, ctx).replace(/(<!--(.|\t|\n)*?-->)|( _ngcontent.*?"")|(€)/gi, ''));
		// download table
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	/**
	 * Stolen from karelGUI, see which one works on both chrome and firefox
	 */

	// public downloadMediaFile(id) {
	// 	MediaFileService.getFirst(id).subscribe(file => {
	// 		const blob = MediaFileService.b64toBlob(file['content'], file['mimeType']);
	// 		if (window.navigator.msSaveOrOpenBlob) {
	// 			window.navigator.msSaveBlob(blob, file['name'] + '.' + file['extension']);
	// 		}	else {
	// 			const elem = window.document.createElement('a');
	// 			elem.href = window.URL.createObjectURL(blob);
	// 			elem.download = file['name'] + '.' + file['extension'];
	// 			document.body.appendChild(elem);
	// 			elem.click();
	// 			document.body.removeChild(elem);
	// 		}
	// 	});
	// }

	// public downloadBase64(base64: string, fileName: string) {
	// 	const elem = window.document.createElement('a');
	// 	elem.href = base64;
	// 	elem.download = fileName;

	// 	document.body.appendChild(elem);
	// 	elem.click();
	// 	document.body.removeChild(elem);
	// }

}

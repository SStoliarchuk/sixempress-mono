import React, { lazy, Suspense } from 'react';
import { Observable } from 'rxjs';
import { MediaFileService, ModalService, OpenModalControls } from '@sixempress/main-fe-lib';

const LazyPdfComponent = lazy(() => import('./lazy-component/lazy-pdf-component'));

//  actions avaible (from pdfmake.js):
//  
//  open
//  print
//  download
//  getBase64
//  getDataUrl
//  getBlob
//  getBuffer
//  getStream
//  

class _PdfService {


	/**
	 * Allows you to execute actions on the generated pdf
	 */
	public static pdfAction(dd: any, action: 'print' | 'open' | 'download', fileNameToDownload?: string): void {

		switch (action) {
			case 'open':
				return this.executeActions(dd, 'open');
			
			case 'download':
				return this.executeActions(dd, 'download', fileNameToDownload || 'downloadedPdf.pdf');

			case 'print':
				return this.executeActions(dd, 'getBase64', (dataUrl: string) => MediaFileService.printJS({ printable: dataUrl, type: "pdf", base64: true }));
		}

	}

	/**
	 * Generates the pdf in the specified format
	 */
	public static generatePdf(dd: any, action: 'base64' | 'dataUrl' | 'buffer' | 'blob', options?: any): Observable<any> {
		return new Observable((obs) => {

			let fn: string;
			switch (action) {
				case 'base64':
					fn = 'getBase64';
					break;
				case 'dataUrl':
					fn = 'getDataUrl';
					break;
				case 'blob':
					fn = 'getBlob';
					break;
				case 'buffer':
					fn = 'getBuffer';
					break;
			}

			try {
				this.executeActions(
					dd, 
					fn,
					(data: any) => { obs.next(data); obs.complete(); }, 
					options,
				);
			}
			catch (e) { 
				obs.error(e); 
			}

		});

	}

	private static executeActions(dd: any, fn: string, ...args: any): void {
		let modal: OpenModalControls<any>;
		modal = ModalService.open(() => (
			<Suspense fallback={<div style={{padding: '0.5em'}}>Caricamento...</div>}>
				<LazyPdfComponent dd={dd} action={fn} onComplete={() => modal?.close()} extraArgs={args}/>
			</Suspense>
		));
	}

}


globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.PdfService = (globalThis.__sixempress.PdfService || _PdfService);
export const PdfService = globalThis.__sixempress.PdfService as typeof _PdfService;
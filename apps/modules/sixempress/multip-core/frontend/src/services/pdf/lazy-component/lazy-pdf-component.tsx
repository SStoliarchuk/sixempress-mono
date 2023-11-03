import React from 'react';
import pdfVfs from '../lib/vfs_fonts.js';
import pdfMake from 'pdfmake-lite';

export interface LPDProps {
	dd: any;
	action: string;
	extraArgs: any[];
	onComplete: () => void;
}

export default class LazyPdfComponent extends React.Component<LPDProps> {
	
	constructor(p: LPDProps) {
		super(p);
	
		const extra = [...p.extraArgs];
		// replace the first callback with a function that calls onComplete()
		if (typeof extra[0] === 'function') {
			const fn = extra[0];
			extra[0] = (...args) => {
				p.onComplete();
				fn(...args);
			}
		}

		pdfMake.createPdf(p.dd, undefined, undefined, pdfVfs)[p.action](...extra);

		// if the passed args are not callback, then it is complete immediately :]
		if (typeof extra[0] !== 'function') {
			// for example if action == download, and the browser blocks that action
			// then we try to download again
			// then we get a weird error where the "modal" variable passedin pdf.service is not yet refernced
			// and the modal remains open
			// 
			// so we set a timeout to async it for the dom, so the problem is gone 
			setTimeout(p.onComplete, 1);
		}

	}

	render() { return (null); }

}

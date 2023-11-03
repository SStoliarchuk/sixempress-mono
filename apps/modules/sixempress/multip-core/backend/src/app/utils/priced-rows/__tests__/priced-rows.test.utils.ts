import { MovementMedium } from "../../../paths/movements/Movement";
import { Product } from "../../../paths/products/Product";
import { ModelClass } from "../../../utils/enums/model-class.enum";
import { FetchableField } from "@sixempress/main-be-lib";
import { PricedRowsModel as _PricedRowsModel } from "../priced-rows.dtd";
import moment from 'moment';

export type PricedRowsModel = _PricedRowsModel<any>

export type PartialPricedRows = Partial<PricedRowsModel> & {
	l?: {
		date?: number,
		man?:   {sell?: number, buy?: number}[],
		prod?:  {sell?: number, buy?: number, id?: string | Product, am?: number, tr?: {[loc: string]: number}}[],
	}[];
	p?: {am?: number, medium?: MovementMedium, date?: number}[]
};

const prodContr = (globalThis as any)['tt'].getProdController();

export async function partToFull(is: (PartialPricedRows | PricedRowsModel)[]) {
	const comp: PricedRowsModel[] = [];
	for (const i of is) {
		
		const t = (i as PartialPricedRows);
		const pp = t.p || []; delete t.p;
		const ll = t.l || []; delete t.l;

		// create refs if object not given but only data 
		for (const l of ll) {
			for (const p of l.prod || []) {
				if (p.id)
					continue;
				
				const ps = await prodContr.save([{ms: [{v: {sellPrice: p.sell || 0, buyPrice: p.buy || 0}}]}]);
				p.id = ps[0].models[0]._id.toString();
				
			}

		}

		comp.push({
			status: 1,
			list: ll.map(l => ({
				date: l.date || moment().unix(),
				manual: (l.man || []).map(m => ({
					sellPrice: m.sell || 1, 
					buyPrice: m.buy || 0, 
					description: ''
				})),
				// finalCosts: (l.final || []).map(m => ({
				// 	sellPrice: m.sell, 
				// 	buyPrice: m.buy || 0, 
				// 	description: ''
				// })),
				// shipping: (l.ship || []).map(m => ({
				// 	sellPrice: m.sell, 
				// 	buyPrice: m.buy || 0, 
				// 	description: ''
				// })),
				products: (l.prod || []).map(m => {
					const o = {
						item: new FetchableField(((m as any).id._id || m.id).toString(), ModelClass.Product), 
						amount: typeof m.am !== 'undefined' ? m.am : 1,
					};

					// for priced rows sale
					if (m.tr) {
						(o as any).transfer = m.tr;
					}
					return o;
				}),
			})),
			payments: pp.map(p => ({amount: p.am, medium: p.medium || MovementMedium.cash, date: p.date || 0})),
			documentLocationsFilter: ['*'],
			documentLocation: '1',
			physicalLocation: '1',
			...i,
		})
	}
	
	return comp;
}
import fs from 'fs';
import cp from 'child_process';
import { RenderResult } from '@testing-library/react';
import { PartialGroup, TestTools } from '../types/globals';
import moment from 'moment';
import { RouterService, BusinessCategory, BusinessLocation, CodeScannerService, IRequestResponse, BusinessLocationsService, LibModelClass, RequestService, FetchableField } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Observable } from 'rxjs';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { BusinessType } from 'apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd';
import { ProductGroup } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/ProductGroup';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { User } from '@sixempress/abac-frontend';

const ProductType = { product: 1 };

((global as any).SETT as typeof SETT) = {
	Commands: {
		add: (name: string, fn: Function) => tt[name] = fn,
	}
};


// we use a counter as the file is opened with a delay, so if we run this fn too fast twice
// then both will open the same file
let counter = 0;
// use 1 instance of chrome
let chromeIsOpened = false;

(((global as any).tt) as TestTools) = {

	scanBarcode: (text: string, clientApiResponse?: any) => {

		if (clientApiResponse) {
			tt.setClientApiResponse(clientApiResponse);
		}

		CodeScannerService.emit({origin: "barcode", value: text});
		return;
	},

	setupMultip: () => {
		MultipService.content = {
		};
		MultipService.exts = {
			externalConnections: [],
		}
	},

	setStateOverride: (c: React.Component) => {
		c.setState = (function(this: React.Component, toSet, callback) {
			const oldState = this.state || {};
			
			// resolve the state fn
			if (typeof toSet === 'function') {
				toSet = toSet(oldState, this.props || {});
			}

			// toSet can be undefined or null as the functino above could return null/undefined
			if (toSet) {
				this.state = {...oldState, ...toSet};
			}

			callback && callback();
		}).bind(c);
	},

	setFetchResponse: (answerBody: any, c?: Partial<Response>) => {
		global['fetch'] = jest.fn().mockImplementation((url: string) => 
			new Promise((resolve, reject) => {
				const body = () => new Promise((r, j) => r(answerBody));
				resolve({ text: body, ok: true, url, status: 200, ...(c ? c : {}) });
			})
		);
	},

	setClientApiResponse: (body: any, obj?: Partial<IRequestResponse>) => {
		jest.spyOn(RequestService, 'request').mockReturnValue(Promise.resolve({ data: body, headers: obj.headers } as any));
	},

	openInBrowser: (c: RenderResult | Node = document.body, newWindow: boolean = false) => {

		const html = "<style>svg {max-width: 4em}</style>" + (c as any).outerHTML ? (c as any).outerHTML : (c as any).baseElement.outerHTML;
		const filePath = "/tmp/jest-jsx-html-file-cotainer_" + ++counter + ".html";

		let toOpen = chromeIsOpened;
		fs.writeFile(filePath, html, e => {
			if (e) { throw e; }
			cp.exec("google-chrome " + ( newWindow || !toOpen ? "--new-window " : "") + filePath).unref();
		});
		
		// no need to delete, as the counter is always reset to 0,
		// so the max amounts of files won't be more than 10
		// fs.unlinkSync(filePath);

		chromeIsOpened = true;
	},

	getSlug: () => {
		return "jest_slug_that_will_never_exists_in_db_20000925";
	},

	setupContext: () => {
	},

	setupRouter: () => {
		if (!RouterService['reactRouter']) {
			RouterService['reactRouter'] = {
				history: {},
				location: {},
				match: {props: {}}
			} as any;
		}
		
	},


	setupAuth: (sett: Partial<User & {attributes: number[]}> = {}) => {
		
		// const user: User = {
		// 	name: "name",
		// 	allowedLocations: ['*'],
		// 	_progCode: 1,
		// 	_id: "_id",
		// 	role: new FetchableField('00', LibModelClass.UserRole, {name: '', attributes: [1], ...sett}),
		// 	username: "username",
		// 	...sett,
		// };
		// AuthService.currentUser = user;
		// AuthService.isAttributePresent = user.role.fetched.attributes.includes(1)
		// 	? (a) => a >= 10000 || user.role.fetched.attributes.includes(a)
		// 	: (a) => user.role.fetched.attributes.includes(a);

		// const auth = {
		// 	iss: moment().unix(),
		// 	exp: moment().add(1, 'd').unix(),
		// 	slug: tt.getSlug(),
		// 	sub: user._id,
		// };
		// AuthService.auth = {client: {tokenAuth: { __string: "header." + btoa(JSON.stringify(auth)) + ".sign", ...auth }}};
		
		// const authz = {
		// 	iss: moment().unix(),
		// 	exp: moment().add(1, 'd').unix(),
		// 	slug: tt.getSlug(),
		// 	data: { locs: [], },
		// 	user: { _id: '', locs: [], att: user.role.fetched.attributes, name: user.name, },
		// };
		// AuthService.auth = { client: { tokenAuthz: { __string: "header." + btoa(JSON.stringify(authz)) + ".sign", ...authz } } };
	},


	setupLocations: (locations: BusinessLocation[], chosenIdx?: number) => {

		if (locations.length === 1 && typeof chosenIdx === 'undefined') {
			BusinessLocationsService.chosenLocationId	= locations[0]._id;
		}
		else {
			BusinessLocationsService.chosenLocationId = locations[chosenIdx] ? locations[chosenIdx]._id : "*";
		}
	},

	prodPartialToFull: (pgs: PartialGroup | PartialGroup[]): ProductGroup[] => {
		pgs = Array.isArray(pgs) ? pgs : [pgs];

		for (const pg of pgs) {
			pg.groupData = pg.groupData || pg.gd as any;
			pg.models = pg.models || pg.ms as any;
			delete pg.gd;
			delete pg.ms;
			
			pg.groupData = { name: "name", type: ProductType.product, ...(pg.groupData || {}) };
			pg.models = pg.models || [{} as any];
			pg.documentLocationsFilter = pg.documentLocationsFilter || ["1"];
			
			const allExtConnId: string[] = [];
			
			pg.models = pg.models || [{}] as any;
			for (const p of pg.models) {
				const partial = p as any as PartialGroup['ms'][0];
				
				p.groupData = pg.groupData;

				if (p._deleted && typeof p._deleted !== 'undefined')
					p._deleted = {_author: {id: '000000000000', modelClass: LibModelClass.User}, _timestamp: moment().unix()};
	
				p._id = p._id || String(Math.random() + 1).replace('.', '');

				p.infoData = p.infoData || {barcode: []};
	
				p.variationData = partial.v as any|| p.variationData;
				if (partial.bar) { 
					p.infoData.barcode = partial.bar; 
				}
	
				// if (partial.extId) {
				// 	partial._metaData = partial._metaData || {};
				// 	partial._metaData._externalIds = partial._metaData._externalIds || [];
				// 	for (const i of partial.extId) {
				// 		const id  = typeof i === 'number' ? i : i.id;
				// 		const ext = typeof i === 'number' ? extConfig._id : i.ext || extConfig._id;
				// 		const gr  = typeof i === 'number' ? i : i.p || id;
						
				// 		if (!partial._metaData._externalIds.some(ex => ex._externalConnectionId === ext))
				// 			partial._metaData._externalIds.push({_id: id, _externalConnectionId: ext, _additional: {_wooProductGroupId: gr}});
				// 	}
	
				// 	for (const i of partial._metaData._externalIds) {
				// 		allExtConnId.push(i._externalConnectionId);
				// 	}
				// }
				
	
				const vv = partial.vv;
				delete partial.extId;
				delete partial.v;
				delete partial.bar;
				delete partial.vv;
	
				p.variationData = { 
					buyPrice: 1,
					sellPrice: 2,
					variants: vv ? vv.map((v, idx) => typeof v === 'string' ? ({name: idx.toString(), value: v}) : v) : [],
					...(p.variationData || {})
				};
			}
	
	
		}

		return pgs as any as ProductGroup[];
	},

	wait(ms) {
		return new Promise(r => setTimeout(r, ms));
	},

	eo: ((...args) => expect.objectContaining(...args)),

	ea: ((sampleOrIgnore: any[] | boolean, sample?: any[]) => {
		let ignore: boolean = false;
		if (typeof sampleOrIgnore === 'boolean') {
			ignore = sampleOrIgnore;
		} else {
			sample = sampleOrIgnore;
		}
		
		const tor = expect.arrayContaining(sample);
	
		if (!ignore) {
			const oldMatch = tor.asymmetricMatch.bind(tor);
			tor.asymmetricMatch = (function (this: any, ...matchArgs) {
				if (matchArgs[0].length !== this.sample.length) {
					return false;
				}
				return oldMatch(...matchArgs)
			}).bind(tor);
		}
	
		return tor;
	}) as any,

};

import fs from 'fs';
import cp from 'child_process';
import { RenderResult } from '@testing-library/react';
import { TestTools } from './globals';
import { AuthService } from '../app/services/authentication/authentication';
import moment from 'moment';
import { CodeScannerService } from '../app/services/code-scanner.service';
import { IRequestResponse } from '../app/services/dtd';
import { BusinessLocationsService } from '../app/services/business/business-locations.service';
// import { ContextService } from '../app/services/context-service/context-service';
import { RequestService } from '../app/services/request-service/request-service';
import { BusinessLocation } from '../app/services/context-service/context.dtd';
export {};

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

	wait(ms: number) {
		return new Promise((r, j) => setTimeout(r, ms));
	},

	scanBarcode: (text: string, clientApiResponse?: any) => {

		if (clientApiResponse) {
			tt.setClientApiResponse(clientApiResponse);
		}

		CodeScannerService.emit({origin: "barcode", value: text});
		return;
		
		// old version
		// we add a new line to trigger immediately the barcode
		// instead of waiting for timeout
		const str = text + '\n';

		for (let i = 0; i < str.length; i++) {
			const e = new KeyboardEvent('keyup');
			Object.defineProperty(e, 'which', {
				get: () => str.charCodeAt(i),
				set: () => {},
			});
			Object.defineProperty(e, 'target', {
				get: () => ({tagName: "body"}),
				set: () => {},
			});
			
			window.dispatchEvent(e);
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
		jest.spyOn(RequestService, 'request').mockReturnValue(Promise.resolve({data: body, headers: obj.headers} as any));
	},

	openInBrowser: (c: RenderResult | Node, newWindow: boolean = false) => {

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
		// ContextService.environment = {
		// 	environment: 'production',
		// 	controlApi: '',
		// 	stlseApi: '',
		// };
	},

	setupAuth: (sett: { userAtt?: number[] } = {}) => {
		
		const auth = {
			iss: moment().unix(),
			exp: moment().add(1, 'd').unix(),
			slug: tt.getSlug(),
			sub: "_id_123",
		};
		AuthService.auth = {client: {tokenAuth: { __string: "header." + btoa(JSON.stringify(auth)) + ".sign", ...auth }}};

		// AuthService.controlToken = { string: "header." + btoa(JSON.stringify(auth)) + ".sign", };
		

		const authz = {
			iss: moment().unix(),
			exp: moment().add(1, 'd').unix(),
			slug: tt.getSlug(),
			user: { _id: '', locs: [], att: sett.userAtt || [1, 2, 3, 4, 5], name: "user", },
			data: { locs: [], },
		};
		AuthService.auth = { client: { tokenAuthz: { __string: "header." + btoa(JSON.stringify(authz)) + ".sign", ...authz } } };

		AuthService.isLoggedIn = true;
	},

	setupLocations: (locations: BusinessLocation[], chosenIdx?: number) => {

		// ContextService.softwareInstance = {
		// 	slug: 'jest',
		// 	name: '',
		// 	admins: [],
		// 	server: {id: "", modelClass: "", fetched: {endpoint: 'https://asd/' ,publicCert: 'asd'}},
		// 	loginSlug: "jest",
		// 	expires: false,
		// 	documentLocationsFilter: ['*'],
		// 	locations,
		// };

		// BusinessLocationsService.updateByBusiness(ContextService.softwareInstance);
		
		if (locations.length === 1 && typeof chosenIdx === 'undefined') {
			BusinessLocationsService.chosenLocationId	= locations[0]._id;
		}
		else {
			BusinessLocationsService.chosenLocationId = locations[chosenIdx] ? locations[chosenIdx]._id : "*";
		}
	},


};

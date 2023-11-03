import { Application, Request } from 'express';
import { AuthHelperService, CustomExpressApp, Error401, Error403, Error409, ObjectUtils, RequestHelperService } from "@sixempress/main-be-lib";
import { ApiKeyController, ApiKeyType } from '@sixempress/abac-backend';
import { Attribute } from '@sixempress/be-multi-purpose';
import { ExternalConnection, ExternalConnectionController, ExternalConnectionRequest, ExternalConnectionType } from './multip-config.dtd';
import { ObjectId } from 'mongodb';
import { SyncConfigService } from './sync-config.service';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ErrorCodes } from '../../utils/enums/error.codes.enum';


export class ExternalConnPathsService {


	public static start(app: CustomExpressApp) {

		app.get('/' + BePaths.multipexternalconnections, RequestHelperService.safeHandler(async (req, res) => {
			const conf = await SyncConfigService.getConfigByReqOrSlug(req);
			return conf;
		}));

		/**
		 * handles a login request from outside to create an external conneciton
		 */
		app.post(
			'/' + BePaths.multip_request_ext_conn, 
			AuthHelperService.requireAttributes(
				[Attribute.addExternalConnection], 
				new Error403({code: ErrorCodes.userDoesNotHaveAuthorizationForExtRequest, message: 'The user is not authorized to create external connections'})
			),
			RequestHelperService.safeHandler(async (req, res) => {
				const d = await ExternalConnPathsService.handleExternalConnectionCreationRequest(req);
				res.status(201).send(d);
			})
		);
		
		/**
		 * external connection
		 */
		app.put('/' + BePaths.multipexternalconnections, RequestHelperService.safeHandler(async (req, res) => {

			const body: ExternalConnection[] = req.body;
			if (!body) throw new Error403('No body given');
			if (!Array.isArray(body)) throw new Error403('The body should be an array of objects');
			
			await ExternalConnPathsService.setExternalConnections(req, body);
	
			res.status(201).send();
		}));

	}

	/**
	 * Wordpress send this request, and we create a disabled external connection with the appropriate info
	 * @warning
	 * this request is public, thus do all the appropriate auth check
	 */
	private static async handleExternalConnectionCreationRequest(req: Request) {
	
		// verify dtd
		const body: ExternalConnectionRequest = req.body;
		const errs = new ExternalConnectionRequest().verifyObject(body);
		if (errs) 
			throw new Error403(errs);
				
		// get the current content
		const slug = RequestHelperService.getSlugByRequest(req);

		const dbConf = await SyncConfigService.getConfigByReqOrSlug(req);
		const conns = dbConf.externalConnections || [];
		
		// return the old one
		const originIsPresent = conns.find(c => c.originUrl === body.originUrl);
		if (originIsPresent) 
			return {apiKey: originIsPresent.auth.apiKey};


		// create the relative api key to use
		const createdApiKey = (await new ApiKeyController().saveToDb(req, [{
			attributes: [], 
			availableLocations: ['*'],
			documentLocationsFilter: ['*'],
			name: body.originUrl,
			expires: false,
			type: ApiKeyType.internalSystem,
		}])).ops[0];
		
		// add to array
		const toCreate: ExternalConnection = body.type === 'addons'
			? {
			_id: new ObjectId().toString(),
			isDisabled: false,
			originUrl: body.originUrl,
			name: 'Stampante ' + body.originUrl.slice(0, 5) + '...',
			type: ExternalConnectionType.addons,
			auth: {
				apiKey: createdApiKey._key.toString(),
				type: 'apikey',
			},
			useFor: {},
		}
			: {
			_id: new ObjectId().toString(),
			isDisabled: true,
			originUrl: body.originUrl,
			name: body.originUrl.replace(/^https?:\/\/(www\.)?/, ''),
			type: ExternalConnectionType.wordpress,
			auth: {
				apiKey: createdApiKey._key.toString(),
				type: 'apikey',
			},
			useFor: {
				crudFromLocal: true,
				crudFromRemote: true,
				rawFiles: true,
			},
		};
		conns.push(toCreate);


		// update the content
		await SyncConfigService.updatExtEndpoints(req, conns);
		return {apiKey: toCreate.auth.apiKey};
	}

	
	/**
	 * Allows you to update the external connections associated with a systen
	 */
	private static async setExternalConnections(req: Request, body: ExternalConnection[]) {
		// no ext conn permission
		if (!AuthHelperService.isAttributePresent(Attribute.addExternalConnection, req)) 
			throw new Error401();

		let defaultConneted: ExternalConnection;
		for (const b of body) {
			if (typeof b !== 'object')
				throw new Error403('The body should be an array of objects')
			
			const errs = new ExternalConnectionController().verifyObject(b);
			if (errs) 
				throw new Error403(errs);

			// add new id if necessary
			b._id = b._id || new ObjectId().toString();

			// remove false value and set to undefined
			if (b.isDisabled === false)
				delete b.isDisabled

			// ensure only 1 site is active
			if (b.useFor.defaultClientSite) {
				if (defaultConneted) 
					throw new Error403('Cannot have multiple endpoints using useFor.defaultClientSite');

				defaultConneted = b;
			}

			// fix stock locations
			if (b.additionalStockLocation) {
				if (b.additionalStockLocation.useAll !== true)
					delete b.additionalStockLocation.useAll

				// remove if empty
				if (b.additionalStockLocation.orderedIds) {
					if (b.additionalStockLocation.orderedIds.length)
						b.additionalStockLocation.orderedIds = ObjectUtils.removeDuplicates(b.additionalStockLocation.orderedIds)
					else 
						delete b.additionalStockLocation.orderedIds;
				}

				if (!Object.keys(b.additionalStockLocation).length)
					delete b.additionalStockLocation;
			}
		}

		// esnure the root config is present
		const setts = await SyncConfigService.getConfigByReqOrSlug(req);

		// ensure that the external ids has not been deleted
		const dbIds = setts.externalConnections ? setts.externalConnections.map(e => e._id) : [];
		for (const id of dbIds)
			if (!body.some(b => b._id === id))
				throw new Error409('Cannot remove external connection, only add or disable');

		// reassign undefined auth as we removed on GEt
		for (const b of body) {
			if (!b.auth) {
				const relative = setts.externalConnections?.find(i => i._id === b._id);
				if (relative) 
					b.auth = relative.auth;
			}
		}

		await SyncConfigService.updatExtEndpoints(req, body);
	}

}
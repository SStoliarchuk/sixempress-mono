import to from "await-to-js";
import { RequestHelperService, Error403, CustomExpressApp } from "@sixempress/main-be-lib";
import multer, { Multer } from "multer";
import { AxiosError } from 'axios';
import { Request } from 'express';
import { BePaths, ErrorCodes } from "@sixempress/external-sync";
import { ExternalSyncUtils } from "@sixempress/external-sync";
import { RawFileGet, RawFileInfo, RawFilesUploadStatus } from "./raw-files.dtd";
import { WPRawFilesService } from "./wordpress/wp-raw-files.service";
// import { ProprietaryRawFileNode } from './proprietary/raw-file-node';
import { log } from "@sixempress/external-sync";
import { ExternalConnectionType, ExternalConnection } from "@sixempress/be-multi-purpose";

export class RawFilesService {

	/**
	 * The multer instance to use for loading files
	 */
	private static multer: Multer;


	/**
	 * Allows to get/post raw files to the remote connections
	 * @param app 
	 */
	public static start(app: CustomExpressApp, uploadBaseURI: string) {

		RawFilesService.multer = multer();

		app.use((req, res, next) => {
			RequestHelperService.parseQueryStrings(req);
			next();
		});

		app.options('/' + BePaths.rawfiles + '*', (req, res) => {
			res.sendStatus(200);
		});

		app.get('/' + BePaths.rawfilesgetuploadendpoint, RequestHelperService.safeHandler(async (req, res) => {
			return {endpoint: uploadBaseURI};
		}));

		app.get('/' + BePaths.rawfiles + ':externalConnectionId', RequestHelperService.safeHandler(async (req, res) => {
			const [e, d] = await to(RawFilesService.handleRawFileGet(req, req.params.externalConnectionId));
			if (e) 
				return ExternalSyncUtils.createExternalRequestError(e);

			res.setHeader('X-Filtered-Count', d.total);
			res.setHeader('Access-Control-Expose-Headers', 'X-Filtered-Count');
			res.send(d.items);
		}));

		app.post('/' + BePaths.rawfiles, RawFilesService.multer.any(), RequestHelperService.safeHandler(async (req, res) => {
			const [e, d] = await to(RawFilesService.handleRawFileUpload(req));
			if (e) 
				return ExternalSyncUtils.createExternalRequestError(e);

			res.send(d);
		}));

		app.post('/' + BePaths.rawfiles + ':externalConnectionId', RawFilesService.multer.any(), RequestHelperService.safeHandler(async (req, res) => {
			const [e, d] = await to(RawFilesService.handleRawFileUpload(req, req.params.externalConnectionId));
			if (e) 
				return ExternalSyncUtils.createExternalRequestError(e);

			res.send(d);
		}));

		app.delete('/' + BePaths.rawfiles + ':externalConnectionId', RequestHelperService.safeHandler(async (req, res) => {
			const [e, d] = await to(RawFilesService.handleFileDelete(req, req.params.externalConnectionId));
			if (e) 
				return ExternalSyncUtils.createExternalRequestError(e);

			res.send(d);
		}));

	}

	/**
	 * Returns info about the rawfiles present in an external connection
	 */
	private static async handleRawFileGet(req: Request, extConnId?: string): Promise<RawFileGet> {
		if (!extConnId) throw new Error403('Missing query parameter "externalConnectionId"');

		const ec = (await ExternalSyncUtils.getExternalConnections(req, ['rawFiles'])).find(e => e._id === extConnId);
		if (!ec) throw new Error403('Given "externalConnectionId" is not present in the system');

		switch (ec.type) {
			case ExternalConnectionType.wordpress:
				return WPRawFilesService.getData(req, ec);

			// case ExternalConnectionType.rawfileservernode:
			// 	return ProprietaryRawFileNode.getData(req, ec);

			default:
				return { items: [], total: 0 };
		}
	}

	/**
	 * Uploads raw files to one of the connected external endpoints
	 */
	private static async handleRawFileUpload(req: Request, forceExtConnId?: string): Promise<RawFilesUploadStatus> {
		if (!req.files || req.files.length === 0) {
			return {data: {}, externalConnectionId: ''};
		}

		// get all the endpoints usable as media storage
		let ecs = await ExternalSyncUtils.getExternalConnections(req, ['rawFiles']);

		if (forceExtConnId)
			ecs = ecs.filter(ec => ec._id === forceExtConnId);

		if (ecs.length === 0)
			throw new Error403({ code: ErrorCodes.noEndpointsCanBeUsedForRawFiles, message: 'No endpoints usable as media storage are present' });


		// try all the endpoins for at least 1 successful post
		const errors = [];

		// try all the functions
		const fns: Array<((req: Request, ecs: ExternalConnection[], files: Express.Multer.File[]) => Promise<RawFilesUploadStatus>)> = [
			// ProprietaryRawFileNode.sendData,
			WPRawFilesService.sendData,
		];
		for (const f of fns) {
			const [e, d] = await to<RawFilesUploadStatus, any>(f(req, ecs, req.files as Express.Multer.File[]));
			if (e) { Array.isArray(e) ? errors.push(...e) : errors.push(e); continue; }

			// succes so we return
			if (d)
				return d;
		}

		// if no errors, then all the enpoints that are configured, are not implemented in the code
		if (!errors.length) {
			throw new Error403({ code: ErrorCodes.rawFilesEndpointsNotImplemented, message: 'No configured endpoints are currently supported' });
		}
		// oof
		else {
			// remove body sent as to not have a giant log
			// and remove x-api-key for sensitive data
			for (let i = 0; i < errors.length; i++) {
				// TODO remove this log?
				log('SEND_DATA_REMOTE_ERROR', errors[i]);
				if ((errors[i] as AxiosError).response && (errors[i] as AxiosError).response.data)
					errors[i] = (errors[i] as AxiosError).response.data;
				else if (errors[i] instanceof Error)
					errors[i] = {name: (errors[i] as Error).name, message: (errors[i] as Error).message, stack: (errors[i] as Error).stack}
			}

			throw new Error403({ code: ErrorCodes.allExternalMediaStorageEndpoinsErrored, message: 'No endpoints connected can be used as external storage', data: errors });
		}

	}

	/**
	 * Deletes the given ids for the external connection
	 */
	private static async handleFileDelete(req: Request, extConnId?: string): Promise<void> {
		if (!extConnId) throw new Error403('Missing query parameter "externalConnectionId"');

		const ec = (await ExternalSyncUtils.getExternalConnections(req, ['rawFiles'])).find(e => e._id === extConnId);
		if (!ec) throw new Error403('Given "externalConnectionId" is not present in the system');

		const body: {ids: (number | string)[]} = req.body;
		if (!body || !body.ids || !Array.isArray(body.ids))
			throw new Error403('The Body should be {ids: (number | string)[]}');

		switch (ec.type) {
			case ExternalConnectionType.wordpress:
				return WPRawFilesService.deleteData(req, ec, body.ids);

			// case ExternalConnectionType.rawfileservernode:
			// 	return ProprietaryRawFileNode.deleteData(req, ec, body.ids);

			default:
				return;
		}

	}

}
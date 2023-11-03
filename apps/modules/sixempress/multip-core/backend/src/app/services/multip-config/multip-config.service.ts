import { CustomExpressApp, RequestHelperService, SysConfigurationType, Error403, Error409, SysConfigurationObjectController, AuthHelperService } from '@sixempress/main-be-lib';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { Request } from 'express';
import { ContentController, IBMultiPurposeConfig } from './multip-config.dtd';
import { Attribute } from '../../utils/enums/attributes.enum';

export class MultipConfigService {

	private static collConetnt = new SysConfigurationObjectController<IBMultiPurposeConfig>(SysConfigurationType.MultiPSystemContentConfig);

	/**
	 * Create express paths that requries authenticated users
	 */
	public static initAuthPaths(app: CustomExpressApp) {

		// content
		app.get('/' + BePaths.multipsysteminfocontent, RequestHelperService.safeHandler(async (req, res) => {
			return MultipConfigService.collConetnt.findOne(req, {});
		}));
		app.put('/' + BePaths.multipsysteminfocontent, AuthHelperService.requireAttributes(Attribute.changeSystemContentConfig), RequestHelperService.safeHandler(async (req, res) => {
			await MultipConfigService.setMultipContent(req);
		}));
	}

	/**
	 * Changes only the users content
	 */
	private static async setMultipContent(req: Request) {
		const body = req.body;
		if (!body) 
			throw new Error403('No body given');

		const errs = new ContentController().verifyObject(body);
		if (errs)
			throw new Error403(errs);

		// update the content
		await MultipConfigService.collConetnt.upsert(req, body);
	}


}


		
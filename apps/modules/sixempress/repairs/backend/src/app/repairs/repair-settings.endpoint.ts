import { Request } from 'express';
import { CustomExpressApp, RequestHelperService, Error403, SysConfigurationObjectController, AuthHelperService, SysConfigurationObject } from '@sixempress/main-be-lib';
import { BePaths } from '../../enums/bepaths.enum';
import { Attribute } from '../../enums/attributes.enum';

const Repair__sysConfigObjectType = 'sxmp_repairs_config_object'

export interface ISxmpRepairsSettings extends SysConfigurationObject {
	__sysConfigObjectType: typeof Repair__sysConfigObjectType;

  entrancePdf?: {
    title?: string,
    logo?: any,
    infoRows?: string,
    disclaimer?: string,
  },
  interventPdf?: {
    title?: string,
    logo?: any,
    infoRows?: string,
    disclaimer?: string,
  },
}


export class RepairSettingsEndpoint {

	private static collConetnt = new SysConfigurationObjectController<ISxmpRepairsSettings>(Repair__sysConfigObjectType);

	/**
	 * Create express paths that requries authenticated users
	 */
	public static initAuthPaths(app: CustomExpressApp) {

		// content
		app.get('/' + BePaths.repairsettingsinfo, RequestHelperService.safeHandler(async (req, res) => {
			return RepairSettingsEndpoint.collConetnt.findOne(req, {});
		}));
		app.put('/' + BePaths.repairsettingsinfo, AuthHelperService.requireAttributes(Attribute.changeRepairPdfInfo), RequestHelperService.safeHandler(async (req, res) => {
			await RepairSettingsEndpoint.updateSettings(req);
		}));
	}

	/**
	 * Changes only the users content
	 */
	private static async updateSettings(req: Request) {
		const body = req.body;
		if (!body) 
			throw new Error403('No body given');

		// update the content
		await RepairSettingsEndpoint.collConetnt.upsert(req, body);
	}


}


		
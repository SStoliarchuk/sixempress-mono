import { AuthHelperService, BusinessLocation, Error403, Error422, IVerifiableItemDtd, LocationsData, ObjectUtils, RequestHelperService, SysConfigurationObjectController, VerifiableObject, __sysConfigObjectType_LocationsData } from "@sixempress/main-be-lib";
import type { Request, Express } from 'express';
import { Attribute, BePaths } from "../../enums";

export class BusinessLocationsService {

	private static coll = new SysConfigurationObjectController<LocationsData>(__sysConfigObjectType_LocationsData);

	/**
	 * Create express paths that requries authenticated users
	 */
	public static start(app: Express) {
		// data should always be present as it's a prerequisite for login
		// TODO add if check and error ?
		app.get('/' + BePaths.locationsdata, RequestHelperService.safeHandler(async (req, res) => {
			return BusinessLocationsService.getLocationsData(req);
		}));

		app.put('/' + BePaths.locationsdata, AuthHelperService.requireAttributes(Attribute.modifyLocationsData), RequestHelperService.safeHandler(async (req, res) => {
			return BusinessLocationsService.replace(req, req.body);
		}));
	}

	public static getLocationsData(req: Request): Promise<LocationsData | undefined> {
		return BusinessLocationsService.coll.findOne(req, {});
	}

	public static async createFirstLocationsData(req: Request): Promise<void> {
		const data: LocationsData = {
			__sysConfigObjectType: __sysConfigObjectType_LocationsData,
			locations: [{isActive: true, name: 'Location 0'}],
			documentLocationsFilter: ['*'],
		};

		await BusinessLocationsService.replace(req, data);
	}

	public static async replace(req: Request, body: LocationsData) {
		const errs = new LocationsConfingController().verifyObject(body);
		if (errs)
			throw new Error422(errs);

		// check with existing data
		const previous = await BusinessLocationsService.coll.findOne(req, {});
		if (previous) {
			body._id = previous._id;

			// check locations to not be deleted as to not reference wrong info
			if (!ObjectUtils.areArraysEqual(
				body.locations.slice(0, previous.locations.length).map(l => l._id),
				previous.locations.map(l => l._id)
			))
				throw new Error403('A SoftwareInstance location cannot change it\'s "_id" or be removed, only deactivated');
		}

		// assign ids to locations if not present
		// and check uniqueness
		const allLocsId = [];

		for (let i = 0; i < body.locations.length; i++) {
			const l = body.locations[i];
			l._id = l._id || (i + 1).toString();

			if (allLocsId.includes(l._id))
				throw new Error403('"LocationsData.locations.[N]._id" has to be unique')

			allLocsId.push(l._id.toString());
		}


		await BusinessLocationsService.coll.upsert(req, body);
	}

}


export class LocationsConfingController extends VerifiableObject<LocationsData> {
	protected getDtd(): IVerifiableItemDtd<LocationsData> {
		return {
			locations: { type: [Array], required: true, minArrN: 1, arrayDef: { type: [Object], objDef: [{
				isActive: { type: [Boolean], required: true },
				name: { type: [String], required: true },
				address: { type: [String], required: false },
				coordinates: { type: [String], required: false },
				isForStorageOnly: { type: [Boolean], required: false, possibleValues: [true] },
			}] } },
		}
	}
}
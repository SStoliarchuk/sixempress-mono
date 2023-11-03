import { IBaseModel } from "../object-format-controller/IBaseModel.dtd";
import { SysConfigurationObject } from "../utils/sys-configuration-object/sys-configuration-object.dtd";

export interface TokenData extends GenerateTokenData {
}

export interface GenerateTokenData {
	userId: string,
  locs: string[],
  alllocs?: string[],
  att: (string | number)[],
}

export const __sysConfigObjectType_LocationsData = 'sxmp_labac_conf_locations_data';

export interface LocationsData extends IBaseModel, SysConfigurationObject {

  __sysConfigObjectType: typeof __sysConfigObjectType_LocationsData;

  /**
	 * All the locations of a given business
	 */
	locations: BusinessLocation[];
}

export interface BusinessLocation {
	/**
		 * A custom id for the location
		 */
	_id?: string,
	/**
	 * If the locations is still active
	 * instead of deleting a location, turn this off
	 * this is to keep the tracking of the items correct
	 * and the "fetching" and so on
	 */
	isActive: boolean,
	/**
	 * The name of the location show in the UI
	 */
	name: string;
	/**
	 * An optional address that sometimes will be used in the UI (for example in the topbar)
	 */
	address?: string;
	/**
	 * The coordinates should be xx.xxxxx xx.xxxxx
	 * so we can plug them into maps
	 */
	coordinates?: string;
	// /**
	//  * A flag that signals that the location is used only to keep track of items,
	//  * it is not chosable from the FE
	//  * 
	//  * (is it useless ? probably)
	//  * (TODO calculate the uselessness)
	//  */
	// isForStorageOnly?: true
	// type: BusinessLocationType;
}

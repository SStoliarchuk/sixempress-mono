import { FetchableField } from "libs/main-be-lib/src/object-format-controller/fetchable-field";
import { SysConfigurationObject } from "libs/main-be-lib/src/utils/sys-configuration-object/sys-configuration-object.dtd";
import { IBaseModel } from "../../../object-format-controller/IBaseModel.dtd";
import { LibModelClass } from '../../../utils/enums';
export {};
// export interface BusinessLocation {
// 	/**
// 		 * A custom id for the location
// 		 */
// 	_id?: string,
// 	/**
// 	 * If the locations is still active
// 	 * instead of deleting a location, turn this off
// 	 * this is to keep the tracking of the items correct
// 	 * and the "fetching" and so on
// 	 */
// 	isActive: boolean,
// 	/**
// 	 * The name of the location show in the UI
// 	 */
// 	name: string;
// 	/**
// 	 * An optional address that sometimes will be used in the UI (for example in the topbar)
// 	 */
// 	address?: string;
// 	/**
// 	 * The coordinates should be xx.xxxxx xx.xxxxx
// 	 * so i can plug them into google maps :D
// 	 */
// 	coordinates?: string;
// 	// /**
// 	//  * A flag that signals that the location is used only to keep track of items,
// 	//  * it is not chosable from the FE
// 	//  * 
// 	//  * (is it useless ? probably)
// 	//  * (TODO calculate the uselessness)
// 	//  */
// 	// isForStorageOnly?: true
// 	// type: BusinessLocationType;
// }

// export const SoftwareInstance__sysConfigObjectType = 'root_software_instance';

// /**
//  * This object is the central object of the system
//  * when the client enters system code, it is a reference to this object
//  */
// export interface SoftwareInstance extends IBaseModel, SysConfigurationObject {

// 	__sysConfigObjectType: typeof SoftwareInstance__sysConfigObjectType;

// 	/**
// 	 * Name of the store/activity for the instace
// 	 */
// 	name: string;

// 	// /**
// 	//  * Server-Node which stores the customer data
// 	//  */
// 	// server: FetchableField<ModelClass.ServerNode, ServerNode>,

// 	/**
// 	 * Administrators and/or owners of the instance
// 	 */
// 	admins: any[],

// 	/**
// 	 * The slug is used for user frendly IDS
// 	 * @readonly
// 	 */
// 	slug: string;

// 	/**
// 	 * The login slug to use for when the user is loggin in to the app instead of the normal slug
// 	 * when the category of the business is 1
// 	 * this string HAS to be equal to the slug
// 	 */
// 	loginSlug: string;

// 	/**
// 	 * When the server will expire
// 	 * either a date in unix timestamp
// 	 * or false to signal that it will never expire
// 	 */
// 	expires: number | false;

// 	/**
// 	 * All the locations of a given business
// 	 */
// 	locations: BusinessLocation[];
// }

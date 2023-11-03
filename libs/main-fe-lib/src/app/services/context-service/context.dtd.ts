import { ConnectorConfiguration } from "@stlse/frontend-connector";
import { ComponentType } from "react";
import { BusinessCategory } from "../../utils/enums/default-enums.enum";
import { AbstractDbItemController } from "../controllers/abstract-db-item.controller";
import { IBaseModel } from "../controllers/controllers.dtd";
import { FetchableField } from "../controllers/dtd";

export interface Environment {
	/**
	 * endpoint for the control server with trailing slash
	 * EXAMPLE: https://api.control.sixempress.com/
	 */
	controlApi: string,

	hooks: ConnectorConfiguration['hooks'],

	environment: 'production' | 'test' | 'local',

	stlseApi: string,

	/**
	 * The setup object passed to configure the library
	 */
	// libSetup?: ILibConfig,
}

export interface AuthResponse {
	/**
	 * The business object relative to the system
	 */
	business: SoftwareInstance,
	/**
	 * The user object from the BE
	 */
	user: any,
	/**
	 * authentication token for the server-node
	 */
	auth: string,
	/**
	 * authorization token for the server-node
	 */
	authz: string,
}


export interface AuthTokens {
	control?: {
		apiKey?: string,
		tokenAuth?: DecodedAuthToken,
		tokenAuthz?: DecodedAuthzToken,
	},
	client?: {
		apiKey?: string,
		tokenAuth?: DecodedAuthToken,
		tokenAuthz?: DecodedAuthzToken,
	}
}

export interface DecodedAuthToken {
	__string: string,
	iss: number;
	exp: number | false;
	slug: string;
	sub: string;
}

export interface DecodedAuthzToken {
	__string: string,
	iss: number;
	exp: number | false;
	slug: string;
	user: {
		_id: string,
		locs: string[]
		att: (number | string)[],
		name: string,
	};
}

export interface Configuration {
	/**
	 * endpoint for the specific user server where to send request with trailing slash
	 * EXAMPLE: https://be-server-1.sixempress.com/
	 */
	clientApi?: string,

	/**
	 * The slug of the client
	 */
	slug?: string,

}

/**
 * This object is the central object of the system
 * when the client enters system code, it is a reference to this object
 */
export interface SoftwareInstance extends IBaseModel {

	/**
	 * Name of the store/activity for the instace
	 */
	name: string;

	/**
	 * Server-Node which stores the customer data
	 */
	// server: FetchableField<ServerNode>,

	/**
	 * Administrators and/or owners of the instance
	 */
	admins: FetchableField<{}>[],

	/**
	 * The slug is used for user frendly IDS
	 * @readonly
	 */
	// slug: string;

	/**
	 * The login slug to use for when the user is loggin in to the app instead of the normal slug
	 * when the category of the business is 1
	 * this string HAS to be equal to the slug
	 */
	// loginSlug: string;

	/**
	 * When the server will expire
	 * either a date in unix timestamp
	 * or false to signal that it will never expire
	 */
	expires: number | false;

	/**
	 * All the locations of a given business
	 */
	locations: BusinessLocation[];
}


/**
 * The possible locations for abusiness
 */
export interface BusinessLocation {
	/**
	 * A custom id for the location
	 */
	_id: string,
	
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
	 * so i can plug them into google maps :D
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


export interface ServerNode extends IBaseModel {
	/**
	 * url where to contact the server to pass to the front end
	 * it should be an https:// server not an ip server
	 * as this address will be used by the user in the browser
	 * 
	 * regex: /^https:\/\//
	 */
	endpoint: string;
	
	/**
	 * the public certificate of the server, 
	 * each server should have its own unique pair obviously,
	 * 
	 * this is used to verify the sign of the server
	 */
	publicCert: string;
}

/**
 * The Business Configuration DTD
 * This interface is the dtd that you recive when requesting systemconfiguration
 */
export interface Business extends IBaseModel {
	name: string;

	/**
	 * The category of the business (the sub domain)
	 */
	category: number;

	
	/**
	 * All the locations of a given business
	 */
	locations: BusinessLocation[];
}



//
//
// TODO REFACTOR BELOW THIS LINE
//
//



export declare type ILibEnvConf = {
	category: BusinessCategory,
	customCategorySystemSlug?: string,
	apiUrl: string,
	envName: 'local' | 'test' | 'production',
	stlseApi: string,
	hooks: ConnectorConfiguration['hooks'],
} | {
	category: BusinessCategory.custom,
	showLoginSlug?: boolean,
	customCategorySystemSlug?: string,
	apiUrl: string,
	envName: 'local' | 'test' | 'production',
	stlseApi: string,
	hooks: ConnectorConfiguration['hooks'],
};

/**
 * The configuration object used to initialize the library
 */
export interface ILibConfig {

	controllers?: (typeof AbstractDbItemController)[],
	// navbarRoutes: IAvailableRoute[];
	// appRoutes: RouteDeclaration[];
	loginPage?: ComponentType<any>,

	topLevelJsx?: JSX.Element[],
	menuVoices?: {title: string, onClick: (e: React.MouseEvent<any>) => void}[],

	/**
	 * List of settings for the library
	 * accessible in the top right menu
	 */
	settingsPages?: (ComponentType<any>)[];

	loginPagePath: string;
	error401Path: string;

	/**
	 * This callback is triggered when the user logs into the system, 
	 * if async will wait for completion before changing the users path
	 * 
	 * useful for additional system configuration build
	 */
	onLogin?: () => void | Promise<void>;
	/**
	 * This callback is triggered when the user logs out of the system
	 */
	onLogout?: () => void;

	onLibLoaded?: () => void,
}

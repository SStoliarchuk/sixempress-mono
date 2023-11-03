import { BusinessLocation, FetchableField, MediaFile, BusinessLocationsService, } from "@sixempress/main-fe-lib";
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

/**
 * The different types of multi-purpose
 */
export enum BusinessType {
	custom = 1,
	repairs,
	retailShop,
	restaurants,
	hairdresser
}

export enum BusinessTypeLabel {
	"Personalizzato" = BusinessType.custom,
	"Negozio al Dettagio" = BusinessType.retailShop,
	"Centro Riparazioni" = BusinessType.repairs,
	"Parrucchiere" = BusinessType.hairdresser,
	"Ristorazione" = BusinessType.restaurants,
}

export interface ExternalConnectionConfig {
	externalConnections?: ExternalConnection[],
};


export enum ExternalConnectionType {
	custom = 1,
	wordpress,
	rawfileservernode,
	addons,
}

export interface ExternalConnection {
	/**
	 * Unique Id for this connection, used to match the _metadata ids etc
	 */
	_id?: string,
	/**
	 * Disable the sync to this connection, or we can use this field as a request from outside to enable this connection
	 * 
	 * for example when we configure the plugin in wordpress, we create an external conneciton here that is disabled
	 * and requires the user to manually enable it
	 */
	isDisabled?: boolean;
	/**
	 * The type of the connection is used to generate appropriate dto to send
	 */
	type: ExternalConnectionType,
	
	/**
	 * The auth type to use
	 */
	auth: {
		type: 'apikey' /* | 'oauth' */,
		apiKey: string
	},
	/**
	 * An UI name for the connection in case the connection is not associated to a location
	 */
	name: string,
	/**
	 * Whether the connection is related to a location of the system
	 */
	locationId?: string,
	/**
	 * Where to take additional stock quantinties for products
	 */
	additionalStockLocation?: {
		/**
		 * Ordered ids of which to first take the items from
		 * 
		 * ENSURE THAT EACH ID IS UNIQUE AND THERE ARE NO DUPLICATES BEFORE SAVING
		 * AS IT IS USED TO CALCULATE STOCK IN A FOR LOOP @ getTotalStockForRemote
		 */
		orderedIds?: string[],
		/**
		 * Use all of the rest of the available locations if the ordered are not present ore exausted
		 */
		useAll?: true,
	},
	/**
	 * remote base origin to know what is the target
	 */
	originUrl: string,
	/**
	 * the use of the connection
	 */
	useFor: {
		/**
		 * Use this connection as the default client online site interface
		 * @note
		 * this option should be enable on only 1 connection at a time, not multiple
		 */
		defaultClientSite?: true;
		/**
		 * Post updates from local crud update to remote server
		 */
		crudFromLocal?: true,
		/**
		 * Accept crud requests from remote to change local data
		 */
		crudFromRemote?: true,
		/**
		 * Use to push rawfiles
		 */
		rawFiles?: true,
	}
}


export interface IBMultiPurposeConfig {
	
	logo?: FetchableField<MediaFile>;
	
	pdfInfo?: {
		infoRows?: string,
		disclaimer?: string,

		customerOrder?: {
			title?: string,
			logo?: FetchableField<MediaFile>,
			infoRows?: string,
			disclaimer?: string,
		},
	};

	receiptInfo?: {
		logo?: FetchableField<MediaFile>;
		infoRows?: string;
		availableWarrancies?: string[];
	};

}

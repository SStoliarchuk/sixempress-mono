import { SysConfigurationObject, FetchableField, IVerifiableItemDtd, IDtdTypes, VerifiableObject, IBaseModel, BusinessLocation, SysConfigurationType } from "@sixempress/main-be-lib";
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';

export interface MediaFile extends IBaseModel {
	content: string;
	type: MediaFileType;
	name: string;
	isContentRaw?: true;
	mimeType?: string;
	extension: string;	
}

export enum MediaFileType {
	genericFile = 1,
	image,
	video,
	pdf,
	text,
}

export interface IBMultiPurposeConfig extends SysConfigurationObject {
	
	logo?: FetchableField<ModelClass.MediaFile, MediaFile>;
	
	pdfInfo?: {
		infoRows?: string,
		disclaimer?: string,

		entrancePdf?: {
			logo?: FetchableField<ModelClass.MediaFile, MediaFile>,
			infoRows?: string,
			disclaimer?: string,
			
			title?: string,
		},
		
		interventPdf?: {
			logo?: FetchableField<ModelClass.MediaFile, MediaFile>,
			infoRows?: string,
			disclaimer?: string,
			
			title?: string,
			interventTitle?: string,
		}
	};

	receiptInfo?: {
		logo?: FetchableField<ModelClass.MediaFile, MediaFile>;
		infoRows?: string;
		
		availableWarrancies?: string[];
	};

}

export interface ExternalConnectionConfig extends SysConfigurationObject {
	__sysConfigObjectType: SysConfigurationType.external_connection_config;
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

export interface ExternalConnectionRequest {
	slug: string,
	originUrl: string,
	type?: 'addons',
	// loginSlug: string,
	// username: string,
	// password: string,
	// originUrl: string,
};

export class ExternalConnectionController extends VerifiableObject<ExternalConnection> {

	getDtd(): IVerifiableItemDtd<ExternalConnection> {
		return {
			_id: {type: [String], required: false},
			
			type: {type: [Number], required: true, possibleValues: Object.values(ExternalConnectionType).filter(i => typeof i === 'number')},
			
			isDisabled: {type: [Boolean], required: false},

			// false as later they should be replace by the back end as the user will never see the auth on GEt
			auth: {type: [Object], required: false, objDef: [{
				apiKey: {type: [String], required: true},
				type: {type: [String], required: true, possibleValues: ['apikey']},
			}]},
			
			name: {type: [String], required: true},
			locationId: {type: [String], required: false},

			additionalStockLocation: {type: [Object], required: false, objDef: [{
				useAll: {type: [Boolean], required: false, possibleValues: [true]},
				orderedIds: {type: [Array], required: false, arrayDef: {type: [String]}},
			}]},

			// ensure the origin url start with http
			// otherwise if we have something like "url" withouth the "http://" protocol
			// then every requests to that endpoint takes a lot of time
			// and errors with socket hangup
			// meanwhile if http://quack, it errors immediately :]
			//
			//  Disable regex for now as we have the addons softwae using this
			originUrl: {type: [String], required: true, /* regExp: /^https?:\/\// */},

			useFor: {type: [Object], required: true, objDef: [{
				defaultClientSite: {type: [Boolean], required: false},
				crudFromLocal: {type: [Boolean], required: false},
				crudFromRemote: {type: [Boolean], required: false},
				rawFiles: {type: [Boolean], required: false},
			}]}
		}
	}

}

export class ContentController extends VerifiableObject<IBMultiPurposeConfig> {

	getDtd(): IVerifiableItemDtd<IBMultiPurposeConfig> {
		return {
			// TODO add the mediafile fetching
			logo: { type: [Object], required: false, objDef: [{
				id: { type: [String], required: true, },
				modelClass: { type: [String], required: true, possibleValues: [ModelClass.MediaFile] },
				fetched: { type: ['any'], required: false },
			}] },

			pdfInfo: { type: [Object], required: false, objDef: [{
				infoRows: { type: [String], required: false, },
				disclaimer: { type: [String], required: false, },

				entrancePdf: { type: [Object], required: false, objDef: [{
					// logo: FetchableField.getFieldSettings(ModelClass.MediaFile, false),
					infoRows: { type: [String], required: false, },
					disclaimer: { type: [String], required: false, },
					title: { type: [String], required: false, },
				}], },

				interventPdf: { type: [Object], required: false, objDef: [{
					// logo: FetchableField.getFieldSettings(ModelClass.MediaFile, false),
					infoRows: { type: [String], required: false, },
					disclaimer: { type: [String], required: false, },
					title: { type: [String], required: false, },
					interventTitle: { type: [String], required: false, },
				}], }
			}] },

			receiptInfo: { type: [Object], required: false, objDef: [{
				// logo: FetchableField.getFieldSettings(ModelClass.MediaFile, false),
				infoRows: { type: [String], required: false, },
				availableWarrancies: { type: [Array], required: false, arrayDef: { type: [String] } }
			}] },
		}
	}

}

export class ExternalConnectionRequest extends VerifiableObject<ExternalConnectionRequest> {

	getDtd(): IVerifiableItemDtd<ExternalConnectionRequest> {
		return {
			originUrl: {type: [String], required: true},
			type: {type: [String], required: false, possibleValues: ['addons']},
		}
	}

}
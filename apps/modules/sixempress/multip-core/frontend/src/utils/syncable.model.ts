import { ExternalConnection } from "apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd";
import { ContextService, IBaseModel, IMongoProjection } from "@sixempress/main-fe-lib";
import { AuthService } from "@sixempress/abac-frontend";

/**
 * The projections that have to be present to check if a model comes from remote
 */
export function modelFromRemoteProjections(): IMongoProjection<SyncableModel> {
	return {'_created._author.id': 1, '_metaData._externalIds.0._': 1};
}

/**
 * Checks if a model was created by remote
 */
export function isModelCreatedFromRemote(m: SyncableModel): boolean {
	return Boolean(AuthService.SERVER_TASK_OBJECT_ID.includes(m._created._author.id) && m._metaData?._externalIds?.length);
}

export interface SyncableModel extends IBaseModel {

	/**
	 * This field is modifiable by the user to allow to fine tune the external connections
	 */
	externalSync?: {
		/**
		 * The array of enabled connections
		 */
		disabled?: Array<{
			/**
			 * The external connection id
			 */
			id: string,
		}>

	};

	/**
	 * contains various infos
	 */
	_metaData?: {
		
		/**
		 * This array contains the info of the ids of the items synced to this one on other systems
		 * it works only with locationId, so an external system cannot be anonymous
		 */
		_externalIds?: Array<{
		
			/**
			 * this is the field present in MultiConfig.dtd.ts
			 * 
			 * it is used to uniquely identify a external id
			 */
			_externalConnectionId: ExternalConnection['_id'],

			/**
			 * Fields that are specific to that external connection
			 */
			_additional?: {
				/**
				 * this field is always present if the id is from woocommerce
				 * if the product is simple, this value is the id of the product itself so externalIds._id
				 * 
				 * if the product is a variable this value is the parent of the variable product
				 */
				_wooProductGroupId?: number
			};

			/**
			 * we support string and ids, as this field is not really used anywhere
			 */
			_id: string | number,
			
		}>

	};

}
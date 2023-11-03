import { IBaseModel } from "./IBaseModel.dtd";

export interface SyncableModel extends IBaseModel {

	/**
	 * This field is modifiable by the user to allow to fine tune the external connections
	 */
	externalSync?: {
		/**
		 * The array of disabled connections
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
			 * we support string and ids, as this field is not really used anywhere
			 */
			_id: string | number,
		
			/**
			 * this is the field present in MultiConfig.dtd.ts
			 * 
			 * it is used to uniquely identify a external id
			 */
			_externalConnectionId: string,

			/**
			 * Fields that are specific to that external connection
			 */
			_additional?: {
				/**
				 * this field is always present if the id is from woocommerce
				 * if the product is simple, this value is the id of the product itself
				 * 
				 * if the product is a variable this value is the parent of the variable product
				 * 
				 * It is called "woo" because it was generated for woo but let's use it for all :)
				 */
				_wooProductGroupId?: number,
			};
			
		}>

	};

}
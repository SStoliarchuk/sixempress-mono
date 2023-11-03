import { IBaseModel, FetchableField } from "@sixempress/main-fe-lib";


export interface TrackableVariation extends IBaseModel {
	
	/**
	 * The id unique to all the variation of a model
	 */
	_trackableGroupId?: string;

	/**
	 * The data that is equal between all the variation
	 */
	groupData: object;

	/**
	 * The data that is unique to a variation
	 */
	variationData: object;

	/**
	 * This object contains data that is relative to a variation that does not trigger a new
	 * model creation
	 */
	infoData?: object;

}

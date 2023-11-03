import { IBaseModel, FetchableField, IDeletedCreatedData } from '@sixempress/main-be-lib';
import { ModelClass } from '../../utils/enums/model-class.enum';

/**
 * There should not be two trackable models with the same variationData
 * no trackable variation model has to be deleted from the BE, when you patch/put a model
 * it searches for an equal variationData objec in the be, if it finds it, it doesnt create a new model
 * but restores the old model, and if it doesnt find it, it creates a new model
 */
export interface TrackableVariation<T extends ModelClass> extends IBaseModel {

	/**
	 * we use this for multi model items as to know when the whole group was deleted
	 */
	_groupDeleted?: IDeletedCreatedData;

	/**
	 * The id unique to all the variation of a model
	 */
	_trackableGroupId?: string;

	/**
	 * The data that is equal between all the variation
	 */
	groupData?: object;

	/**
	 * The data that is unique to a variation
	 */
	variationData?: object;

	/**
	 * This object contains data that is relative to a variation that does not trigger a new
	 * model creation
	 */
	infoData?: object;

}

export interface MultipleModelTrackableVariation<M extends ModelClass, T extends TrackableVariation<M>> extends TrackableVariation<M> {

	/**
	 * The array of single items
	 */
	models: T[];

}
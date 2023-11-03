import { BusinessLocation, IBaseModel } from '@sixempress/main-fe-lib';

export type { BusinessLocation };

export interface LocationsData extends IBaseModel {
  /**
	 * All the locations of a given business
	 */
	locations: BusinessLocation[];
}

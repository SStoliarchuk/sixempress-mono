import { SyncableModel } from "apps/modules/sixempress/multip-core/frontend/src/utils/syncable.model";
import { Product } from "./Product";

export interface ProductGroup extends SyncableModel {
	_id?: string;
	_totalAmount?: number;
	_approximateTotalAmount?: number;
	_trackableGroupId?: string;
	documentLocationsFilter: string[];

	groupData: Product['groupData'];
	variationData?: Partial<Product['variationData']>
	infoData?: Partial<Product['infoData']>

	models: Product[];

}

import { IBaseModel, FetchableField, } from '@sixempress/main-be-lib';
import { ModelClass } from '@sixempress/be-multi-purpose';

export interface UsedProduct extends IBaseModel {

	name: string;
	description?: string;
	barcode?: string;

	additionalInfo?: {
		imeiNumber?: string;
	};
	
	sellPrice: number;
	buyPrice: number;

	seller: FetchableField<ModelClass.Customer>;
	buyer?: FetchableField<ModelClass.Customer>;
	_sellTime?: number;
}

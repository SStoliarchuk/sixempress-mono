import { IBaseModel, FetchableField } from '@sixempress/main-fe-lib'
import { Customer } from "@sixempress/multi-purpose";

export interface UsedProduct extends IBaseModel {
	name: string;
	description?: string;
	barcode: string;
	
	additionalInfo?: {
		imeiNumber?: string;
	};

	sellPrice: number;
	buyPrice: number;

	seller: FetchableField<Customer>;
	buyer: FetchableField<Customer>;
	_sellTime: number;
}

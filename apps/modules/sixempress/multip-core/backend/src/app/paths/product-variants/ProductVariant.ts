import { IBaseModel } from '@sixempress/main-be-lib';

export enum ProductVarTypes {
	manual = 1,
	automatic,
	tags,
	category,
}

export interface ProductVariant extends IBaseModel {

	name: string;
	group?: string | number;
	// should i ?
	// usedTimes?: number;
	
	data: 
	{
		type: ProductVarTypes.category,
		// ids of the categories
		value: {name: string, id: string}[],
	} | 
	{
		type: ProductVarTypes.tags,
		value: string[],
	} |
	{
		type: ProductVarTypes.manual,
		value: string[];
	} | 
	{
		type: ProductVarTypes.automatic,
		value: {name: string, values: string[]}[]
	};


}

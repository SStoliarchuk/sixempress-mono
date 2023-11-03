import { IBaseModel } from '@sixempress/main-fe-lib';

export enum ProductVarTypes {
	'manual' = 1,
	'automatic',
	'tags',
	'category',
}

export enum ProductVarTypesLabel {
	'Varianti manuali' = ProductVarTypes.manual,
	'Varianti automatiche' = ProductVarTypes.automatic,
	'Tag Prodotto' = ProductVarTypes.tags,
	'Categorie Prodotto' = ProductVarTypes.category,
}

export interface ProductVariant extends IBaseModel {
	group?: string | number;
	
	name: string;
	data: 
	{
		type: ProductVarTypes.category,
		// ids of the categories
		value: {id: string, name: string}[],
	} | 
	{
		type: ProductVarTypes.tags,
		value: string[],
	} | 
	{
		type: ProductVarTypes.manual,
		value: string[],
	} | 
	{
		type: ProductVarTypes.automatic,
		value: {name: string, values: string[]}[]
	};


}

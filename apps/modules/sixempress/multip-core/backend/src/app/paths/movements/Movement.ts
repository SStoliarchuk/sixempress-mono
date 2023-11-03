import { IBaseModel, FetchableField, } from '@sixempress/main-be-lib';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { ProductAmountsField } from '../products/product-movements/ProductMovement';

export enum MovementDirection {
	input = 1,
	output,
	internalInput,
	internalOutput,
}

export enum MovementMedium {
	unspecified = 1,
	cash,
	card,
}

export interface Movement extends IBaseModel {
	date: number;
	description?: string;
	priceAmount: number;
	requireAttributeToSee?: true;
	
	direction: MovementDirection;
	medium: MovementMedium,
	
	// _additionalData should contain sale & prods | repairs | used-prods
	_additionalData?: {
		
		_sale?: FetchableField<ModelClass.Sale>,

		_saleableModel?: FetchableField<ModelClass>;
		
		_services?: Array<{ item: FetchableField<ModelClass.BusinessService>, amount: number, _price?: number}>;

		_products?: ProductAmountsField[],

		_usedProducts?: {
			_item: FetchableField<ModelClass.UsedProduct>,
			_price: number,
		}[],


	};
	
}

export interface MovementGraph {
	cashOut: number,
	cashIn: number,
	posIn: number,
	posOut: number,

	internalIn: number,
	internalOut: number,
}

export interface SplitReport {
	// [out, in]
	[modelClass: string]: [number, number],
	additional?: [number, number],
}

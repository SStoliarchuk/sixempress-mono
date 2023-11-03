import { AbstractDbApiItemController, IVerifiableItemDtd, FetchableField, ObjectUtils, } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { ProductVariant, ProductVarTypes } from './ProductVariant';

export class ProductVariantsController extends AbstractDbApiItemController<ProductVariant> {

	
	modelClass = ModelClass.ProductVariant;
	collName = ModelClass.ProductVariant;
	bePath = BePaths.productvariants;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;
	
	Attributes = {
		view: Attribute.viewProductVariants,
		add: Attribute.addProductVariants,
		modify: Attribute.modifyProductVariants,
		delete: Attribute.deleteProductVariants,
	};

	dtd: IVerifiableItemDtd<ProductVariant> = {
		
		group: { type: [Number, String], required: false },
		name: { type: [String], required: true, },
		// should i ?
		// usedTimes: { type: [Number], required: true },

		data: { type: [Object], required: true, objDef: [
			{
				type: { type: [Number], required: true, possibleValues: [ProductVarTypes.manual, ProductVarTypes.tags] },
				value: { type: [Array], required: true, arrayDef: { type: [String], }},
			}, 
			{
				type: { type: [Number], required: true, possibleValues: [ProductVarTypes.category] },
				value: { type: [Array], required: true, arrayDef: { type: [Object], objDef: [{
					id: { type: [String], required: true, },
					name: { type: [String], required: true, },
				}] }, }
			},
			{
				type: { type: [Number], required: true, possibleValues: [ProductVarTypes.automatic] },
				value: { type: [Array], required: true, arrayDef: { type: [Object], objDef: [{
					name: { type: [String], required: true, },
					values: { type: [Array], required: true, arrayDef: { type: [String], required: true, }},
				}] }, }
			},
		]}

	};

}

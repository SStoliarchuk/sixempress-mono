import { AbstractDbApiItemController, IVerifiableItemDtd, } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { Supplier } from './Supplier';

export class SupplierController extends AbstractDbApiItemController<Supplier> {

	modelClass = ModelClass.Supplier;
	collName = ModelClass.Supplier;
	bePath = BePaths.suppliers;
	
	addIncrementalValue = true;
	requireDocumentLocation = false;
	
	Attributes = {
		view: Attribute.viewSuppliers,
		add: Attribute.addSuppliers,
		modify: Attribute.modifySuppliers,
		delete: Attribute.deleteSuppliers,
	};

	dtd: IVerifiableItemDtd<Supplier> = {
		name: { type: [String], required: true, },
		phone: { type: [String], required: false, },
		email: { type: [String], required: false, },
		address: { type: [String], required: false, },
		province: { type: [String], required: false, },
		cap: { type: [String], required: false, },
		piva: { type: [String], required: false, },
	};

}

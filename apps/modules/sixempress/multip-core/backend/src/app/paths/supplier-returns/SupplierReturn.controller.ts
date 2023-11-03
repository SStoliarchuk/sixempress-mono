import { IVerifiableItemDtd } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { SupplierReturn, SupplierReturnStatus } from './SupplierReturn.dtd';
import { PricedRowsController } from '../../utils/priced-rows/priced-rows.controller';
import { ProductMovement, ProductMovementType } from '../products/product-movements/ProductMovement';
import { PricedRow, PricedRowsModelTotalType } from '../../utils/priced-rows/priced-rows.dtd';

export class SupplierReturnController extends PricedRowsController<SupplierReturn> {

	modelClass = ModelClass.SupplierReturn;
	collName = ModelClass.SupplierReturn;
	bePath = BePaths.SupplierReturn;

	Attributes = {
		view: Attribute.viewSupplierReturn,
		add: Attribute.addSupplierReturn,
		modify: Attribute.modifySupplierReturn,
		delete: Attribute.deleteSupplierReturn,
	}

	successProdMovType = ProductMovementType.returnedToSupplier;

	modelStatus = {
		all: Object.values(SupplierReturnStatus).filter(v => typeof v === 'number') as number[],
		draft: [SupplierReturnStatus.draft],
		fail: [SupplierReturnStatus.failed],
		success: [SupplierReturnStatus.completed],
		successPrePay: [SupplierReturnStatus.completedPrePay, SupplierReturnStatus.replaced],
	};

	dtd: IVerifiableItemDtd<SupplierReturn> = {
		
	};

	public getTotal(m: SupplierReturn, type: PricedRowsModelTotalType): number {
		// return buyPrice as the calculated total
		if (type === PricedRowsModelTotalType.calculated)
			type = PricedRowsModelTotalType.buyPrice;

		// the net is ALWAYS the negative total calculated as we're "buying" stuff
		if (type === PricedRowsModelTotalType.net)
			return this.getTotal(m, PricedRowsModelTotalType.calculated) * -1;

		return super.getTotal(m, type);
	}

	protected createProductMovementModelForRow(model: SupplierReturn, row: PricedRow['products'][0]): ProductMovement[] {
		// else we add the productmovs which will be "returns" type
		const movs = super.createProductMovementModelForRow(model, row);
		// create negative stock to balance the return info
		const addMovs: ProductMovement[] = [];

		// the items have been replaced
		if (model.status === SupplierReturnStatus.replaced) {
			for (const m of movs)
				addMovs.push({ ...m, amount: -m.amount, movementType: ProductMovementType.loadProducts, date: model.endDate || model.date });
		}

		return [...movs, ...addMovs];
	}

}

import { IVerifiableItemDtd } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { InternalOrder, InternalOrderStatus } from './InternalOrder.dtd';
import { PricedRowsController } from '../../utils/priced-rows/priced-rows.controller';
import { ProductMovement, ProductMovementType } from '../products/product-movements/ProductMovement';
import { PricedRow, PricedRowsModelTotalType } from '../../utils/priced-rows/priced-rows.dtd';
import { Movement, MovementDirection } from '../movements/Movement';

export class InternalOrderController extends PricedRowsController<InternalOrder> {

	modelClass = ModelClass.InternalOrder;
	collName = ModelClass.InternalOrder;
	bePath = BePaths.InternalOrder;

	Attributes = {
		view: Attribute.viewInternalOrder,
		add: Attribute.addInternalOrder,
		modify: Attribute.modifyInternalOrder,
		delete: Attribute.deleteInternalOrder,
	}

	modelStatus = {
		all: Object.values(InternalOrderStatus).filter(v => typeof v === 'number') as number[],
		draft: [InternalOrderStatus.draft],
		fail: [InternalOrderStatus.cancelled, InternalOrderStatus.failed, InternalOrderStatus.refunded],
		success: [InternalOrderStatus.completed],
		successPrePay: [InternalOrderStatus.completedPrePay],
	}

	successProdMovType = ProductMovementType.loadProducts;

	dtd: IVerifiableItemDtd<InternalOrder> = {
		internalNote: {type: [String], required: false},
	};

	public getTotal(m: InternalOrder, type: PricedRowsModelTotalType): number {
		// return buyPrice as the calculated total
		if (type === PricedRowsModelTotalType.calculated)
			type = PricedRowsModelTotalType.buyPrice;

		// the net is ALWAYS the negative total calculated as we're buying stuff
		if (type === PricedRowsModelTotalType.net)
			return this.getTotal(m, PricedRowsModelTotalType.calculated) * -1;

		return super.getTotal(m, type);
	}

	// invert the direction
	protected createMovementModelForPayment(model: InternalOrder, p: InternalOrder['payments'][0]): Movement[] {
		const movs = super.createMovementModelForPayment(model, p);
		for (const m of movs)
			m.direction = MovementDirection.output;

		return movs;
	}

	// invert the direction
	protected createProductMovementModelForRow(model: InternalOrder, row: PricedRow['products'][0]): ProductMovement[] {
		const movs = super.createProductMovementModelForRow(model, row);
		for (const m of movs)
			m.amount *= -1;

		return movs;
	}

}

import { IVerifiableItemDtd } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { TransferOrder, TransferOrderStatus } from './TransferOrder.dtd';
import { Movement, MovementDirection } from '../movements/Movement';
import { PricedRowsController } from '../../utils/priced-rows/priced-rows.controller';
import { PricedRow, PricedRowsModelTotalType } from '../../utils/priced-rows/priced-rows.dtd';
import { ProductMovement, ProductMovementType } from '../products/product-movements/ProductMovement';

export class TransferOrderController extends PricedRowsController<TransferOrder> {

	modelClass = ModelClass.TransferOrder;
	collName = ModelClass.TransferOrder;
	bePath = BePaths.TransferOrder;

	Attributes = {
		view: Attribute.viewTransferOrder,
		add: Attribute.addTransferOrder,
		modify: Attribute.modifyTransferOrder,
		delete: Attribute.deleteTransferOrder,
	}

	modelStatus = {
		all: Object.values(TransferOrderStatus).filter(v => typeof v === 'number') as number[],
		draft: [TransferOrderStatus.draft],
		fail: [TransferOrderStatus.cancelled, TransferOrderStatus.failed, TransferOrderStatus.refunded],
		success: [TransferOrderStatus.completed],
		successPrePay: [],
	}

	successProdMovType = ProductMovementType.locationMovement;

	dtd: IVerifiableItemDtd<TransferOrder> = {
		transferOriginLocationId: { type: [String], required: true, customFn: (v, b: TransferOrder) => b.physicalLocation === v ? 'OriginLocation and PhysicalLocation have to be different' : '' },
		economicTransfer: { type: [Boolean], required: false, possibleValues: [true] },
	};
	
	// add pay only if economic transfer is enabled
	isModelCompleteSuccessWillPay(m: TransferOrder) {
		return m.economicTransfer && super.isModelCompleteSuccessWillPay(m);
	}

	public getTotal(m: TransferOrder, type: PricedRowsModelTotalType): number {
		// return buyPrice as the calculated total
		if (type === PricedRowsModelTotalType.calculated)
			type = PricedRowsModelTotalType.buyPrice;

		return super.getTotal(m, type);
	}

	// move money internally between the two transfer points
	protected createMovementModelForPayment(model: TransferOrder, p: TransferOrder['payments'][0]): Movement[] {
		const from = super.createMovementModelForPayment(model, p);
		const to = super.createMovementModelForPayment(model, p);

		for (const m of from) {
			m.physicalLocation = model.transferOriginLocationId;
			m.documentLocation = model.transferOriginLocationId;
			m.documentLocationsFilter = [model.transferOriginLocationId];
			m.direction = MovementDirection.internalInput;
		}

		for (const m of to)
			m.direction = MovementDirection.internalOutput;

		return [...from, ...to];
	}

	// add the amount to the target location
	protected createProductMovementModelForRow(model: TransferOrder, row: PricedRow['products'][0]): ProductMovement[] {
		const from = super.createProductMovementModelForRow(model, row);
		const to = super.createProductMovementModelForRow(model, row);

		for (const m of from) {
			if (model._generatedFrom && m.movementType !== this.successProdMovType)
				m.movementType = ProductMovementType.salePendingTransfer;

			m.physicalLocation = model.transferOriginLocationId;
			m.documentLocation = model.transferOriginLocationId;
			m.documentLocationsFilter = [model.transferOriginLocationId];
		}

		// invert amount of the target destination
		for (const m of to) {
			if (model._generatedFrom && m.movementType !== this.successProdMovType)
				m.movementType = ProductMovementType.salePendingTransfer;

			m.amount *= -1;
		}

		return [...from, ...to];
	}

}

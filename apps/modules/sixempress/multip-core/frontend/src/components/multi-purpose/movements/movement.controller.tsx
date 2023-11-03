import React from 'react';
import { Movement, MovementGraph, MovementMedium } from "./Movement";
import { DbObjectSettings, AbstractDbItemController, RequestService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { SaleController } from "../sales/sale.controller";
import HelpOutline from '@material-ui/icons/HelpOutline';
import AttachMoney from '@material-ui/icons/AttachMoney';
import CreditCard from '@material-ui/icons/CreditCard';
import { CustomerOrderController } from '../orders/customer-orders/CustomerOrder.controller';
import { TransferOrderController } from '../orders/transfer-orders/TransferOrder.controller';
import { InternalOrderController } from '../orders/internal-orders/InternalOrder.controller';
import { CustomerReturnController } from '../returns/customer-returns/customer-return.controller';
import { SupplierReturnController } from '../returns/supplier-returns/SupplierReturn.controller';

export class MovementController extends AbstractDbItemController<Movement> {
	
	public static getMediumIcon<A>(type?: A): A extends MovementMedium ? JSX.Element : {[k: number]: JSX.Element} {
		const items = {
			[MovementMedium.card]: <CreditCard fontSize='small'/>,
			[MovementMedium.cash]: <AttachMoney fontSize='small'/>,
			[MovementMedium.unspecified]: <HelpOutline fontSize='small'/>,
		}
		if (!type)
			return items as any;

		return items[type as any] as any;
	}

	bePath = BePaths.movements;
	modelClass = ModelClass.Movement;
	protected fetchInfo: DbObjectSettings<Movement> = {};

	async getMovementGraph(filter: object): Promise<MovementGraph> {
		const base = (await RequestService.client('get', this.bePath + 'graph', {params: {filter}})).data;
		return base;
	}

	async getMovementSplit(from: number, to: number): Promise<MovementGraph> {
		const base = (await RequestService.client('get', this.bePath + 'split', {params: {from, to}})).data;
		return base;
	}

	getDetailsRender(item: Movement) {
		// if no data given then show no details
		if (!item._generatedFrom)
			return <>Dettagli non disponibili</>;
		
		if (item._generatedFrom.modelClass === ModelClass.Sale)
			return <SaleController.FullDetailJsx id={item._generatedFrom.id}/>;

		if (item._generatedFrom.modelClass === ModelClass.CustomerOrder)
			return <CustomerOrderController.FullDetailJsx id={item._generatedFrom.id}/>;

		if (item._generatedFrom.modelClass === ModelClass.InternalOrder)
			return <InternalOrderController.FullDetailJsx id={item._generatedFrom.id}/>;

		if (item._generatedFrom.modelClass === ModelClass.TransferOrder)
			return <TransferOrderController.FullDetailJsx id={item._generatedFrom.id}/>;

		if (item._generatedFrom.modelClass === ModelClass.CustomerReturn)
			return <CustomerReturnController.FullDetailJsx id={item._generatedFrom.id}/>;

		if (item._generatedFrom.modelClass === ModelClass.SupplierReturn)
			return <SupplierReturnController.FullDetailJsx id={item._generatedFrom.id}/>;

		return (
			<React_use_hook ruhName='sxmp_movement_detail_row' item={item}>
				Dettagli non disponibili
			</React_use_hook>
		);
	}

}

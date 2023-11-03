import { CustomExpressApp, IVerifiableItemDtd, RequestHandlerService } from '@sixempress/main-be-lib';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { Sale, SaleStatus } from './Sale';
import { Attribute } from '../../utils/enums/attributes.enum';
import { PricedRowsSaleController } from '../../utils/priced-rows-sale/priced-rows-sale.controller';

export class SaleController extends PricedRowsSaleController<Sale> {

	modelClass = ModelClass.Sale;
	collName = ModelClass.Sale;
	bePath = BePaths.sales;

	checkStockAvailability = true;

	Attributes = {
		view: Attribute.viewSales,
		add: Attribute.addSales,
		modify: Attribute.modifySales,
		delete: Attribute.deleteSales,
	};

	modelStatus = {
		all: Object.values(SaleStatus).filter(v => typeof v === 'number') as number[],
		draft: [SaleStatus.draft],
		fail: [SaleStatus.fail, SaleStatus.cancelled],
		success: [SaleStatus.success],
		successPrePay: [SaleStatus.successPrePay],
	};

	dtd: IVerifiableItemDtd<Sale> = {};
	

	generateBePaths(app: CustomExpressApp, rhs: RequestHandlerService<Sale>) {
		app.get('/' + this.bePath + 'count', rhs.count());
		super.generateBePaths(app, rhs);
	}


}

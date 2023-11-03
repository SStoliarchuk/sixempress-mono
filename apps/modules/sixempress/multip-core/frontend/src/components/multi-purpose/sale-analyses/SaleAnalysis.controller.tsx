import { SaleAnalysisTable } from "./SaleAnalysis.table";
import { DbObjectSettings, RequestService } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { SaleAnalysis, SaleAnalysisGraph } from "./SaleAnalysis";
import { PricedRowsSaleController } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.controller";
import { SaleController } from "../sales/sale.controller";
import { CustomerOrderController } from "../orders/customer-orders/CustomerOrder.controller";

export class SaleAnalysisController extends PricedRowsSaleController<SaleAnalysis> {
	
	bePath = BePaths.SaleAnalysis;
	modelClass = ModelClass.SaleAnalysis;
	
	protected static showSellPrice = true;
	
	protected fetchInfo: DbObjectSettings<SaleAnalysis> = {};

	protected getDetailsRender(item: SaleAnalysis) {

		// if no data given then show no details
		if (!item._generatedFrom)
			return <>Dettagli non disponibili</>;
		
		if (item._generatedFrom.modelClass === ModelClass.Sale)
			return <SaleController.FullDetailJsx id={item._generatedFrom.id}/>;

		if (item._generatedFrom.modelClass === ModelClass.CustomerOrder)
			return <CustomerOrderController.FullDetailJsx id={item._generatedFrom.id}/>;

		return (
			<React_use_hook ruhName='sxmp_saleanalysis_detail_row' item={item}>
				Dettagli non disponibili
			</React_use_hook>
		);
	}


	async getGraph(filter: object): Promise<SaleAnalysisGraph> {
		const base = (await RequestService.client('get', this.bePath + 'graph', {params: {filter}})).data;
		return base;
	}

}

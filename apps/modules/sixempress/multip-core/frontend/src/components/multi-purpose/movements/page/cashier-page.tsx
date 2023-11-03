import { ModelClass } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class";
import { MovementsPage } from "./movements-page";

export class CashierPage extends MovementsPage {

	generateSplitreport = false;

	protected getFilterByStatus(from: number, to: number) {
		return {
			$and: [
				super.getFilterByStatus(from, to),
				{$or: [
					{'_generatedFrom.modelClass': {$in: [ModelClass.Sale, ModelClass.Coupon, ModelClass.CustomerReturn]}},
					{_generatedFrom: {$exists: false}},
				]}

			]
		}
	}

}

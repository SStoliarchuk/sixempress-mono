import { MultiPage, MultiPagesConfiguration, } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class SaleAnalysisTabs extends MultiPage {

	getPages(): MultiPagesConfiguration[] {

		const toR: MultiPagesConfiguration[] = [];

		if (AuthService.isAttributePresent(Attribute.viewMovementsReport)) {
			toR.push({
				name: 'Report',
				routePath: 'report',
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewSaleAnalysis)) {
			toR.push({
				name: 'Netto',
				routePath: "netincome",
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewSaleAnalysis)) {
			toR.push({
				name: 'Lista',
				routePath: 'table',
			});
		}

		return toR;

	}

}

import { MultiPage, MultiPagesConfiguration, } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class MovementTabs extends MultiPage {

	getPages(): MultiPagesConfiguration[] {

		const toR: MultiPagesConfiguration[] = [];

		if (AuthService.isAttributePresent(Attribute.viewMovements)) {
			toR.push({
				name: 'Cassa',
				routePath: 'cashier',
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewSales)) {
			toR.push({
				name: 'Vendite',
				routePath: "sales",
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewMovements)) {
			toR.push({
				name: 'Lista Movimenti',
				routePath: 'table',
			});
		}

		return toR;

	}

}

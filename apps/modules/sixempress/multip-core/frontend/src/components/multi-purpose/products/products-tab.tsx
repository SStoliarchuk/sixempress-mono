import { MultiPage, MultiPagesConfiguration, } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class ProductsTabs extends MultiPage {

	
	
	getPages(): MultiPagesConfiguration[] {

		const toR: MultiPagesConfiguration[] = [];

		if (AuthService.isAttributePresent(Attribute.viewProducts)) {
			if (AuthService.isAttributePresent(Attribute.viewProductsReport)) {
				toR.push({
					name: "Dashboard",
					routePath: "dashboard"
				});
			}

			toR.push({
				name: 'Lista',
				routePath: 'table',
			});

		}

		if (AuthService.isAttributePresent(Attribute.viewInventoryCategories)) {
			toR.push({
				name: 'Categorie',
				routePath: 'categories',
			});
		}

		return toR;
	}

}

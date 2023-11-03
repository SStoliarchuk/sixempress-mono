import { MultiPage, MultiPagesConfiguration, } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class ReturnsTab extends MultiPage {

	getPages(): MultiPagesConfiguration[] {

		const toR: MultiPagesConfiguration[] = [];

		if (AuthService.isAttributePresent(Attribute.viewCustomerReturns)) {
			toR.push({
				name: 'Reso Cliente',
				routePath: "customer",
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewSupplierReturn)) {
			toR.push({
				name: 'Reso Al Fornitore',
				routePath: "supplier",
			});
		}

		return toR;
	}
	
}

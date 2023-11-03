import { MultiPage, MultiPagesConfiguration, } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class OrdersTab extends MultiPage {

	getPages(): MultiPagesConfiguration[] {

		const toR: MultiPagesConfiguration[] = [];
		
		if (AuthService.isAttributePresent(Attribute.viewCustomerOrder)) {
			toR.push({
				name: 'Ordini Clienti',
				routePath: "customer",
			});
		}
		
		if (AuthService.isAttributePresent(Attribute.viewInternalOrder)) {
			toR.push({
				name: 'Ordini Carico',
				routePath: "internal",
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewTransferOrder)) {
			toR.push({
				name: 'Ordini Trasferimento',
				routePath: "transfer",
			});
		}

		return toR;

	}

}

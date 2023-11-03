import { MultiPage, MultiPagesConfiguration, } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';

export class ExtConnTabs extends MultiPage {

	getPages(): MultiPagesConfiguration[] {

		const toR: MultiPagesConfiguration[] = [];

		if (AuthService.isAttributePresent(Attribute.addExternalConnection)) {
			toR.push({
				name: 'Configurazione',
				routePath: 'configuration',
			});
		}

		if (AuthService.isAttributePresent(Attribute.viewRawFiles)) {
			toR.push({
				name: 'File e Documenti',
				routePath: 'rawfiles',
			});
		}



		return toR;

	}

}

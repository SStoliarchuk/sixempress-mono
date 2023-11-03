import './styles.css';
import { ILibConfig, BusinessCategory, RequestService, ContextService, BusinessLocationsService } from '@sixempress/main-fe-lib';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { CodeScannerEventsService } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';
import { ExternalConnectionConfig, IBMultiPurposeConfig } from 'apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd';
import { MultipService } from 'apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service';
import { SPrintService } from 'apps/modules/sixempress/multip-core/frontend/src/services/s-print/s-print.service';
import { CustomerOrderController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/customer-orders/CustomerOrder.controller';
import { TransferOrderController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/transfer-orders/TransferOrder.controller';
import { SaleController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sales/sale.controller';
import { SaleAnalysisController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/SaleAnalysis.controller';
// import { Chat, chatControls, startSocketNotifications, stopSocketNotifications } from './base-components/customer-tickets/chat';
import { SeasService } from './services/seas/seas.service';
import { WebRTCService } from './services/webrtc/webrtc.service';


// const isDemo = env.envName.includes('demo');

// if (isDemo)
// 	DemoLogin.override();

const config: ILibConfig =  {
	loginPagePath: '/login',
	error401Path: '/',
	topLevelJsx: [ /* <Chat/> */ ],
	controllers: [
		CustomerOrderController,
		TransferOrderController,
		SaleController,
		SaleAnalysisController,
	] as any,
	onLogout: () => {
		// chatControls.toggleChat(false);
		// !isDemo && stopSocketNotifications();
		WebRTCService.destroy();
	},
	onLogin: async () => {
		const ret = await Promise.all([
			RequestService.client<IBMultiPurposeConfig>('get', BePaths.multipsysteminfocontent),
			RequestService.client<ExternalConnectionConfig>('get', BePaths.multipexternalconnections),
		]);

		ret[0].data && (MultipService.content = ret[0].data);
		ret[1].data && (MultipService.exts = ret[1].data);

		// no root config means the system is new
		// if (!rootConfig)
		// 	return setTimeout(() => openFirstStartup(), 200);

		CodeScannerEventsService.start();
		SPrintService.initService();

		if ((window as any).Cypress)
			return;

		await WebRTCService.initService();
		await SeasService.initService();
		// !isDemo && startSocketNotifications();
	},
};

export const mainConfig = config;

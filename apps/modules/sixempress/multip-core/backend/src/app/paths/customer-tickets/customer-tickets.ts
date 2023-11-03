import { BePaths } from '../../utils/enums/bepaths.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { CustomExpressApp, RequestHelperService } from '@sixempress/main-be-lib';

/**
 * Root paths for server only
 */
export function customerTickets(app: CustomExpressApp) {

	// // accepts call from control server and then forwards to the socket connection
	// // this way we avoid having an additional socket connection to control, but we can use the one from this server
	// app.post(
	// 	'/' + BePaths.be_notify_customer_ticket, 
	// 	ServerNodeService.serverOnly, 
	// 	RequestHelperService.safeHandler((req, res) => {
	// 		const body = req.body;
	// 		SocketService.onCrudAction(RequestHelperService.getSlugByRequest(req), 'update', ModelClass.CustomerTicket, body.ids);
	// 	}
	// ));
	
}

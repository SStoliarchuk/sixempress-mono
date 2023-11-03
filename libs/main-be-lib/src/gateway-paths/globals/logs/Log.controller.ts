import { LibModelClass, LibBePaths } from "../../../utils/enums";
import { Log } from "./Log.dtd";
import { AbstractDbApiItemController } from "../../../object-format-controller/db-item/abstract-db-api-item.controller";

export class LogController extends AbstractDbApiItemController<Log> {
	
	modelClass = LibModelClass.Log;
	bePath = LibBePaths.logs;
	collName = LibModelClass.Log;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	dtd = {};

	Attributes = {
		view: true,
		modify: 0,
		add: 0,
		delete: 0,
	};


// export function generateLogsPaths(app: CustomExpressApp) {
	
// 	const log = new LogController();
// 	const rhs = new RequestHandlerService(log);

// 	// get multi
// 	app.get('/' + LibBePaths.logs, rhs.getMulti({
// 		customOptions: (req) => {
// 			// Get info of the user that is requiring the data
// 			const reqUserData = AuthHelperService.getAuthzBody(req).user;
// 			// add created by filter
// 			if (reqUserData.att.indexOf(Attribute.viewAllLogs) === -1) {
// 				return {
// 					filters: { 'author.id': reqUserData._id },
// 					countFilets: {'author.id': reqUserData._id}
// 				};
// 			}
// 		}
// 	}));

// 	// get single
// 	app.get('/' + LibBePaths.logs + ':id', rhs.getById());
	
// }


}

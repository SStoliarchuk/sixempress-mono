import { LibModelClass, LibBePaths } from "../../../utils/enums";
import { AbstractDbApiItemController } from '../../../object-format-controller/db-item/abstract-db-api-item.controller';
import { Exception } from './Exception.dtd';
import { LibAttribute } from "../../../utils/enums";

export class ExceptionController extends AbstractDbApiItemController<Exception> {

	modelClass = LibModelClass.Exception;
	collName = LibModelClass.Exception;
	bePath = LibBePaths.exceptions;

	requireDocumentLocation = false;
	requireDocumentLocationsFilter = false;

	Attributes = {
		view: LibAttribute.seeSystemMetrics,
		add: false,
		modify: false,
		delete: false,
	}

	dtd: {};

}

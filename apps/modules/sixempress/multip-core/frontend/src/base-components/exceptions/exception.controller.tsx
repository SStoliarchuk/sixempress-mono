import { AbstractDbItemController, BePaths, LibModelClass } from '@sixempress/main-fe-lib';
import { Exception } from './Exception';

export class ExceptionController extends AbstractDbItemController<Exception> {
	
	modelClass = LibModelClass.Exception;
	bePath = BePaths.exceptions;
	fetchInfo = {};

}



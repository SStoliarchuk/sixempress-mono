import { AbstractDbItemController, BePaths, LibModelClass } from "@sixempress/main-fe-lib";
import { ErrorReport } from "./ErrorReport";

export class ErrorReportController extends AbstractDbItemController<ErrorReport> {

	modelClass = LibModelClass.ErrorReport;
	bePath = BePaths.errorreport;
	fetchInfo = {};

}

import { ApiKey } from "./ApiKey";
import { BePaths, ModelClass } from "../../enums";
import { AbstractDbItemController, DbObjectSettings } from "@sixempress/main-fe-lib";

export class ApiKeyController extends AbstractDbItemController<ApiKey> {

	public bePath = BePaths.apikeys;
	
	public modelClass = ModelClass.ApiKey;
	
	protected fetchInfo: DbObjectSettings<ApiKey> = {
		
	};
	
}

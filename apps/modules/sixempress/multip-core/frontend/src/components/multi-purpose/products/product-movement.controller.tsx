import {   DbObjectSettings,  AbstractDbItemController } from "@sixempress/main-fe-lib";
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { ProductMovement } from "./Product";

export class ProductMovementController extends AbstractDbItemController<ProductMovement> {
	
	bePath = BePaths.productmovements;
	modelClass = ModelClass.ProductMovement;
	protected editorJsx = undefined;
	protected tableJsx = undefined;

	protected fetchInfo: DbObjectSettings<ProductMovement> = {
		
	};

}

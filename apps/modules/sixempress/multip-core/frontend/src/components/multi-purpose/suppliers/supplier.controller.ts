import { Supplier } from "./Supplier";
import { SupplierEditor } from "./supplier.editor";
import { DbObjectSettings, FetchableField, EditorAmtsConfig, AmtsFieldProps, AbstractDbItemController } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { Attribute } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes";

export class SupplierController extends AbstractDbItemController<Supplier> {
	
	bePath = BePaths.suppliers;
	modelClass = ModelClass.Supplier;

	protected fetchInfo: DbObjectSettings<Supplier> = {};

	public static formatName(value: Supplier | FetchableField<Supplier>): string {
		if (!value)
			return '';

		const model: Supplier = (value as FetchableField<Supplier>).fetched || value as Supplier;
		
		if (model) {
			if (model._progCode)
				return model._progCode + ' | ' + model.name;
			else
				return model.name;
		}
	}

	public static AmtsFieldProps(chose?: EditorAmtsConfig<Supplier>['amtsInput']['choseFn'], textProps?: AmtsFieldProps<Supplier>['textFieldProps']): EditorAmtsConfig<Supplier> {
		return {
			// modelClass: ModelClass.Supplier,
			modelClass: ModelClass.Supplier,
			textFieldProps: (textProps || {}),
			canClearField: true,
			renderValue: SupplierController.formatName,
			amtsInput: {
				choseFn: chose,
				bePath: BePaths.suppliers,
				editor: AuthService.isAttributePresent(Attribute.addSuppliers) && SupplierEditor,
				infoConf: { columns: [{
					title: 'Cod.',
					data: '_progCode',
					searchOptions: { castToInt: true }
				}, {
					title: 'Nome',
					data: 'name',
				}] }
			}
		}
	}

}

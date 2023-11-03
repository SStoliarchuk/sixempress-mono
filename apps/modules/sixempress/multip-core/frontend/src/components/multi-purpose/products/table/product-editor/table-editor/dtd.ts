import { CFormGroup, CFormArray } from "./custom-form-group.dtd";
import { ProductGroup } from "../../../ProductGroup";
import { InventoryCategory } from "../../../../inventory-categories/InventoryCategories";
import { FetchableField } from "@sixempress/main-fe-lib";
import { Supplier } from "../../../../suppliers/Supplier";
import { Product } from "../../../Product";

export interface PTEState {

	// using product group here as the table will support variation in the future
	// variation is the "complex" mode of the table
	// TODO add complex mode :D
	products: Array<{
		selected: boolean,
		form: CFormGroup<ProductGroup>
	}>;

	/**
	 * this products hashmap should be equal to the products array
	 * it is used for faster object access
	 */
	productsHm: {[id: string]: CFormGroup<ProductGroup>};

	/**
	 * Values that appear in the TH of the table
	 * when more than one row is selected
	 */
	multiSelectValues?: {
		name: '' | string,
		category: '' | FetchableField<InventoryCategory>,
		supplier: '' | FetchableField<Supplier>,
		buyPrice: '' | number,
		sellPrice: '' | number,
		visibility: string[],
	};


	barcodePopover?: {
		anchor: HTMLElement,
		formArray: CFormArray<Product['infoData']['barcode']>,
	};


	canSave: boolean;

	/**
	 * State of the saving stuff
	 */
	savingProgress?: {
		done: number,
		fails: any[],
		total: number,
	};

	showSavingFailsOnly?: true;

}

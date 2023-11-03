import { FormGroup, FormControl } from "react-reactive-form";
import { Supplier } from "../../../suppliers/Supplier";
import { InventoryCategory } from "../../../inventory-categories/InventoryCategories";
import { FetchableField, AbstractEditorState } from "@sixempress/main-fe-lib";
import { Product } from "../../Product";

export interface FormedGroup extends FormGroup {
	value: IFormGroupValue
}

/**
 * This is a helper interface for dtd
 * 
 * The ID value in productVariation is used when modifying an item and doing a PUT
 */
export interface IFormGroupValue {
	groupData: {
		name: string,
		description?: string,
		category?: FetchableField<InventoryCategory>,
		additionalCategories?: FetchableField<InventoryCategory>[],
		tags?: string[],
	},
	documentLocationsFilter: string[],
	documentLocation: string,
	
	externalSync: [{
		enabled: boolean,
		name: string,
		id: string,
	}],

	/*
	 * this contains just the UI info for the variations
	 * the true value is in the productVariations array
	 * 
	 * both the manual and automatic variants should be updated togheter
	 * they both should have the same names and the same order
	 */
	variants: {
		enabled: boolean,
		simple: boolean,

		// contains the names of the values
		manual: string[],
		// contains the variants to multiply between themselves
		automatic: Array<{name: string, values: string[]}>,

		autoNotGeneratedCombinations: {
			variations: {name: string, value: string}[],
		}[],
	},

	/**
	 * If the product contains variants, then this is the most common combination of each value
	 * 
	 * if the product does not contain variant, but only variations, then this should be one of the variation
	 */
	baseVariation: {
		sellPrice: number,
		buyPrice: number,
		supplier?: FetchableField<Supplier>,
		refSellPrice?: number,
	},

	productVariations: Array<{
		/**
		 * Used for the jsx key in the for loop
		 */
		__jsx_id: string,
		/**
		 * The id of the original variation, used to remap the product movements
		 */
		_id?: string | undefined,

		
		infoData: {
			barcode?: string[],
			refSellPrice?: number | null,
			images?: Product['infoData']['images'],
		},

		/*
		 * the info of which field should be in "manual input" mode
		 * if true the end product will take the values from this productvariation
		 * if false the end product will take the values from the base variation
		 */
		separatedVariations: {
			sellPrice: boolean,
			buyPrice: boolean
			supplier: boolean,
		},
		variationData: {
			sellPrice?: number | null,
			buyPrice?: number | null,
			supplier?: FetchableField<Supplier> | null,
			variants: Array<{value: string, name: string}>,
		}
	}>,
}

export interface SPEState extends AbstractEditorState<any> {
	formGroup?: FormedGroup;

	sameVariationsError?: boolean;

	/**
	 * Supplier form control to change
	 */
	targetSupplierFormControl?: FormControl;

	/**
	 * Configuration of the barcode popover,
	 */
	barcodePopover?: {
		open: boolean,
		mode: 'add' | 'set',
		anchor: HTMLElement,
		prodIdx: number,
	};

	/**
	 * use to control the override variation field on/off
	 */
	productVariantFieldControlMenu?: {
		open: boolean,
		anchor: HTMLElement,
		prodIdx: number,
	},
}

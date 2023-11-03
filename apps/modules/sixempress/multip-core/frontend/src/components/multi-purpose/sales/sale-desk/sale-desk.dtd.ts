import { FetchableField, SelectFieldValue } from "@sixempress/main-fe-lib";
import { PricedRowSale } from "apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd";
import { Customer } from "../../customers/Customer";
import { MovementMedium } from "../../movements/Movement";
import { Product } from "../../products/Product";
import { ProductGroup } from "../../products/ProductGroup";
import { Sale } from "../Sale";

export interface SDTState extends PricedRowSale {
	customer?: FetchableField<Customer>,
	ovverridePrice?: { type: 'percentage' | 'manual', value?: number | string },
	partialPayment?: boolean,
	saleControlOpen: boolean,
	payments?: Sale['payments'],
	physicalLocation: string,
	activePayMedium: MovementMedium,
}

export interface SDTProps {
	isReturnTab: boolean,
	saleLocations: SelectFieldValue[],
	defaultState?: Partial<SDTState>,
	onChangePhysicalLocation: (oldId: string, newId: string) => void,
	onClickProductDetails: (id: string, tab: SDTState) => void,
	onProductsChange: (p: Product[], tab: SDTState) => void,
	// we pass always the total as to ensure it is the same one in the back end and we do not miscalculate anything
	onConfirm: (tab: SDTState, finalTotal: number) => void,
}


export type AdjustedAmountP = Product & {__amountLeft: number};
export type AdjustedAmountPg = Omit<ProductGroup, 'models'> & {models: Array<AdjustedAmountP>};

export interface SDState {
	productsListLoading: boolean,
	productsList: AdjustedAmountPg[],
	productsListHasMore: boolean,
	searchValue: string,
	listPhotos: boolean,
	
	tabIndex: number,
	tabStates: {[idx: number]: SDTState},
	choseVariantMenu: {
		open: boolean,
		anchorEl?: HTMLElement,
		models?: AdjustedAmountP[],
	},
}

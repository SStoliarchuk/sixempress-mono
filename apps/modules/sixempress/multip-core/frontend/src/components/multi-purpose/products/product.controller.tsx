import React, { ComponentClass } from 'react';
import Link from '@material-ui/core/Link';
import { Product } from "./Product";
import { ProductsTable } from "./table/products.table";
import { IBaseModel, DbObjectSettings, DataFormatterService, Omit, ABDTProps,  BusinessLocationsService, ComponentCommunicationService, RouterService, ModalProps, ModalService, FetchableField, ObjectUtils, AbstractDbItemController, IMongoProjection, IMongoDBFetch, DbItemSchema, SnackbarService } from "@sixempress/main-fe-lib";
import { AuthService } from '@sixempress/abac-frontend';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { MultiPCKeys } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';
import { SelectQuickActionValue } from 'apps/modules/sixempress/multip-core/frontend/src/utils/quick-chose/quick-chose.dtd';
import { SingleProductEditor } from './table/product-editor/single/single-product.editor';
import { productCommunicationObject, productCommunicationServiceKey } from './list/product-amount-list.dtd';
import { ProductsJsxRender } from './products-render';
import { TableProps } from '@material-ui/core';
import { HookActions, HookFilters } from '@stlse/frontend-connector';
import { CodeScannerEventsService } from '../../../services/barcode/code-scanner-events.service';
import { QuickChose } from '../../../utils/quick-chose/quick-chose';

export enum CSEC_product_values {
	loadProducts = 'CSEC_product_loadProducts',
	openQtAmount = 'CSEC_product_openQtAmount',
	moveAmounts = 'CSEC_product_moveAmounts',
	openSale = 'CSEC_product_opensale',
}

export type SelectDtMode<T extends IBaseModel, SM = 'single' | 'multi'> = SM | (
	{
		selectMode: SM,
		projection?: IMongoProjection<T>,
		fetch?: IMongoDBFetch<T>[],
		schema?: DbItemSchema<T>,
	}
);


export type ProductOpTableData = Required<Pick<Product, '_id'>> & {__amounts?: {[locId: string]: number}};


declare type T = Product;
export class ProductController extends AbstractDbItemController<Product> {
	
	bePath = BePaths.productdetails;
	modelClass = ModelClass.Product;
	
	protected editorJsx = SingleProductEditor;
	protected tableJsx = ProductsTable;

	protected fetchInfo: DbObjectSettings<Product> = {
		groupData: {
			category: {  },
		},
		variationData: {
			supplier: {  },
		},
	};

	public static filterHooks: HookFilters = {
		sxmp_codescanner_events_compose_barcode: (ctx, ret, compose, prefix, obj) => {
			if (prefix)
				return ret;
			
			const barcode = (obj as Product).infoData?.barcode[0];
			if (!barcode)
				return ret;

			return barcode;
		},
	}

	public static actionHooks: HookActions = {
		sxmp_codescanner_events_process_read: async (ctx, ret, decoded) => {
			if (decoded.prefix || !AuthService.isAttributePresent(Attribute.viewProducts))
				return;
				
			const res = await new ProductController().getMulti({params: {filter: {'infoData.barcode': decoded.fixedCode}, projection: {_id: 1}}});
			const items = res.data as Array<{_id: string}>;

			// no items with this barcode
			if (items.length === 0) 
				return SnackbarService.openSimpleSnack("Codice non trovato nel sistema", {variant: 'error'});

			QuickChose.selectQuickChoseOptions({
				cacheKey: ProductController.codeScanActionCacheKeyPRODUCT,
				values: ProductController.getCodeScanActionValues(),
				onChose: (v) => {
					switch (v) {
						// case CSEC_product_values.openSale: 
						// 	return openSaleModal({barcode: string});
						
						case CSEC_product_values.loadProducts:
							return ProductController.openProductsTableOperation('loadproducts', items)

						case CSEC_product_values.openQtAmount:
							return ProductController.openProductsTableOperation('manualqt', items);

						case CSEC_product_values.moveAmounts:
							return ProductController.openProductsTableOperation('move', items);
					}
				}
			});

		}
	}

	public static codeScanActionCacheKeyPRODUCT = MultiPCKeys.csecProduct;

	public static getCodeScanActionValues(): SelectQuickActionValue[] {
		return [{
			label: 'Carica giacenza',
			value: CSEC_product_values.loadProducts,
			visible: AuthService.isAttributePresent(Attribute.addProductMovements),
		}, {
			label: "Modifica giacenza",
			value: CSEC_product_values.openQtAmount,
			visible: AuthService.isAttributePresent(Attribute.modifyProductMovements),
		}, {
			label: "Sposta fra posizioni",
			value: CSEC_product_values.moveAmounts,
			visible: BusinessLocationsService.getLocationsFilteredByUser(false).length > 1 && AuthService.isAttributePresent(Attribute.modifyProductMovements),
		}]
	}

	public static Link(p: {item: FetchableField<Product>}) {
		return (
			<Link onClick={ProductController.openProductModelDetail} data-id={p.item.id} data-type={p.item.fetched.groupData.type}>
				{ProductsJsxRender.formatFullProductName(p.item.fetched)}
			</Link>
		)
	}

	/**
	 * Opens a model that shows the detail of the product
	 * and takes the parames either from `data-id` and `data-type` attributs
	 * or 
	 * from the passed manual params
	 * @param eOrId React.Mouse event (fired onClick) or the product id
	 * @param givenType the type of the product: replaceemnt|product
	 */
	public static openProductModelDetail(eOrId: React.MouseEvent<any> | string) {
		const id = typeof eOrId === 'string' ? eOrId : eOrId.currentTarget.dataset.id;
		if (!id || !AuthService.isAttributePresent(Attribute.viewProducts))
			return;

		ModalService.open(
			{title: 'Dettagli Prodotto', content: ProductController.FullDetailJsx},
			{id: id},
		);
	}

	/**
	 * Allows you to open a table with products idk
	 * @param table The table type to open
	 * @param prods The starting products to open the table with
	 * @param forceType used when the product array does not have groupData.type
	 */
	public static openProductsTableOperation(
		table: 'manualqt' | 'move' | 'loadproducts' | 'printbarcode', 
		prodsOrType?: ProductOpTableData[], 
	) {

		// set data to pass
		if (Array.isArray(prodsOrType) && prodsOrType.length) {
			const data: productCommunicationObject = prodsOrType.map(p => ({productId: p._id, amounts: p.__amounts}));
			ComponentCommunicationService.setData(productCommunicationServiceKey, data);
		}
		

		if (table === 'move')
			RouterService.goto('/orders/transfer/editor');
		else if (table === 'loadproducts')
			RouterService.goto('/orders/internal/editor');
		else
			RouterService.goto('/products/table/' + table);
		

	}

	/**
	 * Allows you to select items from the table
	 */
	public openSelectDt<SM extends 'single' | 'multi' | 'detailed'>(
		mode: SelectDtMode<Product, SM>,
		onSelect: SM extends 'single' 
			? ((id: string, m: Product) => void)
			: ((ids: string[], ms: Product[]) => void),
		opts: {
			TableProps?: Omit<ABDTProps<any>, 'emeddedData' | 'isEmbedded'>,
			ModalProps?: ModalProps,
		} = {},
	) {

		const selectMode = typeof mode === 'string' ? mode : mode.selectMode;
		opts.TableProps = opts.TableProps || {};
		opts.TableProps = {
			isEmbedded: selectMode === 'detailed' ? 'customselect' : 'select',
			emeddedData: {
				selectMode: selectMode === 'detailed' ? "multi" : selectMode,
				onSelectConfirm: (i, m) => this.handleTableSelectConfirm(mode as any, onSelect as any, i, m),
			},
			...(opts.TableProps || {}),
		}
		return this._openSelectDt(mode as any, onSelect, opts)
	}

		/**
	 * Allows you to select items from the table
	 */
	public _openSelectDt<SM extends 'single' | 'multi'>(
		mode: SelectDtMode<T, SM>,
		onSelect: SM extends 'single' 
			? (id: string, m: T) => void
			: (ids: string[], ms: T[]) => void,
		opts: {
			TableProps?: Partial<TableProps>,
			ModalProps?: ModalProps,
		} = {}
	) {
		const modeToUse = typeof mode === 'string' ? mode : mode.selectMode;

		// manually ovverride prop types
		const modal = ModalService.open<ComponentClass<ABDTProps<T>>>(
			{content: this.tableJsx as any}, 
			{
				isEmbedded: 'select',
				emeddedData: {
					selectMode: modeToUse as 'single' | 'multi',
					onSelectConfirm: (i, m) => {
						modal.close();
						this.handleTableSelectConfirm(mode, onSelect as any, i, m);
					},
				},
				...(opts.TableProps || {}),
			},
			{
				maxWidth: 'lg',
				fullWidth: true,
				removePaper: true,
					...(opts.ModalProps || {}),
			},
		);
		return modal;
	}

	/**
	 * out here to be used by the childs 
	 */
	protected handleTableSelectConfirm = (
		mode: SelectDtMode<T>,
		onSelect: (ids: string, ms: any) => void, 
		i: string[], 
		m: any[], 
	) => {

		const modeToUse = typeof mode === 'string' ? mode : mode.selectMode;

		const triggerOnSelect = (models: T[]) => {
			if (modeToUse === 'single') {
				(onSelect as any)(i[0], models[0]);
			} else {
				(onSelect as any)(i, models);
			}
		};

		// we set deleted null on get as to get deleted item in case they are shown
		if (typeof mode === 'string' || (typeof mode === 'object' && Object.keys(mode).length === 1)) {
			triggerOnSelect(m);
		}
		else if (mode.schema) {
			this.getMulti({params: {
				filter: {_id: {$in: i}, _deleted: null},
				schema: mode.schema,
			}})
			.then(res => triggerOnSelect(res.data));
		}
		else if (mode.fetch || mode.projection) {
			this.getMulti({params: {
				filter: {_id: {$in: i}, _deleted: null},
				projection: mode.projection || {}, 
				fetch: mode.fetch, 
			}}).then(res => triggerOnSelect(res.data));
		}
		
	}


	/**
	 * checks if two variations are the same
	 */
	 public static twoVariantsAreSame(vars: Product['variationData']['variants'], vars2: Product['variationData']['variants']): boolean {
		if (vars.length !== vars2.length) 
			return false;

		const diff = ObjectUtils.objectDifference(
			vars.map(v => ({name: v.name.toLowerCase(), value: v.value.toLowerCase()})),
			vars2.map(v => ({name: v.name.toLowerCase(), value: v.value.toLowerCase()}))
		);

		return !diff;
	}

	/**
	 * checks if the variation AND the sell price are equal withouth checking other fields (like buyPrice, supplier etc)
	 * @param vars the first product
	 * @param vars2 the second product
	 */
	public static twoSaleableVariationsAreEqual(vars: {[A in keyof Pick<Product, 'variationData'>]: Pick<Product['variationData'], 'sellPrice' | 'variants'>}, vars2: {[A in keyof Pick<Product, 'variationData'>]: Pick<Product['variationData'], 'sellPrice' | 'variants'>}): boolean {
		return vars.variationData.sellPrice === vars2.variationData.sellPrice && ProductController.twoVariantsAreSame(vars.variationData.variants, vars2.variationData.variants)
	}


	getDetailsRender(item: Product) {
		return (
			<div className='peek-div-info-container'>
				<div className='peek-div-info-card'>
					<table className='peek-card-table'>
						<tbody>
							<tr>
								<th>Prodotto: </th>
								<td>{item.groupData.name}</td>
							</tr>
							{item.groupData.uniqueTags && item.groupData.uniqueTags.length !== 0 && (
								<tr>
									<th>Codici univoci: </th>
									<td>{item.groupData.uniqueTags.join(', ')}</td>
								</tr>
							)}
							{item.groupData.internalTags && item.groupData.internalTags.length !== 0 && (
								<tr>
									<th>Tag Interni: </th>
									<td>{item.groupData.internalTags.join(', ')}</td>
								</tr>
							)}
							{item.groupData.tags && item.groupData.tags.length !== 0 && (
								<tr>
									<th>Tag: </th>
									<td>{item.groupData.tags.join(', ')}</td>
								</tr>
							)}
							{item.variationData.variants.length !== 0 && (
								<tr>
									<th>Variante:</th>
									<td>{item.variationData.variants.map(p => p.value).join(' | ')}</td>
								</tr>
							)}
							{item.variationData.supplier && (
								<tr>
									<th>Fornitore:</th>
									<td>{item.variationData.supplier.fetched.name}</td>
								</tr>
							)}
							<tr>
								<th>Quantita' disponibile: </th>
								<td>{ProductsJsxRender.generateFullAmountInfo(item)}</td>
							</tr>
							{typeof item.variationData.buyPrice !== "undefined" && (
								<tr>
									<th>Prezzo di acquisto:</th>
									<td>€ {DataFormatterService.centsToScreenPrice(item.variationData.buyPrice)}</td>
								</tr>
							)}
							{typeof item.variationData.sellPrice !== "undefined" && (
								<tr>
									<th>Prezzo di vendita:</th>
									<td>€ {DataFormatterService.centsToScreenPrice(item.variationData.sellPrice)}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

}

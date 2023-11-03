import to from 'await-to-js';
import { AbstractDtHelper, BusinessLocationsService, CodeScannerService, DataStorageService, IQueryStringParamsSingleFilter, LibSmallUtils, SmallUtils } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { CodeScannerEventsService, ScannedItemType } from 'apps/modules/sixempress/multip-core/frontend/src/services/barcode/code-scanner-events.service';
import { BePaths } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths';
import { MultiPCKeys } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/various';
import { PricedRowSale, PricedRowsSaleModel } from 'apps/modules/sixempress/multip-core/frontend/src/utils/priced-rows-sale/priced-rows-sale.dtd';
import { CustomerReturn } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/customer-returns/CustomerReturn';
import { Product } from '../../products/Product';
import { ProductGroupController } from '../../products/product-group.controller';
import { ProductController } from '../../products/product.controller';
import { ProductGroup } from '../../products/ProductGroup';
import { Sale, SaleStatus } from '../Sale';
import { SaleDeskTab } from './sale-desk-tab';
import { AdjustedAmountP, AdjustedAmountPg, SDState, SDTState } from './sale-desk.dtd';
import { SaleController } from '../sale.controller';
import moment from 'moment';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { openReceiptModal } from '../receipt/print-receipt.modal';
import { CustomerReturnController } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/customer-returns/customer-return.controller';

export class SaleDeskLogic extends React.Component<{}, SDState> {

	// protected buildedInfo = new ProductGroupController().buildGetOptionsBySchema({
	// 	groupData: { name: 1, internalTags: 1, uniqueTags: 1},
	// 	infoData: {barcode: 1},
	// 	_trackableGroupId: 1,
	// 	models: [{
	// 		_id: 1,
	// 		_trackableGroupId: 1,
	// 		_amountData: 1,
	// 		groupData: { name: 1 },
	// 		infoData: {barcode: 1},
	// 		variationData: 1,
	// 	}]
	// });


	private static SEARCH_DEBOUNCE_MS = 300;
	
	private static PRODUCTS_LIST_QUERY_LIMIT = 10;
	
	// TODO remove this flag when will update loading overlay
	protected currentlySendingSale = false;
	
	protected showCustomerReturnTab = AuthService.isAttributePresent(Attribute.addCustomerReturns);

	protected viewCoupon = AuthService.isAttributePresent(Attribute.viewCoupon);

	protected saleLocations = BusinessLocationsService.getDocPosSelectValues();

	protected infiniteScrollRef = React.createRef<InfiniteScroll>();

	protected tabRef = React.createRef<SaleDeskTab>();


	state: SDState = {
		productsList: [],
		productsListLoading: false,
		productsListHasMore: false,
		searchValue: '',
		listPhotos: DataStorageService.getSafeValue(MultiPCKeys.saleProductListPhotos, 'boolean', 'localStorage') ?? false,
		choseVariantMenu: { open: false },

		tabStates: {},
		tabIndex: 0,
	};

	protected get activeTab (): SDTState {
		return this.tabRef.current?.state || {} as SDTState;
	}

	componentDidMount() {
		this.configureBarcodeActions(true);
	}

	componentWillUnmount() {
		this.configureBarcodeActions(false);
	}

	/**
	 * Queries the products with a switch logic to return the last promise
	 */
	protected queryByName = SmallUtils.switchPromise(async (string: string, skip: number = 0) => {
		const processed = AbstractDtHelper.processDtParameters({
			search: string ? {regex: true, value: string} : undefined,
			limit: SaleDeskLogic.PRODUCTS_LIST_QUERY_LIMIT,
			skip: skip,
		}, [
			{data: 'groupData.name', search: true}, 
			{data: 'groupData.uniqueTags', search: true},
			{data: 'groupData.internalTags', search: true},
			{data: 'infoData.barcode', search: true},
		]);

		return this.queryProducts(processed);
	});

	protected async queryProducts(opts: IQueryStringParamsSingleFilter<ProductGroup>): Promise<ProductGroup[]> {
		if (!opts.filter)
			opts.filter = {};
		opts.calculateAmounts = true;
		
		return (await new ProductGroupController().getMulti({params: opts, disableLoading: true})).data;
	}

	/**
	 * Debounced product search
	 */
	protected searchProduct = SmallUtils.debounce(SaleDeskLogic.SEARCH_DEBOUNCE_MS, async (v: string) => {
		// no query, show empty
		if (!v) {
			this.queryByName.dropCurrent();
			this.setState({productsList: [], productsListLoading: false});
			return;
		}

		// query the products
		this.setState({productsListLoading: true});
		const pgs = await this.queryByName(v);
		
		// update the flag for infinite scroll
		this.setState({productsListHasMore: pgs.length >= SaleDeskLogic.PRODUCTS_LIST_QUERY_LIMIT});

		// set the adjusted products
		const adjustedPgs = pgs.map(pg => this.adjustPgAmount(pg, this.activeTab.physicalLocation, this.activeTab.products));
		this.setState(
			{productsList: adjustedPgs, productsListLoading: false}, 
			() => this.ensureInfiniteScrollIsSetup()
		);
	});

	/**
	 * Toggles the barcode behavior
	 * @param toActivate Wheter to activate or deactive the listener
	 */
	private configureBarcodeActions(toActivate: boolean) {
		if (!toActivate)
			return CodeScannerService.restoreDefaultAction();

		CodeScannerService.setAction(async (code) => {
			const t = CodeScannerEventsService.getTypeFromCodeScan(code.value);
	
			if (t.prefix === ScannedItemType.product) {
				const opts: IQueryStringParamsSingleFilter<ProductGroup> = { filter: {'infoData.barcode': t.fixedCode} };
				
				// return all variations to account for price changes so the return is correct total price
				if (this.isTabReturns())
					opts.keepAllVariations = true;

				const pgs = await this.queryProducts(opts);
				if (!pgs || !pgs[0])
					return LibSmallUtils.notify('Prodotto non Trovato', 'error');

				// collapse the saleable models
				const collapsed = !this.isTabReturns() && pgs[0].models.length === 1
					? pgs[0].models
					: this.collapseSaleableProducts(this.adjustPgAmount(pgs[0], this.activeTab.physicalLocation, this.activeTab.products));
				
				// check
				if (collapsed.length === 1)
					this.addProductToTab(collapsed[0])
				else
					this.onMultipleBarcodeProducts(collapsed, (p) => this.addProductToTab(p));
			}
		});
	}

	protected onMultipleBarcodeProducts(choices: Product[], onChoice: (p: Product) => void) {
		ProductGroupController.onMultipleBarcodeProducts(choices, onChoice);
	}

	/**
	 * Adds/Modifies the product in the current tab
	 */
	protected addProductToTab(p: Product, changeAmount = 1) {
		this.tabRef.current.addProductToTab(p, changeAmount);
	}

	/**
	 * Changes the tab shown
	 * @param idx Index of the new tab
	 */
	protected changeTab(idx: number) {
		return new Promise<void>((r, j) => {
			
			// save the prev info to compare
			let beforeLoc = this.activeTab.physicalLocation;
			let beforeIsReturn = this.isTabReturns();

			this.setState(
				{tabIndex: +idx, tabStates: {...this.state.tabStates, [this.state.tabIndex]: this.activeTab}},
				async () => {
					// recalculate the new tab if the new tab is a sale also and location is different
					if ((!beforeIsReturn || !this.isTabReturns()) && this.activeTab.physicalLocation !== beforeLoc)
						await this.readjustAmountForTab();

					r();
				}
			);
		});
	}

	/**
	 * recalculates the active 
	 */
	protected readjustAmountForTab() {
		return new Promise<void>((r, j) => {
			this.setState(
				s => ({productsList: [...s.productsList].map(pg => this.adjustPgAmount(pg, this.activeTab.physicalLocation, this.activeTab.products))}),
				() => r(),
			);
		});
	}

	/**
	 * Add products until the scrollbar is present and then the trigger is managed there
	 */
	protected ensureInfiniteScrollIsSetup() {
		// no more products to query
		if (!this.state.productsListHasMore)
			return;

		// check that the element has the scrollbar
		const el = (this.infiniteScrollRef.current as any).el as HTMLElement;
		const isScrollable = el.scrollHeight > el.clientHeight
		if (isScrollable)
			return;

		// recursive check to create the scrollbar
		this.onInfiniteScroll().then(() => this.ensureInfiniteScrollIsSetup());
	}

	/**
	 * Handles the infinite scroll callback
	 */
	protected onInfiniteScroll = async () => {
		return new Promise<void>((r, j) => {
			this.queryByName(this.state.searchValue, this.state.productsList.length).then(pgs => {
				this.setState(
					s => {
						const adjusted = pgs.map(pg => this.adjustPgAmount(pg, this.activeTab.physicalLocation, this.activeTab.products));
						const list = [...s.productsList, ...adjusted];
						return {productsList: list, productsListHasMore: pgs.length >= SaleDeskLogic.PRODUCTS_LIST_QUERY_LIMIT};
					},
					() => r(),
				);
			})
			.catch(e => j(e));
		});
	}

	/**
	 * Wheter the current tab is a return or sale tab
	 */
	protected isTabReturns(tabIdx = this.state.tabIndex) {
		return tabIdx === 1;
	}


	/**
	 * Adjust the available stock in different part of the ui based on the passed activeTab items
	 */
	protected adjustProductAmounts(activeTab: SDTState, prods: Product[]) {
		// no need to update
		if (this.isTabReturns())
			return;

		this.setState(s => {
			const update: Partial<SDState> = {};
	
			for (const prod of prods) {
				// adjust stock if present in search
				const list = update.productsList || [...s.productsList];
				update.productsList = list;
				const listIdx = list.findIndex(pg => pg._trackableGroupId === prod._trackableGroupId);
				if (listIdx !== -1)
					list[listIdx] = this.adjustPgAmount(list[listIdx], activeTab.physicalLocation, activeTab?.products);
		
				// adjust stock in pop models
				if (s.choseVariantMenu.open) {
					const menu = update.choseVariantMenu || {...s.choseVariantMenu, models: s.choseVariantMenu.models ? [...s.choseVariantMenu.models] : []}
					update.choseVariantMenu = menu;
					const idx = menu.models.findIndex(pm => pm._id === prod._id);
					if (idx !== -1)
						menu.models[idx] = this.adjustProductAmount(menu.models[idx], activeTab.physicalLocation, activeTab?.products);
				}
			}
	
			return update as Readonly<SDState>;
		});

	}

	/**
	 * Removes models that differ only in buyPrice or supplier
	 * if two "similar" models are found, it picks the one with the most amount
	 */
	protected collapseSaleableProducts(pg: AdjustedAmountPg): AdjustedAmountP[] {
		const cleared: AdjustedAmountP[] = [];

		for (const p of pg.models) {
			let exists = false;

			// now check for all the items cleared if the same item is present
			for (let i = 0; i < cleared.length; i++) {
				if (!ProductController.twoSaleableVariationsAreEqual(p, cleared[i]))
					continue;
				exists = true;
				
				// if the product in sale has amount 0 and the similar product has some amount left
				// then we sell the other product
				//
				// we do it only for sales 
				if (!this.isTabReturns() && cleared[i].__amountLeft < 1 && p.__amountLeft > 0)
					cleared[i] = p;
			}

			if (!exists)
				cleared.push(p);
		}
		
		return cleared;
	}

	/**
	 * Creates a temporary field that says how much amount is left for the active physical location
	 */
	protected adjustPgAmount(pg: ProductGroup, location: string, receiptProducts: PricedRowSale['products'] | undefined): AdjustedAmountPg {
		return { ...pg, models: pg.models.map(p => this.adjustProductAmount(p, location, receiptProducts)) };
	}

	protected adjustProductAmount(p: Product, location: string, receiptProducts: PricedRowSale['products'] | undefined): AdjustedAmountP {
		const inReceipt = (receiptProducts || []).find(l => l.item.id === p._id);
		const inUse = inReceipt ? inReceipt.amount : 0;
	
		return { ...p, __amountLeft: (p._amountData[location] || 0) - inUse };
	}

	/**
	 * Creates and sends the current tab to the correct destination
	 */
	protected async createCurrentTab(tab: SDTState, total: number) {

		const base: Omit<PricedRowsSaleModel<any>, 'status'> = {
			customer: tab.customer,
			list: [{
				coupons: tab.coupons,
				products: tab.products,
				manual: tab.manual,
				date: tab.date,
			}],
			payments: tab.payments || [],
			// ensure we never have a negative sale
			totalPrice: total < 0 ? 0 : total,

			physicalLocation: tab.physicalLocation,
			documentLocation: tab.physicalLocation,
			documentLocationsFilter: [tab.physicalLocation],
		};

		if (!base.customer)
			delete base.customer;

		for (let i = 0; i < base.list.length; i++)
			if (SaleController.isRowEmpty(base.list[i]))
				base.list.splice(i--, 1);

		// send if not empty
		if (!base.list.length)
			return;

		// add remaining to pay into the payments array manually
		// this is to correctly track the payment medium, otherwise it will be assigned as unspecified by the back end
		if (!tab.partialPayment) {
			const payed = base.payments.reduce((car, cur) => car += cur.amount, 0);
			const left = base.totalPrice - payed;
			if (left > 0)
				base.payments.push({ amount: left, date: moment().unix(), medium: tab.activePayMedium })
		}

		const sale = this.isTabReturns() ? await this.processIfReturnTab(base, tab) : await this.processIfSaleTab(base, tab);
		if (!sale)
			return;

		openReceiptModal({sale: sale, useCached: true, barcode: CodeScannerEventsService.encodeBarcodeType(ScannedItemType.sale, sale)});
	}
	
	/**
	 * processes the return tab creation
	 */
	protected async processIfReturnTab(base: Omit<PricedRowsSaleModel<any>, 'status'>, tab: SDTState): Promise<void> {
		// will be overridden by the child
	}

	/**
	 * processes the sale tab creation
	 */
	protected async processIfSaleTab(base: Omit<PricedRowsSaleModel<any>, 'status'>, tab: SDTState): Promise<Sale> {
		const sale: Sale = {
			...base,
			status: tab.partialPayment ? SaleStatus.successPrePay : SaleStatus.success,
		}

		return this.safeSend(new SaleController(), sale);
		// TODO implement
		// openReceiptModal({sale: savedsale, date: savedsale.date, payments: savedsale.payments && savedsale.notCompletelyPayed});
	}

	/**
	 * Sends a post request with a lock mechanism
	 */
	protected async safeSend<T extends CustomerReturn | Sale>(controller: T extends Sale ? SaleController : CustomerReturnController, item: T): Promise<T> {
		// TODO remove this flag when will update loading overlay
		if (this.currentlySendingSale)
			return;
		this.currentlySendingSale = true;
			
		const [e, d] = await to((controller as SaleController).post(item as Sale));
		// TODO remove this flag when will update loading overlay
		this.currentlySendingSale = false;

		if (e)
			throw e;

		LibSmallUtils.notify('Salvato con Successo!', 'success');
		this.tabRef.current.clearStateAfterCompleted();

		return d as T;
	}

}


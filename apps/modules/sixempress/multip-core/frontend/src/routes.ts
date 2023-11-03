import { editorComponentId, RouteDeclaration, Helpers, wrapped } from '@sixempress/main-fe-lib';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import { CustomersTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customers.table';
import { CustomerEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/customer.editor';
import { SalesTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sales/sales.table';
import SupervisedUserCircle from '@material-ui/icons/SupervisedUserCircle';
import LocalShipping from '@material-ui/icons/LocalShipping';
import DashboardRounded from '@material-ui/icons/DashboardRounded';
import VpnKey from '@material-ui/icons/VpnKey';
import Redeem from '@material-ui/icons/Redeem';
import { MovementsTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/table/movements.table';
import { MovementEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/table/movement.editor';
import { Dashboard } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/dashboard/dashboard';
import { RootRedirect } from 'apps/modules/sixempress/multip-core/frontend/src/utils/root-redirect';
import { MovementTabs } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/movements-tabs';
import { MovementsPage } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/page/movements-page';
import { CustomerOrdersTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/customer-orders/table/customer-orders.table';
import { CustomerOrderEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/customer-orders/table/customer-order.editor';
import AllInbox from '@material-ui/icons/AllInbox';
import Language from '@material-ui/icons/Language';
import CompareArrows from '@material-ui/icons/CompareArrows';
import Storefront from '@material-ui/icons/Storefront';
import Autorenew from '@material-ui/icons/Autorenew';
import Dns from '@material-ui/icons/Dns';
import BarChart from '@material-ui/icons/BarChart';
import AssignmentInd from '@material-ui/icons/AssignmentInd';
import { SupplierTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.table';
import { SupplierEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/suppliers/supplier.editor';
import { ProductCategoriesList } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/inventory-categories/inventory-categories.list';
import { ProductsTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/table/products.table';
import { SingleProductEditor as ProductEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/table/product-editor/single/single-product.editor';
import { ProductsTabs } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/products-tab';
import { ProductTableEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/table/product-editor/table-editor/product-table-editor';
import { ProductManualQt } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/list/product-amount-manual/product-amount-manual';
import { PrintBarcodeProductList } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/list/print-barcodes/print-barcode-product-list';
import { ProductsDashboard } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/products/dashboard/products-dashboard';
import { CustomerDetails } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/customers/details/customer-details';
import { NetIncomeOverview } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sales/net-income-overview/net-income-overview';
import { BaseExternalConnectionConfiguration } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/external-connections/base-external-connection-configuration';
import { ExtConnTabs } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/external-connections/ext-conn.tabs';
import { RawFilesTables } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/external-connections/raw-files/raw-files-tables';
import { InternalOrdersTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/internal-orders/table/internal-orders.table';
import { InternalOrderEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/internal-orders/table/internal-order.editor';
import { OrdersTab } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/orders-tab';
import { ReturnsTab } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/returns.tab';
import { TransferOrdersTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/transfer-orders/table/transfer-orders.table';
import { TransferOrderEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/orders/transfer-orders/table/transfer-order.editor';
import { CustomerReturnEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/customer-returns/table/customer-return.editor';
import { CustomerReturnsTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/customer-returns/table/customer-returns.table';
import { SaleAnalysisTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/SaleAnalysis.table';
import { SaleAnalysisTabs } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sale-analyses/tabs/sale-analysis.tabs';
import { SaleDesk } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sales/sale-desk/sale-desk';
import { SaleEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/sales/sale.editor';
import { SupplierReturnsTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/supplier-returns/table/supplier-returns.table';
import { SupplierReturnEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/returns/supplier-returns/table/supplier-return.editor';
import { CouponTable } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/coupon.table';
import { CouponEditor } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/coupons/coupon.editor';
import { CashierPage } from 'apps/modules/sixempress/multip-core/frontend/src/components/multi-purpose/movements/page/cashier-page';
import { IAvailableRoute } from 'apps/modules/sixempress/theme/frontend/src/components/main-wrapper/main-wrapper.dtd';
import { ErrorReportTable } from './base-components/error-report/errorreports.table';
import { ExceptionTable } from './base-components/exceptions/exceptions.table';

const editorParam = ":" + editorComponentId;

export function getRoutes(): IAvailableRoute[] {
	return normalizeSidebar(getRawSidebarRoutes());
}

function getRawSidebarRoutes(): IAvailableRoute[] {
	const routes = use_filter.sidebar_routes([]);
	const list: IAvailableRoute[] = [
		{
			type: 'route',
			attribute: [Attribute.viewDashboard],
			label: 'Dashboard',
			routeLink: 'dashboard',
			icon: DashboardRounded
		},
		!routes.length ? undefined : { type: 'divider' },
		...(routes.map(p => ({
			type: 'route',
			label: p.name,
			routeLink: p.path,
			icon: p.icon,
		}) as any)),
		{ type: 'divider', attribute: [Attribute.viewDashboard] },
		{
			type: 'route',
			attribute: [Attribute.viewCustomers],
			label: 'Clienti',
			routeLink: 'customers',
			icon: SupervisedUserCircle
		},
		{
			type: 'route',
			attribute: [Attribute.viewCustomerOrder, Attribute.viewInternalOrder],
			label: 'Ordini',
			routeLink: 'orders',
			icon: LocalShipping
		},
		{ type: 'divider', attribute: [Attribute.viewCustomers] },
		{
			type: 'collection',
			attribute: [Attribute.viewProducts, Attribute.viewSuppliers, Attribute.viewInventoryCategories],
			icon: Dns,
			label: 'Magazzino',
			items: [
				{
					type: 'route',
					attribute: [Attribute.viewProducts],
					label: 'Prodotti',
					routeLink: 'products',
					icon: AllInbox
				},
				{
					type: 'route',
					attribute: [Attribute.viewCustomerReturns],
					label: 'Reso',
					routeLink: 'returns',
					icon: Autorenew
				},
				{
					type: 'route',
					attribute: [Attribute.viewCoupon],
					label: 'Buono Cassa',
					routeLink: 'coupons',
					icon: Redeem
				},
				{
					type: 'route',
					attribute: [Attribute.viewSuppliers],
					label: 'Fornitori',
					routeLink: 'suppliers',
					icon: AssignmentInd
				},
			]
		},
		{
			type: 'route',
			attribute: [Attribute.addSales],
			label: 'Cassa',
			routeLink: 'saledesk',
			icon: Storefront,
			// icon: Storefront,	
		},
		{
			type: 'route',
			attribute: [Attribute.viewMovements, Attribute.viewSales],
			label: 'Movimenti',
			routeLink: 'movements',
			icon: CompareArrows
		},
		{
			type: 'route',
			attribute: [Attribute.viewSaleAnalysis],
			label: 'Analisi',
			routeLink: 'saleanalysis',
			icon: BarChart
		},
		{ type: 'divider' },
		{
			type: 'route',
			attribute: [Attribute.viewExternalConnection],
			icon: Language,
			label: 'Collegamenti Est.',
			routeLink: 'extconn'
		},
	];

	recursiveRouteCheck(list);
	return list;
}


function recursiveRouteCheck(list: IAvailableRoute[]) {
	Helpers.checkAttributes(list);
	for (const l of list)
		if (l.type === 'collection')
			recursiveRouteCheck(l.items);
}

export function getAppRoutes(): RouteDeclaration[] {
	return normalizeAppRoutes(rawAppRoutes());
}

function rawAppRoutes(): RouteDeclaration[] {
	const routes = use_filter.sidebar_routes([]);
	function convert(r: typeof routes[0]) {
		return ({
			path: r.path,
			component: r.component,
			children: (r.childrens || []).map(i => convert(i))
		})
	};

	return [
		{
			path: '',
			component: RootRedirect,
		},
		{
			path: 'dashboard',
			component: Dashboard,
		},
		...(routes.map(r => convert(r))),
		{
			path: 'customers',
			component: CustomersTable,
			children: [{
				path: 'details',
				children: [{
					path: ':customerDetailsId',
					component: CustomerDetails,
				}]
			}, {
				path: 'editor',
				component: CustomerEditor,
				children: [{
					path: editorParam,
					component: CustomerEditor,
				}]
			}]
		},
		{
			path: 'orders',
			component: OrdersTab,
			handleChildren: true,
			children: [
				{
					path: 'customer',
					component: CustomerOrdersTable,
					children: [{
						path: 'editor',
						component: CustomerOrderEditor,
						children: [{
							path: editorParam,
							component: CustomerOrderEditor,
						}]
					}]
				},
				{
					path: 'internal',
					component: InternalOrdersTable,
					children: [{
						path: 'editor',
						component: InternalOrderEditor,
						children: [{
							path: editorParam,
							component: InternalOrderEditor,
						}]
					}]
				},
				{
					path: 'transfer',
					component: TransferOrdersTable,
					children: [{
						path: 'editor',
						component: TransferOrderEditor,
						children: [{
							path: editorParam,
							component: TransferOrderEditor,
						}]
					}]
				},
			]
		},
		{
			path: 'returns',
			component: ReturnsTab,
			handleChildren: true,
			children: [
				{
					path: 'customer',
					component: CustomerReturnsTable,
					children: [{
						path: 'editor',
						component: CustomerReturnEditor,
						children: [{
							path: editorParam,
							component: CustomerReturnEditor,
						}]
					}]
				},
				{
					path: 'supplier',
					component: SupplierReturnsTable,
					children: [{
						path: 'editor',
						component: SupplierReturnEditor,
						children: [{
							path: editorParam,
							component: SupplierReturnEditor,
						}]
					}]
				},
			]
		},
		{
			path: 'coupons',
			component: CouponTable,
			children: [{
				path: 'editor',
				component: CouponEditor,
				children: [{
					path: editorParam,
					component: CouponEditor,
				}]
			}]
		},
		{
			path: 'products',
			component: ProductsTabs,
			handleChildren: true,
			children: [
				{
					path: 'dashboard',
					component: ProductsDashboard,
				},
				{
					path: 'table',
					component: ProductsTable,
					children: [{
						path: 'editor',
						component: ProductEditor,
						children: [{
							path: editorParam,
							component: ProductEditor,
						}]
					}, {
						path: 'table-editor',
						component: ProductTableEditor,
					}, {
						path: 'manualqt',
						component: ProductManualQt,
					}, {
						path: 'printbarcode',
						component: PrintBarcodeProductList,
					}]
				},
				{
					path: 'categories',
					component: ProductCategoriesList,
				},
			],
		},
		{
			path: 'movements',
			component: MovementTabs,
			handleChildren: true,
			children: [
				{
					path: 'cashier',
					component: CashierPage,
				},
				{
					path: 'table',
					component: MovementsTable,
					children: [{
						path: 'editor',
						component: MovementEditor,
						children: [{
							path: editorParam,
							component: MovementEditor,
						}]
					}]
				},
				{
					path: 'sales',
					component: SalesTable,
					children: [{
						path: 'editor',
						component: SaleEditor,
						children: [{
							path: editorParam,
							component: SaleEditor,
						}]
					}]
				},
			]
		},
		{
			path: 'saledesk',
			component: SaleDesk,
		},
		{
			path: 'saleanalysis',
			component: SaleAnalysisTabs,
			handleChildren: true,
			children: [
				{
					path: 'table',
					component: SaleAnalysisTable,
				},
				{
					path: 'report',
					component: MovementsPage,
				},
				{
					path: 'netincome',
					component: NetIncomeOverview,
				},
			]
		},
		{
			path: 'extconn',
			component: ExtConnTabs,
			handleChildren: true,
			children: [
				{
					path: 'configuration',
					component: BaseExternalConnectionConfiguration,
				},
				{
					path: 'rawfiles',
					component: RawFilesTables,
				}
			]
		},
		{
			path: 'suppliers',
			component: SupplierTable,
			children: [{
				path: 'editor',
				component: SupplierEditor,
				children: [{
					path: editorParam,
					component: SupplierEditor,
				}]
			}]
		},
		{
			path: 'erroreports',
			component: ErrorReportTable,
		},
		{
			path: 'exceptions',
			component: ExceptionTable,
		}
	]
}


function normalizeAppRoutes(cnf: RouteDeclaration[]): RouteDeclaration[] {
	const fixed: RouteDeclaration[] = [];
	function recursiveWrap(r: RouteDeclaration[]) {
		for (const i of r) {
			if (!i)
				continue;
			if (i.component)
				i.component = wrapped(i.component);
			if (i.children)
				recursiveWrap(i.children)
		}
	}

	recursiveWrap(cnf);
	fixed.push(...cnf);
	return fixed;
}

function normalizeSidebar(cnf: IAvailableRoute[]): IAvailableRoute[] {
	const fixed: IAvailableRoute[] = [];
	function recursiveWrap(r: IAvailableRoute[]) {
		for (const i of r) {
			if (!i)
				continue;

			if (i.type === 'collection') {
				if (i.icon)
					i.icon = wrapped(i.icon);
				if (i.items)
					recursiveWrap(i.items);
			}
			else if (i.type === 'route') {
				if (i.icon)
					i.icon = wrapped(i.icon);
			}
		}
	}

	recursiveWrap(cnf);
	fixed.push(...cnf);
	return fixed;
}

export { registerControllers } from './app/register-controllers';

export * from './types/hooks';

export * from './app/utils/enums/model-class.enum';
export * from './app/utils/enums/attributes.enum';
export * from './app/utils/trackable-variations/TrackableVariation';
export * from './app/utils/priced-rows/priced-rows.dtd';
export * from './app/utils/priced-rows-sale/priced-rows-sale.dtd';
export * from './app/utils/priced-rows-sale/priced-rows-sale.controller';

export * from './app/services/multip-config/sync-config.service';
export * from './app/services/multip-config/multip-config.dtd';

//
// Controllers
//
export * from './app/paths/products/Product';
export * from './app/paths/products/ProductGroup';
export * from './app/paths/products/Product.controller';
export * from './app/paths/products/ProductGroup.controller';
export * from './app/paths/products/product-movements/ProductMovement';
export * from './app/paths/products/product-movements/ProductMovement.controller';
export * from './app/paths/products/product-movements/ProductMovement.controller';
export * from './app/paths/product-variants/ProductVariant';
export * from './app/paths/product-variants/ProductVariants.controller';
export * from './app/paths/suppliers/Supplier';
export * from './app/paths/suppliers/Supplier.controller';
export * from './app/paths/supplier-returns/SupplierReturn.controller';
export * from './app/paths/supplier-returns/SupplierReturn.dtd';
export * from './app/paths/customer-returns/CustomerReturn';
export * from './app/paths/customer-returns/CustomerReturn.controller';
export * from './app/paths/inventory-categories/InventoryCategory';
export * from './app/paths/inventory-categories/InventoryCategory.controller';
export * from './app/paths/sale-analyses/SaleAnalysis.controller';
export * from './app/paths/sale-analyses/SaleAnalysis.dtd';
export * from './app/paths/sales/Sale';
export * from './app/paths/sales/Sale.controller';
export * from './app/paths/internal-orders/InternalOrder.controller';
export * from './app/paths/internal-orders/InternalOrder.dtd';
export * from './app/paths/transfer-orders/TransferOrder.controller';
export * from './app/paths/transfer-orders/TransferOrder.dtd';
export * from './app/paths/customer-orders/CustomerOrder.controller';
export * from './app/paths/customer-orders/CustomerOrder.dtd';
export * from './app/paths/movements/Movement';
export * from './app/paths/movements/Movement.controller';
export * from './app/paths/customers/Customer.controller';
export * from './app/paths/customers/Customer.dtd';
export * from './app/paths/coupons/Coupon.controller';
export * from './app/paths/coupons/Coupon.dtd';
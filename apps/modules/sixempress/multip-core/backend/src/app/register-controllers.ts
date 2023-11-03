import { CouponController, CustomerController, CustomerOrderController, CustomerReturnController, InternalOrderController, InventoryCategoryController, MovementController, ProductController, ProductGroupController, ProductMovementController, ProductVariantsController, SaleAnalysisController, SaleController, SupplierController, SupplierReturnController, TransferOrderController } from "@sixempress/be-multi-purpose";
import { AbstractDbApiItemController, ControllersService, ExceptionController, Type } from "@sixempress/main-be-lib";
import { ErrorReportController } from "./paths/errorreport/ErrorReport.controller";

export function registerControllers() {
  const dbItems = [
    CustomerController,
    ProductVariantsController,
    InventoryCategoryController,
    MovementController,
    SupplierController,
    ProductController,
    SaleController,

    InternalOrderController,
    TransferOrderController,
    CustomerReturnController,
    SupplierReturnController,
    CouponController,

    ProductMovementController,
    ProductGroupController,
    ProductMovementController,
    CustomerOrderController,
    SaleAnalysisController,
    SaleController,
    ErrorReportController,
    ExceptionController,
  ];

  for (const c of dbItems)
    ControllersService.registerController(c as any as typeof AbstractDbApiItemController);

  return dbItems;
}
import { FetchableField as _FetchableField, ControllersService, UserController, UserRoleController, AbstractDbItemController, Type, ObjectUtils, CrudCollection } from "@sixempress/main-be-lib";
import { connectToMongo } from "@sixempress/main-be-lib-tests";
import { CustomerController } from '../paths/customers/Customer.controller';
import { ProductVariantsController } from '../paths/product-variants/ProductVariants.controller';
import { InventoryCategoryController } from '../paths/inventory-categories/InventoryCategory.controller';
import { MovementController } from '../paths/movements/Movement.controller';
import { SupplierController } from '../paths/suppliers/Supplier.controller';
import { MultipTestTools, TestTools } from "./commonTests";
import { ObjectId } from "mongodb";
import { ModelClass } from "../utils/enums/model-class.enum";
import { CustomerOrderController } from "../paths/customer-orders/CustomerOrder.controller";
import { ProductController } from "../paths/products/Product.controller";
import { TransferOrderController } from "../paths/transfer-orders/TransferOrder.controller";
import { InternalOrderController } from "../paths/internal-orders/InternalOrder.controller";

(global as any).tt = {
	...TestTools,
	...MultipTestTools,
};


// the raw object is not equal to instance for jest
export class FetchableField<T = any> extends _FetchableField<any> {
	constructor(a: string | ObjectId, b: ModelClass | (string & {}), ...args) {
		super(a, b, ...args);
		return ObjectUtils.cloneDeep(this);
	}
}

export const testSlug = tt.testSlug;
export const appUse = tt.appUse;
export const generateAuthzString = tt.generateAuthzString;
export const generateRequestObject = tt.generateRequestObject;
export const dropDatabase = tt.dropDatabase;

beforeAll(() => {
	CrudCollection.isEnabled = false;
	const cs = [
		CustomerController,
		UserController,
		UserRoleController,
		InternalOrderController,
		ProductVariantsController,
		InventoryCategoryController,
		MovementController,
		SupplierController,
		CustomerOrderController,
		ProductController,
		TransferOrderController,
	];
	for (const co of cs) { addControllerToService(co); }
});


export function addControllerToService(co: Type<AbstractDbItemController<any>>) {
	const c = new (co as any)();
	ControllersService['modelClassControllerInfoHM'][c.modelClass] = {
		bePath: c.bePath,
		modelClass: c.modelClass,
		controller: co,
	};
}

connectToMongo();

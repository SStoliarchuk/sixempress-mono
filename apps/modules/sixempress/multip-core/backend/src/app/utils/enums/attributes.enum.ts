/**
 * For custom attributes found in the SingleClientAbstract
 * Start the values from 1000,
 * The first 1000 values should be private values for the system
 * 
 * The logic of the attributes should be that every attribute ADDS a feature to the system
 * ATTRIBUTES SHOULD NOT BE USED TO PREVENT A FEATURE, ONLY TO ADD A FEATURE
 * 
 */
export const Attribute = {
	changeSystemContentConfig: 'sx_sc',

	viewCustomers: 10000,
	addCustomers: 10001,
	modifyCustomers: 10002,
	deleteCustomers: 10003,

	// 11000 is blocked

	// temporary disabling this viewProductMovements stuff
	// because it need recursive attr check to be sure that when you sellproduct
	// you can see the amount
	// TODO fix 
	viewProductMovements: 12000,
	addProductMovements: 12001,
	modifyProductMovements: 12002,
	
	viewProducts: 13000,
	addProducts: 13001,
	modifyProducts: 13002,
	deleteProducts: 13003,
	viewProductsReport: 13004,
	viewProductBuyPrice: 13005,
	viewProductSellPrice: 13006,

	viewInventoryCategories: 14000,
	addInventoryCategories: 14001,
	modifyInventoryCategories: 14002,
	deleteInventoryCategories: 14003,

	// 15000 -> 17000 is blocked

	viewSales: 18000,
	addSales: 18001,
	modifySales: 18002,
	deleteSales: 18003,
	viewSaleNetReport: 18004,
	allowSaleDiscount: 18005,

	viewMovements: 19000,
	addMovements: 19001,
	modifyMovements: 19002,
	deleteMovements: 19003,
	/**
	 * The movements has an option
	 * that they are hidden to all the users
	 * that don't have this attribute
	 */
	viewHiddenMovements: 19004,
	viewAllTimeMovements: 19005,
	viewMovementsReport: 19006,
	// viewSplitMovementReport= 19007,
	
	viewSuppliers: 21000,
	addSuppliers: 21001,
	modifySuppliers: 21002,
	deleteSuppliers: 21003,

	// 22000 -> 23000 is blocked

	viewRawFiles: 24000,
	addRawFiles: 24001,
	modifyRawFiles: 24002,
	deleteRawFiles: 24003,

	// 25000 -> 27000 is blocked

	viewProductVariants: 28000,
	addProductVariants: 28001,
	modifyProductVariants: 28002,
	deleteProductVariants: 28003,

	viewCustomerOrder: 29000,
	addCustomerOrder: 29001,
	modifyCustomerOrder: 29002,
	deleteCustomerOrder: 29003,

	// 30000 -> 34000 is blocked

	viewCustomerReturns: 35000,
	addCustomerReturns: 35001,
	modifyCustomerReturns: 35002,
	deleteCustomerReturns: 35003,

	viewExternalConnection: 36000,
	addExternalConnection: 36001,
	modifyExternalConnection: 36002,
	deleteExternalConnection: 36003,

	// 37000 -> 38000 is blocked

	viewInternalOrder: 39000,
	addInternalOrder: 39001,
	modifyInternalOrder: 39002,
	deleteInternalOrder: 39003,

	viewTransferOrder: 40000,
	addTransferOrder: 40001,
	modifyTransferOrder: 40002,
	deleteTransferOrder: 40003,

	viewSaleAnalysis: 41000,
	addSaleAnalysis: 41001,
	modifySaleAnalysis: 41002,
	deleteSaleAnalysis: 41003,

	viewDashboard: 42000,

	viewSupplierReturn: 43000,
	addSupplierReturn: 43001,
	modifySupplierReturn: 43002,
	deleteSupplierReturn: 43003,

	viewCoupon: 44000,
	addCoupon: 44001,
	modifyCoupon: 44002,
	deleteCoupon: 44003,
}
const ModelClass = {
	ApiKey                    : 'ApiKeyModel',
	UserRole                  : 'UserRoleModel',
	User                      : 'UserModel',
	// TODO remove this ?
	MediaFile                 : 'MediaFileModel',

	Customer                  : 'CustomerModel',
	Supplier                  : 'SupplierModel',
	CalendarEvent             : 'CalendarEventModel',

	Repair                    : 'RepairModel',
	Equipment                 : 'EquipmentModel',
	Intervention              : 'InterventionModel',
	InventoryCategory         : 'InventoryCategoryModel',
	CustomerReturn            : 'CustomerReturnModel',
	
	Product                   : 'ProductModel',
	// just for interal purpose
	ProductMovement           : 'ProductMovementModel',
	BusinessService           : 'BusinessServiceModel',
	
	ProductVariant            : 'ProductVariantModel',
	UsedProduct               : 'UsedProductModel',
	
	Sale                      : 'SaleModel',
	Movement                  : 'MovementModel',
	
	CustomerTreatment         : 'CustomerTreatmentModel',

	RawFile                   : 'RawFileModel',
	MapPlace                  : 'MapPlaceModel',
	CustomerOrder : 'CustomerOrderModel',
	InternalOrder : 'InternalOrderModel',
	TransferOrder : 'TransferOrderModel',
	SaleAnalysis : 'SaleAnalysisModel',
	SupplierReturn : 'SupplierReturnModel',
	Coupon : 'CouponModel',

  ApiKey: 'ApiKeyModel',
	UserRole: 'UserRoleModel',
	User: 'UserModel',
	
	Log: 'LogModel',
	Exception: 'ExceptionModel',
	ErrorReport: 'ErrorReportModel',
  Configuration :'ConfigurationModel',
	Counters: 'IncrementalCounterModel',
  RequestBytesTrace : 'RequestBytesTraceModel',
}

const SysCollection = {
	User                      : 'users',
	UserRole                  : 'userroles',
	ApiKey                    : 'apikeys',
	Counters                  : 'incrementalcounters',
	Customer                  : 'clients',
	Supplier                 : 'suppliers',
	CalendarEvent             : 'calendarevents',
	
	Repair                    : 'repairs',
	Equipment                 : 'equipments',
	Intervention              : 'interventions',
	BusinessService          : 'businessservices',
	InventoryCategory       : 'inventorycategories',
	CustomerReturn           : 'customerreturns',
	
	Product                   : 'products',
	ProductMovement           : 'productmovements',

	ProductVariant            : 'productvariants',
	UsedProduct               : 'usedproducts',
	
	Sale                      : 'sales',
	Movement                  : 'movements',

	CustomerTreatment         : 'customertreatments',

	MediaFile                 : 'mediafiles',
	MapPlace                  : 'mapplaces',
	
	CustomerOrder : 'customerorders',
	InternalOrder : 'internalorders',
	TransferOrder : 'transferorders',
	SaleAnalysis : 'saleanalyses',
	SupplierReturn : 'supplierreturns',
	Coupon : 'coupons',

  User :'users',
  UserRole :'userroles',
  ApiKey :'apikeys',

  PatchAndPost :'patchAndPost',
  Exception :'exceptions',

	/**
	 * This is a collection where all the configuration of a server should be
	 * The items should contain a "type" or something to render them unique from each other
	 * Use SysConfigurationType for the types
	 */
  Configuration :'configurations',
	
  RequestBytesTrace :'requeststrace',
  Counters :'incrementalcounters',
}

const map = {
	[SysCollection.User]: ModelClass.User,
	[SysCollection.UserRole]: ModelClass.UserRole,
	[SysCollection.ApiKey]: ModelClass.ApiKey,
	[SysCollection.Customer]: ModelClass.Customer,
	[SysCollection.Supplier]: ModelClass.Supplier,
	[SysCollection.CalendarEvent]: ModelClass.CalendarEvent,
	[SysCollection.Repair]: ModelClass.Repair,
	[SysCollection.Equipment]: ModelClass.Equipment,
	[SysCollection.Intervention]: ModelClass.Intervention,
	[SysCollection.BusinessService]: ModelClass.BusinessService,
	[SysCollection.InventoryCategory]: ModelClass.InventoryCategory,
	[SysCollection.CustomerReturn]: ModelClass.CustomerReturn,
	[SysCollection.Product]: ModelClass.Product,
	[SysCollection.ProductMovement]: ModelClass.ProductMovement,
	[SysCollection.ProductVariant]: ModelClass.ProductVariant,
	[SysCollection.UsedProduct]: ModelClass.UsedProduct,
	[SysCollection.Sale]: ModelClass.Sale,
	[SysCollection.Movement]: ModelClass.Movement,
	[SysCollection.CustomerTreatment]: ModelClass.CustomerTreatment,
	[SysCollection.MediaFile]: ModelClass.MediaFile,
	[SysCollection.MapPlace]: ModelClass.MapPlace,
	[SysCollection.CustomerOrder]: ModelClass.CustomerOrder,
	[SysCollection.InternalOrder]: ModelClass.InternalOrder,
	[SysCollection.TransferOrder]: ModelClass.TransferOrder,
	[SysCollection.SaleAnalysis]: ModelClass.SaleAnalysis,
	[SysCollection.SupplierReturn]: ModelClass.SupplierReturn,
	[SysCollection.Coupon]: ModelClass.Coupon,
	[SysCollection.Counters]: ModelClass.Counters,
	[SysCollection.PatchAndPost]: ModelClass.Log,
  [SysCollection.Exception]: ModelClass.Exception,
  [SysCollection.Configuration]: ModelClass.Configuration,
  [SysCollection.RequestBytesTrace]: ModelClass.RequestBytesTrace,
};

(() => {
  for (const k in SysCollection)
    console.log(`db.${SysCollection[k]}.renameCollection("${map[SysCollection[k]]}")`)

/*
db.users.renameCollection("UserModel")
db.userroles.renameCollection("UserRoleModel")
db.apikeys.renameCollection("ApiKeyModel")
db.incrementalcounters.renameCollection("IncrementalCounterModel")
db.clients.renameCollection("CustomerModel")
db.suppliers.renameCollection("SupplierModel")
db.calendarevents.renameCollection("CalendarEventModel")
db.repairs.renameCollection("RepairModel")
db.equipments.renameCollection("EquipmentModel")
db.interventions.renameCollection("InterventionModel")
db.businessservices.renameCollection("BusinessServiceModel")
db.inventorycategories.renameCollection("InventoryCategoryModel")
db.customerreturns.renameCollection("CustomerReturnModel")
db.products.renameCollection("ProductModel")
db.productmovements.renameCollection("ProductMovementModel")
db.productvariants.renameCollection("ProductVariantModel")
db.usedproducts.renameCollection("UsedProductModel")
db.sales.renameCollection("SaleModel")
db.movements.renameCollection("MovementModel")
db.customertreatments.renameCollection("CustomerTreatmentModel")
db.mediafiles.renameCollection("MediaFileModel")
db.mapplaces.renameCollection("MapPlaceModel")
db.customerorders.renameCollection("CustomerOrderModel")
db.internalorders.renameCollection("InternalOrderModel")
db.transferorders.renameCollection("TransferOrderModel")
db.saleanalyses.renameCollection("SaleAnalysisModel")
db.supplierreturns.renameCollection("SupplierReturnModel")
db.coupons.renameCollection("CouponModel")
db.patchAndPost.renameCollection("LogModel")
db.exceptions.renameCollection("ExceptionModel")
db.configurations.renameCollection("ConfigurationModel")
db.requeststrace.renameCollection("RequestBytesTraceModel")
*/



// /root/workspace/sxref/be-multi-purpose/src/paths/multi-purpose/legacy_auth/legacy_auth.ts

/*
db.UserModel.updateMany({}, {$unset: {attributes: 1}});
// get password from /tmp/password;
db.UserModel.updateMany({}, {$set: {password: ""}});

db.ConfigurationModel.updateOne({__sysConfigObjectType: 3}, {$set: {__sysConfigObjectType: 'sxmp_content'}})

// replace locations with the system ones
db.ConfigurationModel.replaceOne({__sysConfigObjectType: 'sxmp_labac_conf_locations_data'}, {
	__sysConfigObjectType: 'sxmp_labac_conf_locations_data',
	locations: []
}, {upsert: true});

// replace ext connections
db.ConfigurationModel.replaceOne({__sysConfigObjectType: 'sxmp_ext_conn'}, {
	__sysConfigObjectType: 'sxmp_ext_conn',
	externalConnections: [],
}, {upsert: true});

*/
})();
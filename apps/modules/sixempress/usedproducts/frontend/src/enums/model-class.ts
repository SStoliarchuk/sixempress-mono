// DO NOT CHANGE THESE ONLY ADD
export enum ModelClass {
	// TODO remove this ?
	MediaFile                 = 'MediaFileModel',

	Customer                  = 'CustomerModel',
	Supplier                  = 'SupplierModel',
	CalendarEvent             = 'CalendarEventModel',

	Repair                    = 'RepairModel',
	InventoryCategory         = 'InventoryCategoryModel',
	CustomerReturn            = 'CustomerReturnModel',
	
	Product                   = 'ProductModel',
	// just for interal purpose
	ProductGroup              = 'ProductGroupModel',
	ProductMovement           = 'ProductMovementModel',
	BusinessService           = 'BusinessServiceModel',
	
	ProductVariant            = 'ProductVariantModel',
	UsedProduct               = 'UsedProductModel',
	
	Sale                      = 'SaleModel',
	Movement                  = 'MovementModel',
	
	CustomerOrder             = 'CustomerOrderModel',
	CustomerTreatment         = 'CustomerTreatmentModel',

	RawFile                   = 'RawFileModel',

	InternalOrder = 'InternalOrderModel',
	TransferOrder = 'TransferOrderModel',
	SaleAnalysis = 'SaleAnalysisModel',
}

export enum ModelClassLabel {

	'Cliente'                    = ModelClass.Customer,
	'Fornitore'                  = ModelClass.Supplier,
	'EventoCalendario'           = ModelClass.CalendarEvent,

	'Riparazione'                = ModelClass.Repair,
	'Categoria'                  = ModelClass.InventoryCategory,
	'Reso'                       = ModelClass.CustomerReturn,
	
	'Prodotto'                   = ModelClass.Product,
	'Prodotto '                  = ModelClass.ProductGroup,
	'Movimento Prodotto'         = ModelClass.ProductMovement,
	'Servizio'                   = ModelClass.BusinessService,
	
	'Variante Prodotto'          = ModelClass.ProductVariant,
	'Usato'                      = ModelClass.UsedProduct,
	
	'Vendita'                    = ModelClass.Sale,
	'Movimento Economico'        = ModelClass.Movement,
	
	'Ordine Cliente'             = ModelClass.CustomerOrder,
	'Trattamento Cliente'        = ModelClass.CustomerTreatment,

	'File'                       = ModelClass.RawFile,

	'Ordine Interno'             = ModelClass.InternalOrder,
	'Ordine Trasferimento'       = ModelClass.TransferOrder,
	'Analisi Vendita'            = ModelClass.SaleAnalysis,
}


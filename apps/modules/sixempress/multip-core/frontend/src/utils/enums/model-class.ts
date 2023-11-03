// DO NOT CHANGE THESE ONLY ADD
export enum ModelClass {
	// TODO remove this ?
	MediaFile                 = 'MediaFileModel',

	Customer                  = 'CustomerModel',
	Supplier                  = 'SupplierModel',

	InventoryCategory         = 'InventoryCategoryModel',
	CustomerReturn            = 'CustomerReturnModel',
	
	Product                   = 'ProductModel',
	// just for interal purpose
	ProductGroup              = 'ProductGroupModel',
	ProductMovement           = 'ProductMovementModel',
	
	ProductVariant            = 'ProductVariantModel',
	
	Sale                      = 'SaleModel',
	Movement                  = 'MovementModel',
	
	CustomerOrder             = 'CustomerOrderModel',

	InternalOrder = 'InternalOrderModel',
	TransferOrder = 'TransferOrderModel',
	SaleAnalysis = 'SaleAnalysisModel',
	SupplierReturn = 'SupplierReturnModel',
	Coupon = 'CouponModel',
	CustomerTicket = 'CustomerTicketModel',
}

export function getModelClassLabel() {
	const base = {
		[ModelClass.Customer]            : 'Cliente',
		[ModelClass.Supplier]            : 'Fornitore',
	
		[ModelClass.InventoryCategory]   : 'Categoria',
		[ModelClass.CustomerReturn]      : 'Reso Cliente',
		[ModelClass.SupplierReturn]      : 'Reso Fornitore',
	
		[ModelClass.Product]             : 'Prodotto',
		[ModelClass.ProductGroup]        : 'Prodotto ',
		[ModelClass.ProductMovement]     : 'Movimento Prodotto',
		
		[ModelClass.ProductVariant]      : 'Variante Prodotto',
		
		[ModelClass.Sale]                : 'Vendita',
		[ModelClass.Movement]            : 'Movimento Economico',
		
		[ModelClass.CustomerOrder]       : 'Ordine Cliente',
		[ModelClass.InternalOrder]       : 'Ordine Interno',
		[ModelClass.TransferOrder]       : 'Ordine Trasferimento',
		[ModelClass.SaleAnalysis]        : 'Analisi Vendita',
		[ModelClass.Coupon]              : 'Buono Cassa',
		[ModelClass.CustomerTicket]      : 'Ticket Supporto',
	};

	return use_filter.sxmp_modelclass_labels(base) as typeof base;
}


export enum BePaths {
	customers                     = 'clients/',
	suppliers                     = 'suppliers/',
	customerreturns               = 'customerreturns/',
	
	products                      = 'products/',
	productdetails                = 'products/details/',
	productmovements              = 'productmovements/',
	
	businessservices              = 'businessservices/',

	productvariants               = 'productvariants/',
	inventorycategories           = 'inventorycategories/',
	
	sales                         = 'sales/',
	movements                     = 'movements/',
	
	customerorders                = 'customerorders/',

	rawfiles                      = 'rawfiles/',

	logs                          = 'logs/',
	exceptions                    = 'exceptions/',
	
	movementdatareportsplit       = 'datareport/movements/split',
	movementdatagraph             = 'datareport/movements/graph',
	productsdatareport            = 'datareport/products/',
	dashboarddata                 = 'datareport/dashboard/',
	errorreport                   = 'errorreport/',
	

	clientsysteminfo              = 'clientsysteminfo/',
	clientsystemusagestate        = 'clientsystemusagestate/',
	multipsysteminfo              = 'multipsysteminfo/',
	multipsysteminfocontent       = 'multipsysteminfo/content/',
	multipsystemlocations       = 'multipsysteminfo/locations/',
	multipexternalconnections     = 'multipsysteminfo/externalconnection/',
	// external sync
	extCheckRepairs               = 'extconn/repairs',

	multip_request_ext_conn       = 'multipsysteminfo/externalconnection/request/',
	multip_create_file_server_control= 'multipsysteminfo/externalconnection/fileserver/create',
	
	socketpath = 'socket/',
	webrtcOffer = 'webrtc/offer/',
	webrtcTargets = 'webrtc/targets/',

	CustomerOrder = 'customerorders/',
	InternalOrder = 'internalorders/',
	TransferOrder = 'transferorders/',
	SaleAnalysis = 'saleanalyses/',
	SupplierReturn = 'supplierreturns/',
	Coupon = 'coupons/',
	be_notify_customer_ticket = 'customertickets/notify/',
}

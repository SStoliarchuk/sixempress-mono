
export enum BePaths {
	customers                     = 'clients/',
	suppliers                     = 'suppliers/',
	userlist                      = 'users/',
	userroles                     = 'userroles/',
	apikeys                       = 'apikeys/',

	customerreturns               = 'customerreturns/',
	SupplierReturn = 'supplierreturns/',

	products                      = 'products/',
	productdetails                = 'products/details/',
	productmovements              = 'productmovements/',
	
	productvariants               = 'productvariants/',
	inventorycategories           = 'inventorycategories/',
	
	sales                         = 'sales/',
	movements                     = 'movements/',
	
	customerorders                = 'customerorders/',
	InternalOrder = 'internalorders/',
	TransferOrder = 'transferorders/',
	Coupon = 'coupons/',

	rawfiles                      = 'rawfiles/',
	rawfilesgetuploadendpoint     = 'rawfiles/uploadendpoint/',

	logs                          = 'logs/',
	exceptions                    = 'exceptions/',
	
	movementdatareportsplit       = 'datareport/movements/split',
	movementdatagraph             = 'datareport/movements/graph',
	productsdatareport            = 'datareport/products/',
	dashboarddata                 = 'datareport/dashboard/',
	errorreport                   = 'errorreport/',
	
	businesses                    = 'businesses/',

	clientsysteminfo              = 'clientsysteminfo/',
	clientsystemusagestate        = 'clientsystemusagestate/',
	multipsysteminfo              = 'multipsysteminfo/',
	multipsysteminfocontent       = 'multipsysteminfo/content/',
	multipsystemlocations       = 'multipsysteminfo/locations/',
	multipexternalconnections     = 'multipsysteminfo/externalconnection/',
	multip_create_file_server_control = 'multipsysteminfo/externalconnection/fileserver/create',

	SaleAnalysis = 'saleanalyses/',
	socketPath = 'socket/',
	webrtcOffer = 'webrtc/offer/',
	webrtcTargets = 'webrtc/targets/',
	CustomerTicket = 'customertickets/',
}

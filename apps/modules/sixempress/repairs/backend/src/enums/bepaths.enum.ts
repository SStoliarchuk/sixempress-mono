export enum BePaths {
	customers                     = 'clients/',
	suppliers                     = 'suppliers/',
	repairsettingsinfo            = 'repairs/settings/content/',

	calendarevents                = 'calendarevents/',

	repairs                       = 'repairs/',
	equipments                    = 'equipments/',
	interventions                 = 'interventions/',
	customerreturns               = 'customerreturns/',
	
	products                      = 'products/',
	productdetails                = 'products/details/',
	productfetch                  = 'products/fetch/',
	productmovements              = 'productmovements/',
	productmovementsload          = 'productmovements/load',
	
	businessservices              = 'businessservices/',

	usedproducts                  = 'usedproducts/',
	
	productvariants               = 'productvariants/',
	inventorycategories           = 'inventorycategories/',
	
	Sale                         = 'sales/',
	movements                     = 'movements/',
	
	customerorders                = 'customerorders/',
	CustomerTreatment            = 'customertreatments/',

	rawfiles                      = 'rawfiles/',
	mapplaces                     = 'mappplaces/',

	logs                          = 'logs/',
	exceptions                    = 'exceptions/',
	
	movementdatareport            = 'datareport/movements/',
	movementdatareportsplit       = 'datareport/movements/split',
	productsdatareport            = 'datareport/products/',
	dashboarddata                 = 'datareport/dashboard/',
	errorreport                   = 'errorreport/',
	

	clientsysteminfo              = 'clientsysteminfo/',
	clientsystemusagestate        = 'clientsystemusagestate/',
	multipsysteminfo              = 'multipsysteminfo/',
	multipsysteminfocontent       = 'multipsysteminfo/content/',
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
}

export enum MultiPCKeys {
	csecProduct = 'multip__CSEC_product',

	simpleMode = 'multip__SaleC_simpleMode',
	simpleSaleFavoritiesGroups = 'multip__SaleC_saleFavorities',
	saleProductListPhotos = 'multip__Sale_showProductListPhotos',
	saledesk_print_receipt = 'multip__Sale_receiptPrint',

	calendarView = 'multip__calendar_view',
	calendarSteps = "multip__calendar_steps",
	calendarStepsFrom = "multip__calendar_stepsFrom",
	calendarStepsTo = "multip__calendar_stepsTo",
	calendarCreateEventType = 'multip__create_event_type',
	cceHairdresserTemplates = 'multip__cce-hairdresser-templates',
	cceHairdresserAutomaticSale = 'multip__cce-hair-automatic-sale',
	cceHairdresserDeleteDeleteSaleToo = 'multip__cce-hair-delete-delete-sale-too',

	sprintIsActive = 'multip__s_print-isActive',
	sprintConfig = 'multip__s_print-config',

	quickProductSettingsVars = 'multip__quick_product_settings_vars',
}


export enum ErrorCodes {

	multipSystemNotConfigured = 40003,
	barcodeConflict = 40090,
	tagsConflict = 40091,
	codeConflict = 40092,
	couponAlreadyUsed = 40093,
	customerReturnCouponUsed = 40094,

	errorProductAutoFix = 50010,
	saleableModelAlreadySold = 60000,
	usedProductAlreadySold = 60001,
	productStockInsufficient = 60002,
	productStockInsufficientPricedRows = 60003,


	// ext sync
	multipCurrentlySyncingAlready = 'sxmp_ext_sync_40020',
	noEndpointsCanBeUsedForRawFiles = 'sxmp_ext_sync_40030',
	rawFilesEndpointsNotImplemented = 'sxmp_ext_sync_40031',
	allExternalMediaStorageEndpoinsErrored = 'sxmp_ext_sync_50011',
	externalEndpointCannotBeReached = 'sxmp_ext_sync_50012',
	externalEndpointNotAcceptingAPIKEY = 'sxmp_ext_sync_50013',
	userDoesNotHaveAuthorizationForExtRequest = 'sxmp_ext_sync_90_001',
}


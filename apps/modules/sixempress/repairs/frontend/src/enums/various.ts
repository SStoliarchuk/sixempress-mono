export enum MultiPCKeys {
	csecRepairs = 'multip__CSEC_repairs',
	csecReplacement = 'multip__CSEC_repalcemente',
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
	noEndpointsCanBeUsedForRawFiles = 40030,
	rawFilesEndpointsNotImplemented = 40031,
	barcodeConflict = 40090,
	tagsConflict = 40091,

	errorProductAutoFix = 50010,
	allExternalMediaStorageEndpoinsErrored = 50011,
	externalEndpointCannotBeReached = 50012,
	externalEndpointNotAcceptingAPIKEY = 50013,
	saleableModelAlreadySold = 60000,
	usedProductAlreadySold = 60001,
	productStockInsufficient = 60002,
	productStockInsufficientPricedRows = 60003,

	userDoesNotHaveAuthorizationForExtRequest = 90_001,
}


export enum ErrorCodes {

	multipCurrentlySyncingAlready = 40020,

	multipSystemNotConfigured = 40003,
	noEndpointsCanBeUsedForRawFiles = 40030,
	rawFilesEndpointsNotImplemented = 40031,
	barcodeConflict = 40090,
	tagsConflict = 40091,
	codeConflict = 40092,
	couponAlreadyUsed = 40093,
	customerReturnCouponUsed = 40094,

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

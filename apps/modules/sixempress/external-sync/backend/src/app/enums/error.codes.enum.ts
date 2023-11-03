export enum ErrorCodes {

	multipCurrentlySyncingAlready = 'sxmp_ext_sync_40020',

	// multipSystemNotConfigured = 40003,
	noEndpointsCanBeUsedForRawFiles = 'sxmp_ext_sync_40030',
	rawFilesEndpointsNotImplemented = 'sxmp_ext_sync_40031',
	// barcodeConflict = 40090,
	// tagsConflict = 40091,
	// codeConflict = 40092,
	// couponAlreadyUsed = 40093,
	// customerReturnCouponUsed = 40094,

	// errorProductAutoFix = 50010,
	allExternalMediaStorageEndpoinsErrored = 'sxmp_ext_sync_50011',
	externalEndpointCannotBeReached = 'sxmp_ext_sync_50012',
	externalEndpointNotAcceptingAPIKEY = 'sxmp_ext_sync_50013',
	// saleableModelAlreadySold = 60000,
	// usedProductAlreadySold = 60001,
	// productStockInsufficient = 60002,
	// productStockInsufficientPricedRows = 60003,

	userDoesNotHaveAuthorizationForExtRequest = 'sxmp_ext_sync_90_001',
}

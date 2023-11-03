/**
 * For custom attributes found in the SingleClientAbstract
 * Start the values from 1000,
 * The first 1000 values should be private values for the system
 * 
 * The logic of the attributes should be that every attribute ADDS a feature to the system
 * ATTRIBUTES SHOULD NOT BE USED TO PREVENT A FEATURE, ONLY TO ADD A FEATURE
 * 
 */
export const Attribute = {
	viewRepairs: 11000,
	addRepairs: 11001,
	modifyRepairs: 11002,
	deleteRepairs: 11003,
	viewRepairsReport: 11004,
	changeRepairPdfInfo: 11005,
}

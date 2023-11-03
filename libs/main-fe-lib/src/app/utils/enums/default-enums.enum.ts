/**
 * For custom attributes found in the SingleClientAbstract
 * Start the values from 1000,
 * The first 1000 values should be private values for the system
 * 
 * The logic of the attributes should be that every attribute ADDS a feature to the system
 * ATTRIBUTES SHOULD NOT BE USED TO PREVENT A FEATURE, ONLY TO ADD A FEATURE
 * 
 */
export const LibAttribute = {
	seeSystemMetrics: 'sx_metr',
	canChangeDocLocFilter: 4,
	canSetGlobalLocFilter: 5,
}


// DO NOT CHANGE THESE ONLY ADD
export enum LibModelClass {
	ApiKey                    = 'ApiKeyModel',
	UserRole                  = 'UserRoleModel',
	User                      = 'UserModel',
	
	Log                       = 'LogModel',
	Exception                 = 'ExceptionModel',
	ErrorReport               = 'ErrorReportModel',
	Counters 								  = 'IncrementalCounterModel',
  Configuration             = 'ConfigurationModel',
  RequestBytesTrace         = 'RequestBytesTraceModel',
}

/**
 * The different categories available in the system
 */
export enum BusinessCategory {
	custom = 1,
	multiPurpose = 5,
}

// DO NOT COPY BELOW THIS LINE

export const LibAttributeLabel = {
	[LibAttribute.seeSystemMetrics]  : 'Visualizare Metriche Del Sistema',
	[LibAttribute.canChangeDocLocFilter]  : 'Cambiare Visibilita\' Documento',
	[LibAttribute.canSetGlobalLocFilter]  : 'Impostare Visibilita\' Globale',
}

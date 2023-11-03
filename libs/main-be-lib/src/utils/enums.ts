/**
 * For custom attributes found in the SingleClientAbstract
 * Start the values from 1000,
 * The first 1000 values should be private values for the system
 * 
 * The logic of the attributes should be that every attribute ADDS a feature to the system
 * ATTRIBUTES SHOULD NOT BE USED TO PREVENT A FEATURE, ONLY TO ADD A FEATURE
 * 
 */
export enum LibAttribute {
	seeSystemMetrics = 'sx_metr',
	canChangeDocLocFilter = 4,
	canSetGlobalLocFilter = 5,
}

export enum LibBePaths {
	apikeys                       = 'apikeys/',
	userroles                     = 'userroles/',
	userlist                      = 'users/',

	businesses                    = 'businesses/',
	businessinfo                  = 'businesses/info/',

	logs                          = 'logs/',
	exceptions                    = 'exceptions/',
	errorreport                   = 'errorreport/',

	systemusagestate              = 'control/systemusagestate/',
	serverauth                    = 'control/auth/',
	serverauthz                   = 'control/auth/refresh/',
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


// BELOW THIS LINE BE ONLY DATA

export const uniqueSlugName = ':uniqueSlug';
export const uniqueSlugNameNoColon = 'uniqueSlug';

/**
 * The different configurations types found in the configurations db
 */
export enum SysConfigurationType {
	MultiPSystemContentConfig = 'sxmp_content',
	MultiPSystemLocations = 'sxmp_locations',
	external_connection_config = 'sxmp_ext_conn',
}

export enum Database {
	SystemDB = 'system_control',
}

/**
 * These are the slugs used by the custom category clients
 */
export enum ClientsSlugs {
	system_control = 'system_control',
}


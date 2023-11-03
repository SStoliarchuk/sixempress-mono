/**
 * For custom attributes found in the SingleClientAbstract
 * Start the values from 1000,
 * The first 1000 values should be private values for the system
 * 
 * The logic of the attributes should be that every attribute ADDS a feature to the system
 * ATTRIBUTES SHOULD NOT BE USED TO PREVENT A FEATURE, ONLY TO ADD A FEATURE
 * 
 */
export const Attribute =  {
	modifyLocationsData: 'sl_10',
	canChangeDocLocFilter: 4,
	canSetGlobalLocFilter: 5,

	viewApiKeys: 100,
	addApiKeys: 101,
	modifyApiKeys: 102, 
	deleteApiKeys: 103,

	viewUserRoles: 200,
	addUserRoles: 201,
	modifyUserRoles: 202,
	deleteUserRoles: 203,

	viewUsers: 300,
	addUsers: 301,
	modifyUsers: 302,
	deleteUsers: 303,
	/**
	 * When the User queries another user
	 * if this attribute is absent, then the returned
	 * document will have only the name
	 */
	viewAllUserData: 304,
	
}

export enum BePaths {
	apikeys                       = 'apikeys/',
	userroles                     = 'userroles/',
	userlist                      = 'users/',

	locationsdata                 = 'locationsdata/',
}

export enum ModelClass {
	ApiKey                    = 'ApiKeyModel',
	UserRole                  = 'UserRoleModel',
	User                      = 'UserModel',
}

// BELOW THIS LINE BE ONLY DATA

export const uniqueSlugName = ':uniqueSlug';
export const uniqueSlugNameNoColon = 'uniqueSlug';




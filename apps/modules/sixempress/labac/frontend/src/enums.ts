export enum BePaths {
	privateTime                   = 'time/private/',
	
	userlist                      = 'users/',
	userroles                     = 'userroles/',
	apikeys                       = 'apikeys/',
	locationsdata                 = 'locationsdata/',
}

export enum ModelClass {
  ApiKey                    = 'ApiKeyModel',
	UserRole                  = 'UserRoleModel',
	User                      = 'UserModel',
	
}

export const Attribute = {
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

export const AttributeLabel = {
	[Attribute.modifyLocationsData]    : 'Modificare Posizioni Attivita\'',
	[Attribute.canChangeDocLocFilter]  : 'Cambiare Visibilita\' Documento',
	[Attribute.canSetGlobalLocFilter]  : 'Impostare Visibilita\' Globale',

	[Attribute.viewUsers]              : 'Visualizzare Utenti',
	[Attribute.addUsers]               : 'Aggiungere Utenti',
	[Attribute.modifyUsers]            : 'Modificare Utenti',
	[Attribute.deleteUsers]            : 'Eliminare Utenti',
	[Attribute.viewAllUserData]        : 'Info Completo Utente',

	[Attribute.viewUserRoles]          : 'Visualizzare Ruoli Utente',
	[Attribute.addUserRoles]           : 'Aggiungere Ruoli Utente',
	[Attribute.modifyUserRoles]        : 'Modificare Ruoli Utente',
	[Attribute.deleteUserRoles]        : 'Eliminare Ruoli Utente',

	[Attribute.viewApiKeys]            : "Visualizzare Chiavi API",
	[Attribute.addApiKeys]             : "Aggiungere Chiavi API",
	[Attribute.modifyApiKeys]          : "Modificare Chiavi API",
	[Attribute.deleteApiKeys]          : "Eliminare Chiavi API",
}

export enum CacheKeys {
	rememberLogin = 'sxmp_labac__rememberLogin',
	contextData = 'sxmp_labac__contextServiceData',
	lastEnteredUser = 'sxmp_labac__lastEnteredUsername',
	loginSlug = 'sxmp_labac__loginSlug',

	chosenLocation = 'sxmp_labac__chosen_location',
	addLocationFilter = 'sxmp_labac__add_location_filter',
	addLocationContentFilter = 'sxmp_labac__add_location_content_filter',
}

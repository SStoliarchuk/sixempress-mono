export enum BePaths {
	socketPath = 'socket/',
	privateTime = 'time/private/',
	webrtcOffer = 'webrtc/offer/',
	multip_request_ext_conn = 'multipsysteminfo/externalconnection/request/',
	
	apikeys = 'apikeys/',
	userroles = 'userroles/',
	userlist = 'users/',
	
	logs = 'logs/',
	exceptions = 'exceptions/',
	errorreport = 'errorreport/',
	
	systemusagestate = 'control/systemusagestate/',

	// for control ?
	serverauth = 'control/auth/',
	serverauthz = 'control/auth/refresh/',

	control_auth = 'authenticate/',
	control_authz = 'authorize/',
}

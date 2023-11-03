export interface SocketDBObjectChangeMessage {
	/**
	 * Contains the ids of the items updated
	 */
	i: string[];
	/**
	 * The modelClass of the object
	 */
	m: string;
}

export enum SocketBaseCode {
	connect 					= 'connect',
	connect_error 		= 'connect_error',
	connect_timeout 	= 'connect_timeout',
	error 						= 'error',
	disconnect 				= 'disconnect',
	disconnecting 		= 'disconnecting',
	newListener 			= 'newListener',
	reconnect_attempt = 'reconnect_attempt',
	reconnecting 			= 'reconnecting',
	reconnect_error 	= 'reconnect_error',
	reconnect_failed 	= 'reconnect_failed',
	removeListener 		= 'removeListener',
	ping 							= 'ping',
	pong 							= 'pong',
}

export enum SocketNamespaces {
	clientsSoftware = '/clients',
	addons = '/addons',
}

/**
 * Custom socket codes
 */
export enum SocketCodes {
	/**
	 * Changes in the documents in db
	 */
	dbObjectChange = '1',
	/**
	 * When a client connects/disconnects to a room
	 */
	roomChange = 'stlse_roomchange',
	/**
	 * Description of a client used for addons
	 */
	clientDescription = 'stlse_clientdescription',

	/**
	 * Sends offer/answer between peers
	 */
	webRtcDescription = 'sxmp_webRtcDescription',
	/**
	 * Sends the info about a candidate
	 */
	webRtcCandidate = 'sxmp_webRtcCandidate',
	/**
	 * Used in case rtc communication is impossibile, and thus the message is sent over socket
	 */
	webRtcFallbackMessage = 'sxmp_webRtcFallbackMessage',
	/**
	 * if in final state of rtc exchange (be it success or failure)
	 */
	webRtcFinalState = 'sxmp_webRtcFinalState',
}

/**
 * Codes used in direct communication between rtc connections
 */
export enum WebRTCCodes {
	messageAnswerBody = 1,

	requestDefaultPrint,
	requestLabelPrint,
	getLabelPrinterList,
}
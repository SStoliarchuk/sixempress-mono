import { WebRTCCodes } from "@sixempress/main-fe-lib";

export interface WebRTCMessage {
	/**
	 * Id of the "conversion" between two rtc clients
	 */
	id: string,
	/**
	 * The code of the request
	 */
	code: WebRTCCodes,
	/**
	 * Any data passed for the request
	 */
	data?: any,
	/**
	 * In case there was an error
	 */
	error?: any,
}

export interface WebRTCMessageMeta {
	/**
	 * Id of the "conversation"/"communication"
	 */
	commId: string,

	/**
	 * Wheter the message is from rtc or socket fallback
	 */
	originType: 'socket' | 'rtc',

	/**
	 * connectionId in case it's origin is "rtc"
	 * 
	 * otherwise it's the socket id of the origin,s
	 */
	exchangeId: string,

	/**
	 * The original message received
	 */
	message: WebRTCMessage,
}
import { SocketCodes, WebRTCCodes } from '@sixempress/main-fe-lib';
import { SocketService } from '@sixempress/main-fe-lib';
import { WebRTCInstance } from './webrtc';
import { WebRTCMessage, WebRTCMessageMeta } from './webrtc.dtd';

type onEventCallback = (meta: WebRTCMessageMeta, msg: WebRTCMessage['data']) => any;
type EventsStore = {[webRtcCode: string]: onEventCallback[]};

export class WebRTCService {

	/**
	 * when triggering "onWithReturn()" we pass to the .on() handler a freshly generated function
	 * in order to be able to .off() the handler, we store the genetaed function in the originally given callback under this field
	 */
	private static FIELDNAME_ONANSWER_EMIT_WORKAROUND = Symbol.for('__sxmp_actualcallback_value');

	/**
	 * Time after a creation process with remote is stopped
	 */
	private static WEB_RTC_CREATION_TIMEOUT_MS = 5_000;

	/**
	 * All the RTC instances in the system
	 */
	private static instances: {[key: string]: WebRTCInstance} = {};

	/**
	 * SocketID -> SocketID
	 */
	private static socketIdToConnectioId: {[id: string]: 1} = {};

	/**
	 * We store here the .on() handlers, same logic as the socket-service in backend
	 */
	private static eventsStored: EventsStore = {};

	/**
	 * Adds the socket paths and handlers to the current SocketService running
	 */
	public static initService() {
		// initial offer/answer handshake
		SocketService.on(SocketCodes.webRtcDescription, async (cId, description) => {
			// external has accepted our request
			if (description.type === 'answer') {
				WebRTCService.instances[cId]?.setRemoteDescription(description);
			}
			// external wants to connect to us
			else if (description.type === 'offer') {
				// do nothing on error as we will fallback to socket
				WebRTCService.onOfferProposal(cId, description, (code, data) => SocketService.emit(code, cId, data))
				.catch(e => {});
			}
		});
		
		// trade candidates
		SocketService.on(SocketCodes.webRtcCandidate, async (cId, candidate) => {
			WebRTCService.instances[cId]?.addIceCandidate(candidate);
		});

		// handle request directly from websocket (in case rtc not connected)
		SocketService.on(SocketCodes.webRtcFallbackMessage, async (originSocketId, msg) => {
			WebRTCService.onRtcMessage('socket', originSocketId, msg);
		});

	}

	/**
	 * Closes all the instances and de-references them.
	 * 
	 * !! WE DO NOT REMOVE THE SOCKET PATHS\
	 * This is because on logout you should directly disable the socket service alltogheter
	 * and i'm lazy to create a separate function for each handler to use as ref lmao
	 */
	public static destroy() {
		for (const id in WebRTCService.instances) {
			WebRTCService.instances[id].destroy()
			delete WebRTCService.instances[id];
		}
		
		for (const k in WebRTCService.eventsStored)
			delete WebRTCService.eventsStored[k];
	}

	/**
	 * connects to a rtc client
	 * @param targetSocketId The socket.id of the target to connect to
	 * @returns true on successfull connection
	 */
	public static async createConnection(targetSocketId: string): Promise<true> {
		// TODO add also a connection "in progress" check ??
		if (WebRTCService.socketIdToConnectioId[targetSocketId] && this.isRtcActive(targetSocketId))
			return true;

		return new Promise<true>((r, j) => {
			WebRTCService.connectionWithCallback(targetSocketId, (success) => {
				
				if (!success) {
					delete WebRTCService.socketIdToConnectioId[targetSocketId];
					j(new Error('Connection could not been established to targetSocketId: ' + targetSocketId));

					return;
				}

				WebRTCService.socketIdToConnectioId[targetSocketId] = 1;
				r(true);
			})
			.catch(e => j(e));
		});
	}
	
	/**
	 * This function exists here so the public one can be wrapped in a promise
	 */
	private static async connectionWithCallback(targetSocketId: string, cb: (connected: boolean) => void) {
		const cId = targetSocketId;

		const instance: WebRTCInstance = new WebRTCInstance({
			onIce: (candidate) => {
				SocketService.emit(SocketCodes.webRtcCandidate, cId, candidate);
			},
			onMessage: (msg) => {
				WebRTCService.onRtcMessage('rtc', cId, msg);
			},
			onCompleted: (success) => {
				SocketService.emit(SocketCodes.webRtcFinalState, cId);
				if (!success)
					WebRTCService.onFail(cId);

				cb(success);
			},
		});
		
		// save immediately as to be able to respond from remote
		WebRTCService.instances[cId] = instance;
		
		const offer = await instance.createOffer({dataChannel: true});
		SocketService.emit(SocketCodes.webRtcDescription, cId, offer);

		WebRTCService.setTimeoutForFail(cId, () => cb(false));
	}

	/**
	 * After the specified timeout has reached it checks if the connection is successfull, if not it destroys it
	 * @param cId the connection id to check
	 * @param cb a callaback to call on failed status
	 */
	private static setTimeoutForFail(cId: string, cb?: () => void) {
		// fail after the specified timeout
		setTimeout(
			() => {
				// if already deleted || the final state is success
				// we just return without doing anything
				if (!WebRTCService.instances[cId] || WebRTCService.instances[cId].isStateFinal() === true)
					return;

				// trigger fail calls
				WebRTCService.onFail(cId);
				cb && cb();
			},
			WebRTCService.WEB_RTC_CREATION_TIMEOUT_MS
		);
	}

	/**
	 * Destroys the failed instance
	 */
	private static onFail(cId: string) {
		WebRTCService.instances[cId]?.destroy();
		delete WebRTCService.instances[cId];
	}

	/**
	 * Creates a connection with a peer based on an initial offer
	 * @param offer The original offer to connect to
	 * @param sendToRemote A callback to send data back to the offerer for the initial handshake
	 */
	private static async onOfferProposal(cId: string, offer: RTCSessionDescriptionInit, sendToRemote: (code: SocketCodes, data?: any) => void): Promise<void> {
		// create instance
		const instance: WebRTCInstance = new WebRTCInstance({
			onIce: (candidate) => {
				sendToRemote(SocketCodes.webRtcCandidate, candidate);
			},
			onMessage: (msg) => {
				WebRTCService.onRtcMessage('rtc', cId, msg);
			},
			onCompleted: (success) => {
				sendToRemote(SocketCodes.webRtcFinalState);

				if (success)
					return WebRTCService.instances[cId] = instance

				WebRTCService.onFail(cId);
			},
		});

		// create answer and send to remote
		const answer = await instance.connectByOffer(offer);
		sendToRemote(SocketCodes.webRtcDescription, answer);

		// now that the answer has been sent we wait for the datachannel to be ready
		await instance.waitOnDataChannel();
		WebRTCService.setTimeoutForFail(cId);
	}

	/**
	 * It calls remote and waits for response and returns the response\
	 * Automaticaly generates the comm Id
	 * @param timeout of 10sec
	 */
	public static async emitWithReturn<T = any>(connectionId: string, code: WebRTCCodes, data?: WebRTCMessage['data'], timeout = 10_000): Promise<T> {
		return WebRTCService.emitWithReturnLogic('rtc', connectionId, code, data, timeout);
	}

	/**
	 * Emits through socket isntead of RTC (used when RTC is impossible)
	 * @param timeout of 10sec
	 */
	public static async emitWithReturnFallbackSocket<T = any>(targetSocketId: string, code: WebRTCCodes, data?: WebRTCMessage['data'], timeout = 10_000): Promise<T> {
		return WebRTCService.emitWithReturnLogic('socket', targetSocketId, code, data, timeout);
	}

	/**
	 * Checks if the rtc connection is still present
	 */
	public static isRtcActive(exchangeId: string) {
		return Boolean(WebRTCService.instances[exchangeId]);
	}

	/**
	 * Sends the message through RTC or Socket and waits for the answer
	 */
	private static async emitWithReturnLogic<T>(originType: 'socket' | 'rtc', exchangeId: string, code: WebRTCCodes, data?: WebRTCMessage['data'], timeout = 10_000): Promise<T> {
		if (originType === 'rtc' && !this.isRtcActive(exchangeId))
			throw new Error('WebRTC ConnectionId not present: ' + exchangeId);

		const commId = Math.random().toString().slice(2);

		return new Promise((r, j) => {
			// handles response and .off() command
			const listenCb = (meta: WebRTCMessageMeta, data: WebRTCMessage['data']) => {
				if (meta.commId !== commId)
					return;

				WebRTCService.off(WebRTCCodes.messageAnswerBody, listenCb);

				if (meta.message.error)
					return j(meta.message.error);

				r(data)
			};

			// // as promise responds once, we can safely add the timeout here
			// setTimeout(() => j(new Error('WebRTC return timed out')), timeout);
			// we listen to webrtc service even if it is a socket send because the socket fallback message is processed as webrtc message
			WebRTCService.on(WebRTCCodes.messageAnswerBody, listenCb);
			
			const message: WebRTCMessage = {id: commId, code, data};
			if (originType == 'socket')
				SocketService.emit(SocketCodes.webRtcFallbackMessage, exchangeId, message);
			else if (originType === 'rtc')
				WebRTCService.emit(exchangeId, message);
		});
	}

	/**
	 * Send to remote
	 */
	public static emit(connectionId: string, data: WebRTCMessage) {
		if (!WebRTCService.instances[connectionId])
			throw new Error('WebRTC ConnectionId not present: ' + connectionId);

		WebRTCService.instances[connectionId].sendMessage(data);
	}

	/**
	 * Emits through socket isntead of RTC (used when RTC is impossible)
	 */
	public static async emitFallbackSocket(targetSocketId: string, data: WebRTCMessage) {
		SocketService.emit(SocketCodes.webRtcFallbackMessage, targetSocketId, data);
	}

	/**
	 * Listens to the specified code in the namespace
	 */
	public static on(code: WebRTCCodes, cb: onEventCallback) {
		if (!WebRTCService.eventsStored[code])
			WebRTCService.eventsStored[code] = [];

		if (!WebRTCService.eventsStored[code].includes(cb))
			WebRTCService.eventsStored[code].push(cb);
	}
	
	/**
	 * Removes a listener
	 */
	public static off(code: WebRTCCodes, cb: onEventCallback) {
		// get the workaround callback
		const actualCb = cb[WebRTCService.FIELDNAME_ONANSWER_EMIT_WORKAROUND] || cb;

		if (WebRTCService.eventsStored[code]?.includes(actualCb)) {
			WebRTCService.eventsStored[code].splice(WebRTCService.eventsStored[code].indexOf(actualCb), 1);
			
			if (!WebRTCService.eventsStored[code].length)
				delete WebRTCService.eventsStored[code];
		}
	}

	/**
	 * Listens to the specified code in the namespace and if the callback returns a value it sends it back to the user
	 */
	public static onWithReturn(code: WebRTCCodes, cb: onEventCallback) {

		// create a function that emits to the sender the return value of the cb()
		const sendCb = (meta: WebRTCMessageMeta, ...args: any[]) => {
			const ret = (cb as any)(meta, ...args);
			// return is sync
			if (!(ret instanceof Promise))
				return WebRTCService.answerByMeta(meta, ret);
			// resolve promise and return
			else if (ret instanceof Promise) {
				return ret
				.then(data => WebRTCService.answerByMeta(meta, data))
				.catch(error => WebRTCService.answerByMeta(meta, undefined, error))
			}
		}

		// register
		cb[WebRTCService.FIELDNAME_ONANSWER_EMIT_WORKAROUND] = sendCb;
		WebRTCService.on(code, sendCb);
	}
	
	/**
	 * Answers to an initial message from outside
	 * @param meta Meta generated from the first message
	 * @param data The return value to send
	 * @param error send also the error
	 */
	private static answerByMeta(meta: WebRTCMessageMeta, data: WebRTCMessage['data'], error?: any) {
		// we dont check if data is undefined or not
		// we always emit as if we don't emit we consider the request to have timed out
		const msg: WebRTCMessage = {id: meta.commId, code: WebRTCCodes.messageAnswerBody, data, error};
		
		if (meta.originType == 'socket')
			SocketService.emit(SocketCodes.webRtcFallbackMessage, meta.exchangeId, msg);
		else if (meta.originType === 'rtc')
			WebRTCService.emit(meta.exchangeId, msg);
	}

	/**
	 * Handles the messages arrived to the RTC instances
	 * @param msg Message arrived
	 */
	private static async onRtcMessage(originType: 'socket' | 'rtc', exchangeId: string, msg: string | WebRTCMessage) {
		const data: WebRTCMessage = typeof msg === 'string' ? JSON.parse(msg) : msg;

		if (!WebRTCService.eventsStored[data.code])
			return;
		
		for (const cb of WebRTCService.eventsStored[data.code])
			cb({originType, exchangeId, commId: data.id, message: data}, data.data);
	}

}

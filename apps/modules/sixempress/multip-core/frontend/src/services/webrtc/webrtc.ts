import { WebRTCMessage } from "./webrtc.dtd";

export class WebRTCInstance {

	/**
	 * Underlying instance of RTC connection
	 */
	private instance: RTCPeerConnection;

	/**
	 * The data channel for communication
	 */
	private dataChannel?: RTCDataChannel;

	constructor(private opts: {
		onIce: (candidate: RTCIceCandidate | null) => void, 
		onMessage: (msg: string) => void, 
		/** emits twice (1 for successfull connection or fail, 1 when a successfull connection is terminated) */
		onCompleted?: (success: boolean) => void,
	}) {
		this.instance = new RTCPeerConnection({
			iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
		});
		
		this.instance.addEventListener('icecandidate', async (e) => {
			this.opts.onIce(e.candidate);
		});

		// callback for final state
		if (this.opts.onCompleted)
			this.instance.addEventListener('connectionstatechange', this.tryEmitOnCompleted);
	}

	/**
	 * Tries to trigger opts.onCompleted();
	 */
	private tryEmitOnCompleted = () => {
		const final = this.isStateFinal();
		if (typeof final === 'boolean')
			this.opts.onCompleted!(final);
	}

	/**
	 * If the state is final returns a boolean success/fail
	 * 
	 * otherwise undefined
	 */
	public isStateFinal(): void | boolean {
		// connection is failed
		switch (this.instance.connectionState) {
			case 'disconnected':
			case 'failed':
			case 'closed':
				return false;
		}

		// data channel is still pending opening
		if (this.dataChannel && this.dataChannel.readyState !== 'open')
			return;

		// finally check if the status is conntected
		if (this.instance.connectionState === 'connected')
			return true;

		// otherwise is pending
	}

	/**
	 * Creates the offer with the necessary params
	 */
	public async createOffer(opts: {dataChannel?: true}) {
		if (opts.dataChannel) {
			this.dataChannel = this.instance.createDataChannel(typeof opts.dataChannel === 'string' ? opts.dataChannel : Math.random().toString().slice(2));
			
			if (this.opts.onCompleted)
				this.dataChannel.addEventListener('open', this.tryEmitOnCompleted)
			
			this.dataChannel.addEventListener('message', (msg) => {
				this.opts.onMessage(msg.data);
			});
		}

		const offer = await this.instance.createOffer({});
		await this.instance.setLocalDescription(offer);
		return offer;
	}

	/**
	 * handles the offer of the remote target we're trying to connect to
	 * @param answer Answer of the target connection
	 */
	public async setRemoteDescription(answer: RTCSessionDescriptionInit) {
		return this.instance.setRemoteDescription(answer);
	}

	/**
	 * Adds an ice candidate to local
	 */
	public async addIceCandidate(candidate: RTCIceCandidate) {
		await this.instance.addIceCandidate(candidate);
	}

	/**
	 * Sets the descriptions and returns the answer
	 * @param offer The offer from remote
	 */
	public async connectByOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
		await this.setRemoteDescription(offer);
		const answer = await this.instance.createAnswer();
		await this.instance.setLocalDescription(answer);
		return answer;
	}

	/**
	 * Waits for the system to create a datachannel with remote
	 */
	public async waitOnDataChannel() {
		if (this.dataChannel)
			return;

		return new Promise<void>((r, j) => {
			this.instance.addEventListener('datachannel', (e) => {
				this.dataChannel = e.channel;
				
				e.channel.addEventListener('message', (msg) => {
					this.opts.onMessage(msg.data);
				});
				
				e.channel.addEventListener('open', (e) => {
					r();
				});

			});
		});
	}

	/**
	 * Sends to remote a message
	 * @param id id of the conversation
	 * @param code The code of the send request
	 * @param data any data to send to remote
	 */
	public async sendMessage(webrtcMessage: WebRTCMessage) {
		if (!this.dataChannel)
			throw new Error('No DataChannel was created with remote');

		this.dataChannel.send(JSON.stringify(webrtcMessage));
	}

	/**
	 * Closes the connection
	 */
	public destroy() {
		this.instance.close()
	}

}
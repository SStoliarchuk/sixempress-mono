import to from "await-to-js";
import { ActionRegister, RequestService } from "@sixempress/main-fe-lib";
import { SocketCodes, SocketNamespaces } from "@sixempress/main-fe-lib";
import { SocketService } from "@sixempress/main-fe-lib";
import { WebRTCMessage } from "apps/modules/sixempress/multip-core/frontend/src/services/webrtc/webrtc.dtd";
import { WebRTCService } from "apps/modules/sixempress/multip-core/frontend/src/services/webrtc/webrtc.service";
import { BePaths } from "apps/modules/sixempress/multip-core/frontend/src/utils/enums/bepaths";

export class SeasService {

	/**
	 * Cache of failed rtc connection to not retry them
	 * // TODO implement this when we figure out how to empty this lmao
	 */
	private static failedRTC: {[targetId: string]: 1} = {};

	// 1 hour (in case user switched to wifi/4g some times)
	private static CLEAR_FAILED_RTC_TIMEOUT_MS = 3_600_000

	public static availableAddonsNodes: {id: string, description: Partial<{id: string}>}[] = [];
	
	public static onSeasNodesChange = new ActionRegister();

	public static initService() {
		// update
		SeasService.updateAvailableNodesList();

		// and listen for updates
		SocketService.on(SocketCodes.roomChange, (data) => {
			const nsp = data.namespace;
			if (nsp === SocketNamespaces.addons)
				SeasService.updateAvailableNodesList();
		});
	}

	public static async updateAvailableNodesList() {
		const list: any = await RequestService.client('get', BePaths.webrtcTargets, {disableLoading: true});
		this.availableAddonsNodes = list.data || [];
		this.onSeasNodesChange.emit();
	}

	public static async seasMessage(targetSocketId: string, code: WebRTCMessage['code'], data?: WebRTCMessage['data']) {
		const connected = await SeasService.maybeRtc(targetSocketId);

		const result = connected
			? await WebRTCService.emitWithReturn(targetSocketId, code, data)
			: await WebRTCService.emitWithReturnFallbackSocket(targetSocketId, code, data);

		return result;
	}

	private static async maybeRtc(targetSocketId: string): Promise<boolean> {
		// failed :/
		if (SeasService.failedRTC[targetSocketId])
			return false;

		// try to connect
		const [e, success] = await to(WebRTCService.createConnection(targetSocketId));
		const connected = !e && success;
		
		// store in the failed rtc for a given time
		// it will auto clear on page reload if needed earlier
		if (!connected) {
			SeasService.failedRTC[targetSocketId] = 1;
			setTimeout(() => delete SeasService.failedRTC[targetSocketId], SeasService.CLEAR_FAILED_RTC_TIMEOUT_MS)
		}

		return connected;
	}

	public static getSocketIdByDescriptionId(id: string): void | string {
		for (const node  of SeasService.availableAddonsNodes)
			if (node.description.id === id)
				return node.id;
	}

}

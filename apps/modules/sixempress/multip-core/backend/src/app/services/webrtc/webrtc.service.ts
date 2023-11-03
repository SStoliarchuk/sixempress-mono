import { SocketBaseCode, SocketCodes, SocketNamespaces } from "@sixempress/main-be-lib";
import { SocketService } from "@sixempress/main-be-lib";
import { BePaths } from "../../utils/enums/bepaths.enum";
import { CustomExpressApp, RequestHelperService } from "@sixempress/main-be-lib";
import { HookActions } from "@stlse/backend-connector";

export class WebRTCService {

	public static actionHooks(): HookActions {
		const ret: HookActions = {
			['stlse_socket_on__' + SocketBaseCode.connect]: ((context, return_value, namespace, originId, eventName, ...args) => {
				use_action.stlse_socket_emit(context.req, SocketNamespaces.clients, context.req.instanceId!, SocketCodes.roomChange, {namespace})
			}) as HookActions['stlse_socket_on__'],
			['stlse_socket_on__' + SocketBaseCode.disconnect]: ((context, return_value, namespace, originId, eventName, ...args) => {
				use_action.stlse_socket_emit(context.req, SocketNamespaces.clients, context.req.instanceId!, SocketCodes.roomChange, {namespace})
			}) as HookActions['stlse_socket_on__'],
		};

		// add webrtc exchange
		const keys = [SocketCodes.webRtcDescription, SocketCodes.webRtcCandidate, SocketCodes.webRtcFallbackMessage];
		for (const k of keys) {
			ret['stlse_socket_on__' + k] = ((ctx, ret, nsp, fromId, eventName, targetSocketId: string, data: any) => {
				const nspTarget = nsp === SocketNamespaces.clients ? SocketNamespaces.addons : nsp === SocketNamespaces.addons ? SocketNamespaces.clients : null;
				if (!nspTarget)
					return;

				use_action.stlse_socket_emit(ctx.req, nspTarget, targetSocketId, eventName, fromId, data);
			}) as HookActions['stlse_socket_on__'];
		}

		return ret;
	}

	public static initService(app: CustomExpressApp) {

		app.get('/' + BePaths.webrtcTargets, RequestHelperService.safeHandler(async (req, res) => {
			const available = await use_action.stlse_socket_list(req, SocketNamespaces.addons);
			return available;
		}));

	}

}
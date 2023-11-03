import { SocketBaseCode, SocketCodes } from './socket.dtd';

export class SocketService {

	public static get isActive() {
		// return true;
		return use_action.stlse_socket_is_active();
	}

	public static get id() {
		return use_action.stlse_socket_get_id();
	}

	public static on(code: SocketCodes, listener: (...args: any[]) => void) {
		return use_action.stlse_socket_on(code as any, listener);
	}

	public static off(code: SocketCodes, listener: (...args: any[]) => void) {
		return use_action.stlse_socket_off(code as any, listener);
	}

	public static emit(code: SocketCodes, ...args: any[]) {
		return use_action.stlse_socket_emit(code as any, ...args);
	}

	public static addDescription(description: object) {
		return use_action.stlse_socket_add_description(description);
	}

}

import { AuthService } from '../../../services/authentication/authentication';
import { Err, ConvertedError, IErrorReport, ErrorNames, NetworkErr, SystemError } from '../errors';
import { DataStorageService, ObjectUtils } from '@sixempress/utilities';
import { BePaths as LibBePaths } from '../../../utils/enums/bepaths.enum';
import { UiErrorService } from '../../../services/ui-error/ui-error.service';
import { ConnectionStatus } from '../../enums/fe-error-codes.enum';
import { RequestService } from '../../../services/request-service/request-service';
import to from 'await-to-js';
import { FetchResponse, HookFilters } from '@stlse/frontend-connector';
import { LoadingOverlay } from '../../../helper-components/loading-overlay/loading-overlay';

class _GlobalErrorHandler {

	/**
	 * The name to give to unknown errors
	 */
	public feErrorCode = 'Unknown';

	private lastRequest: {
		request?: { url: string, headers: {[n: string]: string}, data?: any},
		response?: { headers: {[n: string]: string}, data?: any},
	} = {};

	// save last request to send for analysis
	public filterHooks: HookFilters = {
		stlse_request_return_response: {
			priority: 9999,
			fn: async (context, return_value, object, response, request, options) => {
				if (!request.url.includes(LibBePaths.errorreport)) {
					const hrq: {[n: string]: string} = {};
					const hrs: {[n: string]: string} = {};

					request.headers.forEach((v, k) => hrq[k] = v);
					response.headers.forEach((v, k) => hrs[k] = v);

					this.lastRequest = {
						request: { url: request.url, data: options.data, headers: hrq },
						response: { data: return_value.data, headers: hrs },
					}
				}

				// process auth error
				if (return_value.status === 401)
					await this.processAuthError();

				return return_value;
			},
		}
	}

	/**
	 * Adds an event listener to the window, that allows to handle errors globally
	 */
	public start() {
		window.addEventListener('error', (ev) => {
			this.handleError(ev.error || ev)
		});
		window.addEventListener("unhandledrejection", (e) => {
			this.handleError((e.reason || new Error('undefined promise rejection')));
		});
	}

	/**
	 * Takes any kind of input type you give it and transforms it into a ConvertedError
	 * then shows the converted error to the user
	 * @param showError DEFAULT = true\
	 * if true shows a modal
	 * else only logs it to console
	 */
	public async handleError(err?: any): Promise<any> {
		try {
			console.error(err);
			LoadingOverlay.clearLoading();

			if (typeof err === 'undefined' || err === null)
				err = new Error('Undefined or null thrown as error');

			// for other events type
			if (err.error)
				err = err.error;

			// network issue
			if (err.message && Object.values(ConnectionStatus).some(v => err.message === v))
				return UiErrorService.showConnectionError(err.message);

			// if it's auth err, then it doesnt return anything
			// so stop the handling
			const conv = this.convertError(err);
			if (!conv)
				return;
			
			// network connection error on ios
			if (conv.message && conv.message.includes && conv.message.includes('The network connection was lost.')) {
				const r = await RequestService.checkConnectionStatus();
				return r !== ConnectionStatus.ok && UiErrorService.showConnectionError(r);
			}

			let errorId: string;
			// publish the error to backend
			if (AuthService.isAuthenticated()) {
				try {
					const res = await this.postError(conv, this.lastRequest);
					if (res.success === true) {
						errorId = res.id;
					} 
					else {
						console.error(res.error);
						if (res.connection !== ConnectionStatus.ok)
							UiErrorService.showConnectionError(res.connection);
					}
				} catch (e) { console.error(e); }
			}

			UiErrorService.showErrorModal(conv, errorId);
		} catch (e) { console.error(e); }
	}

	/**
	 * Converts a caught error to an error that can be used
	 * if the error is a 401 or AuthErr then it returns undefined and tries to handle it himself
	 */
	private convertError(error: any): ConvertedError | undefined {
		// authorization error
		if ((error as SystemError).name === ErrorNames.AuthErr || error.status === 401) {
			this.processAuthError();
		}
		// no err
		else if (!error) {
			return {
				code: this.feErrorCode, 
				message: "Thrown undefined error",
				stack: new Error("Thrown undefined error").stack,
				type: 'fe',
			};
		}
		// error from back end
		else if ((error as FetchResponse<any>).data) {
			const ax = error as FetchResponse<any>;
			const msg = ax.data.message || ax.data;
			return {
				code: ax.status,
				message: typeof msg === 'string' ? msg : JSON.stringify(msg),
				stack: error,
				type: 'be',
			};
		} 

		// error from front-end
		else {
			const msg = error.message || error;
			return {
				code: this.feErrorCode,
				message: typeof msg === 'string' ? msg : JSON.stringify(msg),
				stack: error.stack || error,
				type: 'fe',
			};
		}
	}


	/**
	 * saves the data of the error to the DB (withouth the user desc first)
	 * and gives back the error-report id to use to patch if the user wants to add a comment
	 * @returns the error-report id
	 */
	private async postError(e: ConvertedError, lastApirequest?: any): Promise<{success: true, id: string} | {success: false, connection: ConnectionStatus, error: any}> {
		const sessionStorageFiltered = {...DataStorageService.sessionStorage};
		const localStorageFiltered = {...DataStorageService.localStorage};
		
		const toSend: IErrorReport = {
			localStorage: localStorageFiltered,
			sessionStorage: sessionStorageFiltered,
			exception: { message: e.message, stack: e.stack },
			lastUrl: window.location.href,
		};

		// clone the last request as to not stringify the params again 
		// ONLY if the last request is not a errorreport
		if (lastApirequest)
			toSend.lastRequest = ObjectUtils.cloneDeep(lastApirequest);

		// save to db
		const [error, sent] = await to(RequestService.client('post', LibBePaths.errorreport, {data: toSend}));
		if (!error)
			return {id: sent.data, success: true};

		const stat = await RequestService.checkConnectionStatus();
		return {success: false, connection: stat, error};
	}

	/**
	 * Tries to refresh the authorization ticket
	 * if it fails or there was no valid authentication ticket
	 * then it calls logout()
	 */
	private processAuthError() {
		return new Promise<void>((r, j) => {
			AuthService.refreshToken()
			.then(success => (r(), this.reloadPage()))
			.catch(error => (j(), AuthService.logout()));
		});
	}

	private goto401Page() {
		window.location.href = '/';
	}
	
	private reloadPage() {
		window.location.reload();
	}

}

export const GlobalErrorHandler = new _GlobalErrorHandler();

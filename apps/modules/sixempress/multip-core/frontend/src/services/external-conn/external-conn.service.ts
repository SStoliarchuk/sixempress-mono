import { ExternalConnection, ExternalConnectionType } from "apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd";
import { MultipService } from "apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service";
import { ExtRedirectType } from "./ext-redirect.enum";

class _ExternalConnService {

	/**
	 * Returns the active connections and filters them if requested
	 */
	public static getExternalConnections(filterUse: false | Array<keyof ExternalConnection['useFor']>): ExternalConnection[] {
		const conns = (MultipService.exts.externalConnections || []).filter(c => !c.isDisabled);
		// return all
		if (filterUse === false) {
			return conns;
		}

		// filter by use purpose
		return conns.filter(ec => {
			// ensure all uses are enabled
			for (const k of filterUse) 
				if (!ec.useFor[k]) 
					return false;

			return ec;
		});
	}

	/**
	 * Creates an url that is used in qr codes that redirects the client to the site, but internally it has data to act like a normal scan
	 * @param type The type of the model the value references
	 * @param val the remote value to resolve
	 * @param internalValue an optional internal value to use in case the remote val is not usable for internal query
	 */
	public static generateDefaultConnectionRedirectsUrl(type: ExtRedirectType, val: string | number, internalValue?: string | number): void | string {
		const activeConn = ExternalConnService.getExternalConnections(['defaultClientSite'])[0];
		if (!activeConn) return;

		switch (activeConn.type) {
			case ExternalConnectionType.wordpress: 
				return `${activeConn.originUrl}/wp-json/sxmpes/r?t=${type}&v=${val}${internalValue ? '&i=' + internalValue : ''}`;
		}

	}

	/**
	 * Returns the value to use as a default scan value from a redirect url
	 */
	public static getScannerCodeValueFromRedirectUrl(url: string): void | string {
		if (!url.includes('?'))
			return;

		const u = new URLSearchParams(url.split('?')[1]);
		return u.get('i') || u.get('v');
	}

}

globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.ExternalConnService = (globalThis.__sixempress.ExternalConnService || _ExternalConnService);
export const ExternalConnService = globalThis.__sixempress.ExternalConnService as typeof _ExternalConnService;
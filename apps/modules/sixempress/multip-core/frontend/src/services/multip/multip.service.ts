import { IBMultiPurposeConfig } from "apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd";
import { ExternalConnectionConfig } from "apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd";

class _MultipService {

	public static content: IBMultiPurposeConfig = {};
	public static exts: ExternalConnectionConfig = {externalConnections: []};

}


globalThis.__sixempress = (globalThis.__sixempress || {})
globalThis.__sixempress.MultipService = (globalThis.__sixempress.MultipService || _MultipService);
export const MultipService = globalThis.__sixempress.MultipService as typeof _MultipService;
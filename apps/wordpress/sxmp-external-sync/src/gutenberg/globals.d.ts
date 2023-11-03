import { BaseComponents } from "./logic/utils/base-components";
import { DataPass } from "./logic/utils/data-pass.utils";
import { ClientApiService } from "./logic/services/client-api.service";
import { UrlService } from "./logic/services/url.service";

export {};

declare global {

	const React: any;

	interface Window {
		__sxmpes: {
			ajax_url: string,
		},
		__jsr: {
			UrlService: typeof UrlService,
			ClientApiService: typeof ClientApiService,
			BaseComponents: typeof BaseComponents,
			DataPass: typeof DataPass,
		},
	}
}

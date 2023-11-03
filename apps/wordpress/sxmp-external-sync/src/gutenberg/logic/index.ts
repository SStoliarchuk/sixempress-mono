/**
 * This file exists as a way to globally set some classes used by dynamic react components
 * this way the webpack bundler doesnt bundle each util class into each js output file
 * and resulting in a lot of doubles
 * 
 * // TODO find a way with webpack to do this ?
 * // that way in the childs instaed of doing window.__jsr
 * // you can do import etc..
 */
import { ClientApiService } from './services/client-api.service';
import { UrlService } from './services/url.service';
import { BaseComponents } from './utils/base-components';
import { DataPass } from './utils/data-pass.utils';

window.__jsr = {
	UrlService: UrlService,
	ClientApiService: ClientApiService,
	BaseComponents: BaseComponents,
	DataPass: DataPass,
}

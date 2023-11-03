import type { Express } from 'express';
import type { RequestHandler } from 'express';
import type express from 'express';
import { uniqueSlugName } from '../utils/enums';

/**
 * This is just a wrapper on a express app item that is used to "isolate"
 * each client by prefixing the unique slug of the client
 */
export type CustomExpressApp = express.Express;


	/**
	 * Wraps the app so that when you put the url, the url is prefixed with /{category}/{slug}
	 * if the slug is not given, then the prefix is  /{category}/:uniqueSlug
	 */
export function transformExpressApp(app: express.Express): CustomExpressApp {
	return app;
}

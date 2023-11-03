import { Request, Response, Express, NextFunction } from 'express';
import { CronService } from './cron.service';
import { CS } from './context.service';
import { LibBePaths, LibModelClass, uniqueSlugName } from '../utils/enums';
import { RequestHelperService } from './request-helper.service';
import to from 'await-to-js';
import { AuthHelperService } from './auth-helper.service';
import { DecodedAuthzToken, DecodedAuthToken } from './dtd';
import { CustomExpressApp } from '../gateway-paths/transform-express-app';

/**
 * This is the DTD of the item that keep trace of the size used by the users of the system
 * Every single document contains the data of a single MONTH,
 */
export interface RequestsSizeTrace {
	_id?: string;
	/**
	 * Use the whole years number
	 * 2020 2021 2022 etc..
	 */
	year: string;
	/**
	 * Use the months starting from 1, not zero
	 * 1 2 3 4 5 6 7 8 9 10 11 12
	 */
	month: string;
	/**
	 * All the requests traced
	 */
	requests: {
		/**
		 * Each day contains the hours data
		 * the day is just the number from 1 to 31
		 * 
		 * @warning
		 * if a day doesnt have data, then dont create the object,
		 * simply skip that date
		 */
		[day: string]: {
			/**
			 * 
			 * Each object contains the in/out kb of the hour
			 * 
			 * the hour should be just the number
			 * 03:00 => 3
			 * 17:00 => 17
			 * 
			 * @warning
			 * if an hour doesnt have data, then dont create the object,
		 	 * simply skip that hour
			 */
			[hour: string]: {
				/**
				 * The id of the user that has made the request
				 * 
				 * if an id is not found, that means that the requests is from the server itself or some API key
				 * the simply add an empty string
				 * 
				 * @warning
				 * if a user doesnt have data, the dont create the object,
				 * simply skip that user
				 */
				[userId: string]: {
					/**
					 * How many bytes the SERVER has written to the request
					 * (w => Written)
					 */
					w: number,
					/**
					 * How many bytes the USER has sent to the server
					 * (r => Read)
					 */
					r: number,
				}
			}
		}
	};
}

/**
 * We trace the read and written bytes for each user requests and write them to the users db
 * this is to ensure that if we transfer a users db, the history is kept
 * 
 * we can then have a limit on the max requests by simply storing the info in the jwt or something like that
 * and then when the user does a request we check if the limit has been reached, this means we dont need to store this data in the system_control db :]
 */
export class RequestSizeTraceService {
	
	/**
	 * flag to signal that the cronservice to move from RAM to DB has started
	 */
	private static transferSchedulerStarted = false;

	/**
	 * caches the read/written size for each client request, 
	 * and then is emptied later when the cached size are stored to the database
	 */
	private static cache: {[YYYY_MM_DD_HH: string]: {[slug: string]: {[userId: string]: {r: number, w: number}}}} = {};


	private static getCollToUse(slug: string) {
		return CS.db.db(slug).collection<RequestsSizeTrace>(LibModelClass.RequestBytesTrace);
	}

	/**
	 * @param app Creates the app where the user can get the usage statistics
	 */
	static createGetPath(app: CustomExpressApp) {
		app.get('/' + LibBePaths.systemusagestate, async (req, res) => {

			const slug = RequestHelperService.getSlugByRequest(req);
			const date = new Date();
			
			const [errUsage, usageData] = await to(RequestSizeTraceService.getSystemData(slug, date.getFullYear().toString(), date.getMonth().toString()));
			if (errUsage) return RequestHelperService.respondWithError(res, errUsage);

			const [errSize, sizeData] = await to(CS.db.db(slug).command({dbStats: 1, scale: 1024}));
			if (errSize) { return RequestHelperService.respondWithError(res, errSize); }

			res.status(200).send({
				monthlyUsage: usageData,
				kbSize: Math.ceil(sizeData.dataSize)
			});
		});

	}

	/**
	 * ovveride the res.end() function to save how many bytes were read/written
	 * this function should be used in app.use()
	 */
	static overrideResponse(req: Request, res: Response, next: NextFunction) {
		// save the original callbk
		const end = res.end.bind(res);
		RequestSizeTraceService.startScheduler();

		res.end = (...args: any) => {
			end(...args);
			
			const actualRead = (req.socket.bytesRead - ((req.socket as any)._prev_bytesRead || 0));
			const actualWritten = (req.socket.bytesWritten - ((req.socket as any)._prev_bytesWritten || 0));
			(req.socket as any)._prev_bytesRead = req.socket.bytesRead;
			(req.socket as any)._prev_bytesWritten = req.socket.bytesWritten;
			
			// what, sometimes req is undefineds
			if (!req.params) { req.params = {}; }

			RequestSizeTraceService.addToCache(req, actualRead, actualWritten);
		};

		next();
	}

	/**
	 * Adds the bytes to the cache
	 */
	static addToCache(req: Request, r: number, w: number): void {
		const currDay = RequestSizeTraceService.getCurrentDayHour();
		const slug = RequestHelperService.getSlugByRequest(req);

		let userId = '';
		const decoded = AuthHelperService.decodeJwt(req);
		if (decoded) {
			userId = ((decoded.body as DecodedAuthzToken).user && (decoded.body as DecodedAuthzToken).user._id 
				? (decoded.body as DecodedAuthzToken).user._id 
				: (decoded.body as DecodedAuthToken).sub) || "";
		}
		

		if (!RequestSizeTraceService.cache[currDay]) {
			RequestSizeTraceService.cache[currDay] = {};
		}

		if (!RequestSizeTraceService.cache[currDay][slug]) {
			RequestSizeTraceService.cache[currDay][slug] = {};
		}

		if (!RequestSizeTraceService.cache[currDay][slug][userId]) {
			RequestSizeTraceService.cache[currDay][slug][userId] = {r: 0, w: 0};
		}

		// add the KB instead of bytes as we dont need that much precision
		RequestSizeTraceService.cache[currDay][slug][userId].r += Math.ceil(r / 1000);
		RequestSizeTraceService.cache[currDay][slug][userId].w += Math.ceil(w / 1000);

	}

	/**
	 * Returns the current dayhour for the cache system
	 * YYYY/MM/DD/HH
	 */
	private static getCurrentDayHour() {
		const date = new Date();
		return date.getFullYear() + "/" + date.getMonth() + "/" + date.getDate() + "/" + date.getHours();
	}

	/**
	 * Every hour the cached data is moved to the db
	 */
	private static startScheduler() {

		if (RequestSizeTraceService.transferSchedulerStarted) { return; }
		RequestSizeTraceService.transferSchedulerStarted = true;


		// every hour move the items
		CronService.schedule('0 * * * *', async () => {

			const currDay = RequestSizeTraceService.getCurrentDayHour();

			for (const currDayHour in RequestSizeTraceService.cache) {
				// move only the items that will no longer be updated
				if (currDayHour !== currDay) {
					const [err, moved] = await to(RequestSizeTraceService.moveToDb(currDayHour, RequestSizeTraceService.cache[currDayHour]));
					// if errored, then log it
					if (err) {
						console.log(err);
						// wrap in to() to prevent it from throwing
						to(CS.addException(err));
					}
					// if no error, then simply remove the cacehd data
					else {
						delete RequestSizeTraceService.cache[currDayHour];
					}
				}
			}
		});
	}

	/**
	 * Moves the specified cached data to db
	 * @param date The date string that is used in the cache, the date is retrieved from getCurrentDayHour()
	 * @param data The data of a specified dayHour from the cache
	 */
	private static async moveToDb(date: string, data: {[slug: string]: {[userId: string]: {r: number, w: number}}}) {

		const splitDate = date.split('/');
		const year = splitDate[0], 
					month = splitDate[1];

		for (const slug in data) {
			const collection = RequestSizeTraceService.getCollToUse(slug);
						
			const filter = {month, year};
			const [errGet, storedRequestsTraces] = await to<RequestsSizeTrace>(collection.findOne(filter));
			if (errGet) { throw errGet; }
	
			// update in db
			const updated = RequestSizeTraceService.updateTraceObject(date, data[slug], storedRequestsTraces);
			const [errUpd, done] = await to(collection.replaceOne(filter, updated, {upsert: true}) );
			if (errUpd) { throw errUpd; }
		}
	}

	/**
	 * creates the item to store in db
	 */
	private static updateTraceObject(
		date: string, 
		data: {[userId: string]: {r: number, w: number}},
		currentInDB?: RequestsSizeTrace
	): RequestsSizeTrace {

		const splitDate = date.split('/');
		const year = splitDate[0],
					month = splitDate[1],
					day = splitDate[2],
					hour = splitDate[3];

		if (currentInDB) {
			if (!currentInDB.requests[day]) {
				currentInDB.requests[day] = {};
			}
			if (!currentInDB.requests[day][hour]) {
				currentInDB.requests[day][hour] = {};
			}

			for (const uid in data) {
				if (!currentInDB.requests[day][hour][uid]) {
					currentInDB.requests[day][hour][uid] = {r: 0, w: 0};
				}

				currentInDB.requests[day][hour][uid].r += data[uid].r;
				currentInDB.requests[day][hour][uid].w += data[uid].w;
			}

			return currentInDB;
		}
		else {
			return {
				month, year, requests: { [day]: { [hour]: data } }
			};
		}

	}


	public static async getSystemData(systemSlug: string, year: string, month: string): Promise<RequestsSizeTrace> {
		const [err, get] = await to(RequestSizeTraceService.getCollToUse(systemSlug).findOne({year, month}));
		if (err) { throw err; }
		return get;
	}

}


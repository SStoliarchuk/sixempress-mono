import to from "await-to-js";
import { Request, Response } from "express";
import { ObjectId, Filter, FindOptions } from "mongodb";
import { Error403, Error500 } from "../../utils/errors/errors";
import { HttpRequestService } from '../http-request.service';
import { CustomOptionsReturn, IGetMulti, IGetSingle, aggQueryOpts, RequestQueryParams, RequestQueryParamsParsed, MongoProjection } from './dtd';
import { RequestHelperService } from '../../services/request-helper.service';
import { AbstractDbItemController } from "../../object-format-controller/db-item/abstract-db-item.controller";
import { IBaseModel } from "../../object-format-controller/IBaseModel.dtd";
import { ModelFetchService } from './model-fetch.service';
import { ControllersService } from "../controllers.service";
import { MongoUtils } from "../../utils/mongo-utils";

export class RHGet {

	/**
	 * Default fields to NOT return in a GET
	 */
	// static defaultProjection = {};


	public static async executeGetMulti<T extends IBaseModel>(req: Request, res: Response, controller: AbstractDbItemController<T>, options: IGetMulti<T> = {}) {

		const [err, got] = await to(this.executeMultiQuery(req, controller, options));
		if (err) { return RequestHelperService.respondWithError(res, err); }

		// add items count if requested
		if (req.qsParsed.getCount) {
			
			// conunt documents for the filtered
			let errCountFilterd: any, totElementsFilterd: number;
			if (options.customCountFiltered !== false) {
				[errCountFilterd, totElementsFilterd] = await to(options.customCountFiltered
					? options.customCountFiltered(req, got.queryFilters)
					: controller.countForUser(req, got.queryFilters)
				);
			}
			if (errCountFilterd) { return RequestHelperService.respondWithError(res, errCountFilterd); }
			

			// let errCount: any, totElements: number;
			// if (options.customCount !== false) {
			// 	[errCountFilterd, totElementsFilterd] = await to(options.customCount
			// 		? options.customCount(req, got.queryFilters)
			// 		: controller.countForUser(req, {_deleted: {$exists: false}} as Filter<T>)
			// 	);
			// }
			// if (errCount) { return RequestHelperService.respondWithError(res, errCount); }
			
			res.setHeader('X-Filtered-Count', typeof totElementsFilterd === 'number' ? totElementsFilterd : -1);
			res.setHeader('Access-Control-Expose-Headers', 'X-Filtered-Count');
			// res.setHeader('X-Total-Count', totElements);
			// res.setHeader('Access-Control-Expose-Headers', 'f,X-Filtered-Count');
		}

		// YEET them back
		res.send(got.queryResults);
	}


	public static async executeGetSingle<T extends IBaseModel>(req: Request, res: Response, controller: AbstractDbItemController<T>, options: IGetSingle<T> = {}) {
	
		let id: string = req.params.id;
		if (!options.useId) {
			// try to parse the id
			try { new ObjectId(req.params.id); } 
			catch (e) { return RequestHelperService.respondWithError(res, new Error403('Invalid ID passed')); }
		}
		else if (typeof options.useId === 'string') {
			id = options.useId;
		}
		else {
			id = options.useId(req);
		}

		// create filters and projects
		let filters: Filter<any> = {_id: new ObjectId(id)};
		let projection: MongoProjection<T> = {};
		
		if (options.customOptions) {
			let customProjection: MongoProjection<T>[] = [];

			let opts: CustomOptionsReturn<any>;
			try { opts = await options.customOptions(req, filters); }
			catch (e) { return RequestHelperService.respondWithError(res, new Error500(e as any)); }

			if (opts.filters) { filters = opts.filters; }

			if (opts.projection) { 
				customProjection = Array.isArray(opts.projection) ? opts.projection : [opts.projection];
			}

			// force
			if (opts.forceProjections) {
				projection = MongoUtils.mergeProjection(...customProjection) as MongoProjection<T>;
			}
			else {
				try { projection = RHGet.getProjectionParameter(req, controller, [projection, ...customProjection]); } 
				catch (e) { return RequestHelperService.respondWithError(res, e); }
			}
		}
		else {
			try { projection = RHGet.getProjectionParameter(req, controller, projection); } 
			catch (e) { return RequestHelperService.respondWithError(res, e); }
		}

		// query
		let err: any, queryResult: T;
		if (options.customQuery) {
			[err, queryResult] = await to(options.customQuery(req, filters, {projection: projection}));
		} else {
			[err, queryResult] = await to(controller.findOneForUser(req, filters, {base: {projection: projection}}));
		}

		// error
		if (err) { return RequestHelperService.respondWithError(res, err); }

		// 404 send undefined
		if (!queryResult) { return res.send(); }

		// middleware
		if (options.middleware) {
			const mwRes = options.middleware(req, queryResult as T);
			if (mwRes instanceof Promise) {
				const [errMW, successMW] = await to(mwRes);
				if (errMW) { 
					return RequestHelperService.respondWithError(res, errMW);
				}
			} 
			else if (mwRes instanceof Error) { 
				return RequestHelperService.respondWithError(res, mwRes);
			}
		}

		// process options
		const [errOpts, successOpts] = await to(RHGet.processGetOptions(req, [queryResult]));
		if (errOpts) { return RequestHelperService.respondWithError(res, errOpts); }

		res.send(queryResult);
	}


	private static async executeMultiQuery<T extends IBaseModel>(
		req: Request, 
		controller: AbstractDbItemController<T>, 
		options: IGetMulti<T> = {}
	): Promise<{queryResults: T[], queryFilters: any, userFilters: any}> {
		// create query params
		const [filterGenErr, userFilters] = await to(this.createUserFilters(req, controller));
		if (filterGenErr) { throw filterGenErr; }
	
		// get custom query options
		const queryOptions = options.customOptions ? await options.customOptions(req, userFilters) : {};

		// query options
		const qOpts = this.createQueryOptionsFromReq(req, controller, queryOptions.projection);
		// force projections
		if (queryOptions.forceProjections) {
			qOpts.projection = MongoUtils.mergeProjection(
				...(Array.isArray(queryOptions.projection) ? queryOptions.projection : [queryOptions.projection]),
				qOpts.projection as any,
			)
		}

		// override filters to use
		const queryFilters = queryOptions.filters || userFilters;

		// query the document
		let err: any, queryResults: T[];

		if (options.customQuery) {
			[err, queryResults] = await to(options.customQuery(req, queryFilters, {...qOpts, collation: {locale: 'en_US'}}));
			if (err) { throw err; }
		} else {
			[err, queryResults] = await to(controller.findForUser(req, queryFilters, {base: {...qOpts, collation: {locale: 'en_US'}}, skipFilterControl: options.skipFilters}));
			if (err) { throw err; }
		}
		
		// execute options.middleware
		if (options.middleware) {
			const mwRes = options.middleware(req, queryResults);
			if (mwRes instanceof Promise) {
				const [errMW, successMW] = await to(mwRes);
				if (errMW) { 
					throw errMW;
				}
			} 
			else if (mwRes instanceof Error) { 
				throw mwRes;
			}
		}

		// process options
		const [errOpts, successOpts] = await to(RHGet.processGetOptions(req, queryResults));
		if (errOpts) { throw errOpts; }

		return {queryResults, queryFilters, userFilters: userFilters};
	}


	/**
	 * Creates the filters from the users query string\
	 * It trasforms the filter on fetched items into id of arrays\
	 * 
	 * EXAMPLE:\
	 * input: {'type': 1, 'customer.fetched.name': "name1"}\
	 * output: {'type': 1, 'customer.id': {$in: [ObjectId, ObjectId, ObjectId]}}
	 */
	public static async createUserFilters(req: Request, controller: AbstractDbItemController<any>): Promise<Filter<any>> {

		// query options
		const filters: Filter<any> = req.qsParsed.filter || {};

		// an array of filters
		if (filters.constructor === Array) {
			throw new Error403("The filter parameter must contain an object not an array");
		}

		// check if the filter has no keys
		if (Object.keys(filters).length === 0) { 
			return filters;
		}
		// esnure that _id filters are objectId();
		MongoUtils.idToObjectId(filters);


		// Checks if in the filters, there is a custom filter for a fetched field, if there is, then controls if the query options are set
		// this is to optimize the options control, instead of parsing every time the options param
		
		// if there is a filter for a fetched field then exectues function to get the right params
		const str = JSON.stringify(filters);
		if (str.includes('.fetched.')) {
			await Promise.all(RHGet.createFetchedFiltersRequests(req, filters, controller));
		}
		

		return filters;
	}

	/**
	 * Creats the requests object for the fetched query
	 */
	private static createFetchedFiltersRequests(req: Request, filters: Filter<any>, controller: AbstractDbItemController<any>, promises: Promise<void>[] = []) {

		const queryOps: {[beforeFetched: string]: {
			query: object,
		}} = {};

		// build ops to make
		for (const filterField in filters) {

			const regRes = filterField.includes('fetched') && filterField.match(/(.*?)\.fetched\.(.*)/i);
			// ops present
			if (regRes) {
				const fieldName = regRes[1];
				const queryField = regRes[2];

				// 
				// add queries togheter if the target field is the same
				//
				if (!queryOps[fieldName])
					queryOps[fieldName] = { query: {} };
				queryOps[fieldName].query[queryField] = filters[filterField];
				delete filters[filterField];
			}
			// else deep check
			else if (typeof filters[filterField] === 'object') {
				this.createFetchedFiltersRequests(req, filters[filterField], controller, promises);
			}
		}
		
		for (const fieldName in queryOps) {
			promises.push((async () => {
				// get the object that contains the modelClass of the field to fetch
				const objInfo: IBaseModel = await controller.getRawCollection(req).findOne({[fieldName]: {$exists: true}}, {projection: {[fieldName + '.modelClass']: 1}});

				// no such object with such field to fetch
				if (!objInfo) {
					// add impossibile query to invalidate this filter
					// in a perfect world we would delete it, but that gets complicated as this filters are recursive with special ops etc
					// :/
					filters['_id'] = {$exists: false};
					return; 
				}

				// build the target controller and fetch the ids that match the filter
				const modelClassToFetch = this.getModelClassToFetchFromObject(objInfo, fieldName);
				const targetInfo = ControllersService.getInfoByModelClass(modelClassToFetch);
				if (!targetInfo) 
					throw new Error500("Searching on a fetchable field that has no controller registered");

					// get without user filter as in a fetch we dont want any "errors" showing because of permissions etc.
				const bReq: Request = {...req, query: { 
					filter: JSON.stringify(queryOps[fieldName].query), 
					projection: JSON.stringify({_id: 1}) 
				}} as any as Request;
				RequestHelperService.parseQueryStrings(bReq);
				
				const targetController = new (targetInfo.controller as any)();
				const resGet = await RHGet.executeMultiQuery(bReq, targetController, {skipFilters: true});

				filters[fieldName + ".id"] = { $in: resGet.queryResults.map(v => v._id.toString()) };
			})());
		}

		return promises;
	}

	/**
	 * traverses object and arrays to find it's true love: the model class to fetch
	 */
	private static getModelClassToFetchFromObject(o: any, fieldName: string): string {
		const paths = fieldName.split('.');
		
		let traversing = [o];
		for (let i = 0; i < paths.length; i++) {
			const p = paths[i];
			const newTraversed = [];
			for (const t of traversing) {
				if (t[p] && typeof t[p] === 'object') {
					if (Array.isArray(t[p])) {
						newTraversed.push(...t[p]);
					} else {
						newTraversed.push(t[p]);
					}
				}
			}
			traversing = newTraversed;
		}
		
		return traversing.find(t => t.modelClass).modelClass;
	}

	/**
	 * Creates query options for mongodb
	 * @param beProjection projection for a given request received from the BE
	 */
	private static createQueryOptionsFromReq<T extends IBaseModel= any>(req: Request, controller: AbstractDbItemController<T>, beProjection?: MongoProjection<T> | MongoProjection<T>[]): FindOptions<T> {
		
		// create options for the table
		const toR: RequestQueryParamsParsed = {};

		// sort
		if (req.qsParsed.sort) {
			const ks = Object.keys(req.qsParsed.sort);
			
			// ensure to give only 1 valid key
			if (ks[0] && typeof req.qsParsed.sort[ks[0]] === 'number') {
				toR.sort = {[ks[0]]: req.qsParsed.sort[ks[0]]};
			}
		}
		
		// skip
		if (typeof req.qsParsed.skip !== 'undefined') {
			toR.skip = req.qsParsed.skip;
		}

		// limit
		if (typeof req.qsParsed.limit === 'number') {
			if (req.qsParsed.limit !== -1) {
				toR.limit = req.qsParsed.limit;
			}
		} else {
			toR.limit = 5000;
		}

		// proj
		const proj = RHGet.getProjectionParameter(req, controller, beProjection);
		if (Object.keys(proj).length) { 
			toR.projection = proj; 
		}

		return toR;
	}

	/**
	 * @WARNING
	 * Throws 403 when the projections are invalid
	 */
	private static getProjectionParameter(req: Request, controller: AbstractDbItemController<any>, beProjection?: MongoProjection<any> | MongoProjection<any>[]): any {

		// quick return as there is no user projection
		if (!req.qsParsed.projection) {
			return Array.isArray(beProjection) 
				? MongoUtils.mergeProjection(...beProjection)
				: beProjection || {}
		}

		// create projection to use
		let projectionToUse = req.qsParsed.projection;
		MongoUtils.fixProjectionsPathCollision(projectionToUse);

		// merge user and be projection
		if (beProjection || controller.projectionToUse) {
			projectionToUse = Array.isArray(beProjection) 
				? MongoUtils.mergeProjection(projectionToUse, ...beProjection, (controller.projectionToUse || {}))
				: MongoUtils.mergeProjection(projectionToUse, beProjection, (controller.projectionToUse || {}));
			// projectionToUse = RHGet.mergeProjection([projectionToUse, beProjection, RHGet.defaultProjection, (this.model.projectionToUse || {})]);
		}

		return projectionToUse;
	}

	/**
	 * Processes the options parameter from the request
	 * @param queryRes Query result / results from getMulti/getSignle
	 */
	public static async processGetOptions(req: Request, queryRes: any[]): Promise<void> {
		// returns if no queried elements
		if (queryRes.length === 0) { return; }

		// process extra options such as fetch
		const options: RequestQueryParamsParsed['options'] = req.qsParsed.options || {};
		if (req.qsParsed.fetch) { 
			options.fetch = req.qsParsed.fetch; 
		}

		// process fetchs
		if (options.fetch) {
			
			// check if its array
			if (options.fetch.constructor !== Array) { throw new Error403('options.fetch has to be an array'); }

			// fetch the fields and set
			const [error, fieldsSet] = await to(ModelFetchService.fetchAndSetFields(req, options.fetch, queryRes));
			if (error) { throw error; }

		}

	}
	




}

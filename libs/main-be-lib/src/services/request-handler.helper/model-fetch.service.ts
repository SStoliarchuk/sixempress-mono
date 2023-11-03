import { ObjectUtils } from '../../utils/object-utils';
import { FetchableField } from "../../object-format-controller/fetchable-field";
import { MongoDBFetch } from '../../utils/dtd';
import { Error403, Error500 } from '../../utils/errors/errors';
import { HttpRequestService } from '../http-request.service';
import { ControllersService } from '../controllers.service';
import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { MongoUtils } from '../../utils/mongo-utils';

declare global {
  interface filters {
    sxmp_fetch_fallback_model: <T extends object>(models: T[], modelClass: string, params: {ids: ObjectId[], projection?: object, toFetch?: MongoDBFetch[]}) => T[];
  }
}

type SingleFetch = {
	ids: string[],
	field: string,
	projection?: any,
	recursiveFetch?: MongoDBFetch[],

	result?: object[],
	idHm?: { [id: string]: Object },
};

export class ModelFetchService {

	/**
	 * Fetches fields and sets them in the queried documents
	 * @param fetchOptions The options.fetch field from the request
	 * @param queryRes An arrays of queried Documents from mongodb
	 */
	public static async fetchAndSetFields(req: Request, fetchOptions: MongoDBFetch[], queryRes: any[]): Promise<void> {

		if (!fetchOptions.length)
			return;

		// create requests to cast
		// we create an array of requests, for different projections and options
		const requestsToCast: { [modelClass: string]: SingleFetch[] } = {};

		// recursive fetch are added as options to the normal requests
		// so first we create normal, then recursive
		const recursiveFetch: MongoDBFetch[] = [];

		for (let i = 0; i < fetchOptions.length; i++) {

			const toFetch = fetchOptions[i];

			if (toFetch.field === undefined)
				throw new Error403('The fetch instruction object is missing property "field"');

			// add to recrusvie fetch and remove from fetchOptions array as it's useless here
			if (toFetch.field.includes(".fetched.")) {
				recursiveFetch.push(toFetch);
				fetchOptions.splice(i, 1);
				i--;
				continue;
			}

			const idsByModels = this.getIdsByModels(toFetch.field, queryRes);
			if (!Object.keys(idsByModels).length) 
				continue;

			for (const mc in idsByModels) {
				if (!requestsToCast[mc])
					requestsToCast[mc] = [];

				const present: SingleFetch = requestsToCast[mc].find(r => r.field === toFetch.field);
				if (!present)
					requestsToCast[mc].push({ ids: idsByModels[mc], field: toFetch.field, projection: toFetch.projection });
				else {
					present.ids.push(...idsByModels[mc])
					
					// if both projection present, merge them
					if (present.projection && toFetch.projection)
						present.projection = MongoUtils.mergeProjection(present.projection, toFetch.projection)
					// else set new projection if present
					else if (toFetch.projection)
						present.projection = toFetch.projection
				}
			}
		}

		// add to the parent the desired recursive fetch
		if (recursiveFetch.length !== 0) {
			for (const toFetch of recursiveFetch) {
				const regRes = toFetch.field.match(/(.*?)\.fetched\.(.*)/i);
				const parentField = regRes[1];
				const childField = regRes[2];

				for (const mc in requestsToCast) {
					const parentFetch = requestsToCast[mc].find(f => f.field === parentField);
					// TODO if not present, then add it automatically
					if (!parentFetch)
						continue;

					if (!parentFetch.recursiveFetch)
						parentFetch.recursiveFetch = [];
					parentFetch.recursiveFetch.push({ ...toFetch, field: childField });
				}
			}
		}

		if (!Object.keys(requestsToCast).length) 
			return;

		// forkJoin requests
		const fetchActionsToExecute: Promise<any>[] = [];
		for (const mc in requestsToCast) {
			for (const singleR of requestsToCast[mc]) {
				fetchActionsToExecute.push((async () => {
					const res = await this.fetchRequest(req, mc, {
						ids: singleR.ids.map(i => new ObjectId(i)),
						projection: singleR.projection,
						toFetch: singleR.recursiveFetch,
					});

					singleR.result = res;
					singleR.idHm = ObjectUtils.arrayToHashmap(res, '_id');
				})());
			}
		}

		// execute and remap
		await HttpRequestService.forkJoinPromises(fetchActionsToExecute);
		for (const mc in requestsToCast)
			for (const r of requestsToCast[mc])
				for (const fetch of this.getAllEndObjectsOfWildcard(r.field, queryRes) as FetchableField<any>[])
					if (fetch?.id && r.idHm[fetch.id])
						ObjectUtils.setValueByDotNotation(fetch, 'fetched', r.idHm[fetch.id]);

	}

	/**
	 * Recursive find and fetch
	 */
	private static async fetchRequest(req: Request, modelClass: string, params: {ids: ObjectId[], projection?: object, toFetch?: MongoDBFetch[]}) {
		const info = ControllersService.getInfoByModelClass(modelClass);
		// in case it is not register try to find it in modules
		if (!info) 
			return use_filter.sxmp_fetch_fallback_model(req, [], modelClass, params);
			// throw new Error500("ModelFetchService::fetchRequest => Controller for modelClass: \"" + modelClass + "\" not registered.");

		const controller = new (info.controller as any)();
		const toR = await controller.findForUser(req, { _id: { $in: params.ids } }, { base: { projection: params.projection || {} }, skipFilterControl: true });
		if (params.toFetch)
			await ModelFetchService.fetchAndSetFields(req, params.toFetch, toR);

		return toR;
	}

	/**
	 * Returns ids of a field sorted by modelClasses
	 */
	private static getIdsByModels(field: string, queryRes: any[]) {
		const endObjs: FetchableField<any>[] = this.getAllEndObjectsOfWildcard(field, queryRes) as any;
		const ret: {[modelClass: string]: string[]} = {};
		
		for (const e of endObjs) {
			if (!e.modelClass)
				continue;

			if (!ret[e.modelClass])
				ret[e.modelClass] = [];

			ret[e.modelClass].push(e.id);
		}

		return ret;
	}


	/**
	 * Mangaes the fetching for the wild card paths, by traversing them with some magic
	 * @param path the wild card path to the field to get "a.\*.b.\*.c.\*.f"
	 * @param singleQ A single object of which to manage the assingment
	 * @param endFn The end function to execute on all of the end objects found at the last path
	*/
	private static getAllEndObjectsOfWildcard(path: string, initialObject: object | object[]): any[] {
		const pathsToTraverse = path.split('*').map(i => i.replace(/(^\.)|(\.$)/g, ''));

		// attraverse the object to the last array
		// and save the latest object in the path
		let latestObject: any[] = initialObject.constructor === Array ? initialObject : [initialObject] as any;
		// using - 2 because the last voice is the path to use in the latestObject array
		// the last voice is not a path to another array
		for (let i = 0; i < pathsToTraverse.length - 1; i++) {
			// create the array of objects from the paths
			const toSet = [];
			for (const obj of latestObject) {
				// get the latest array
				const val = ObjectUtils.getValueByDotNotation(obj, pathsToTraverse[i]);
				if (val) 
					toSet.push(...val);
			}
			// reassing the latest obj
			latestObject = toSet;
		}

		const lastPathValue = pathsToTraverse[pathsToTraverse.length - 1];
		if (!lastPathValue)
			return latestObject;

		const toR = [];
		for (const obj of latestObject) {
			const val = ObjectUtils.getValueByDotNotation(obj, lastPathValue);
			if (val)
				toR.push(val);
		}
		return toR;

	}


	
}

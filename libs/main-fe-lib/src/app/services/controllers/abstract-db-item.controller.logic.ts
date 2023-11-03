import { ObjectUtils } from "@sixempress/utilities";
import { RequestService } from "../request-service/request-service";
import { RequestParams } from "../request-service/request.dtd";
import { IBaseModel, DbObjectSettings, QueryFetch, DbObjectInfo, ControllerQueryOpts, DbItemSchema, QueryProjection, GetMultiReponse } from "./controllers.dtd";
import { IPatchOperation } from './dtd';

export abstract class AbstractDbItemControllerLogic<T extends IBaseModel> {

	public abstract bePath: string;

	public abstract modelClass: string;

	protected abstract fetchInfo: DbObjectSettings<T>;

	/**
	 * Returns multiple items and their count
	 * @param opts additional query options
	 */
	public async getMulti(opts?: ControllerQueryOpts<T>): Promise<GetMultiReponse<T>> {
		const processedOpts = this.preprocessOpts(opts);

		const res = await RequestService.client<T[]>('get', this.bePath, processedOpts);
		const filtered = +res.headers['x-filtered-count'];

		return {
			data: res.data,
			matchCount: isNaN(filtered) ? -1 : filtered,
		}
	}

	/**
	 * Returns a single element from DB
	 * @param id Id of the element to return
	 * @param opts additional query options
	 */
	public async getSingle(id: string, opts?: ControllerQueryOpts<T>): Promise<T> {
		const processedOpts = this.preprocessOpts(opts);
		
		const res = await RequestService.client<T>('get', this.bePath + id, { addChosenLocationContent: false, addChosenLocationFilter: false, ...processedOpts});
		return res.data;
	}

	/**
	 * patch request to the element
	 * @param id object id
	 * @param patches the patches to apply
	 * @param opts additional opts
	 */
	public async patch(id: string, patches: IPatchOperation<T>[], opts?: ControllerQueryOpts<T>): Promise<T> {
		const processedOpts = this.preprocessOpts(opts);

		const res = await RequestService.client<T>('patch', this.bePath + id, { data: patches, ...processedOpts });
		return res.data;
	}

	/**
	 * replace object in backend
	 * @param id object id
	 * @param obj object to replace with
	 * @param opts additional opts
	 */
	public async put(id: string, obj: T, opts?: ControllerQueryOpts<T>): Promise<T> {
		const processedOpts = this.preprocessOpts(opts);

		const res = await RequestService.client<T>('put', this.bePath + id, { data: obj, ...processedOpts });
		return res.data;
	}

	/**
	 * creates an object in backend
	 * @param obj object to create
	 * @param opts additional opts
	 */
	public async post(obj: T | T[], opts?: ControllerQueryOpts<T>): Promise<T> {
		const processedOpts = this.preprocessOpts(opts);

		const res = await RequestService.client<T>('post', this.bePath, { data: obj, ...processedOpts });
		return res.data;
	}

	
	/**
	 * Deletes an element in DB
	 * @param id id to delete
	 * @param opts additional query options
	 */
	public async deleteSingle(id: string, opts?: RequestParams<T>): Promise<void> {
		await RequestService.client<T>('delete', this.bePath + id, opts);
	}

	/**
	 * Preprocesses the opts to allow some QOL things
	 */
	private preprocessOpts(opts: ControllerQueryOpts<T> = {}): RequestParams<T> {
		if (!opts.params)
			opts.params = {};

		if (opts.params.fetch === true)
			opts.params.fetch = this.getFullFetch();

		//
		// clear filter array
		//
		if (opts.params.filter && Array.isArray(opts.params.filter)) {
			if (opts.params.filter.length === 1)
				opts.params.filter = opts.params.filter[0];
			else if (opts.params.filter.length)
				opts.params.filter = { $and: opts.params.filter };
			else
				delete opts.params.filter;
		}

		//
		// handle graphql like schema
		//
		if (opts.params.schema) {
			const schemaInfo = this.buildGetOptionsBySchema(opts.params.schema);
			if (!opts.params.fetch)
				opts.params.fetch = [];
			opts.params.fetch = [...opts.params.fetch, ...schemaInfo.fetch];

			if (!opts.params.projection)
				opts.params.projection = {};
			opts.params.projection = {...opts.params.projection, ...schemaInfo.projection};
		}

		return opts as RequestParams<T>;
	}

	/**
	 * Returns an array to fetch all the fields inside the item
	 */
	public getFullFetch(): QueryFetch<T>[] {
		return this.recursiveBuildFullFetch();
	}

	/**
	 * Recursive build the fetch parameters based on the dtd info of the contrller
	 */
	private recursiveBuildFullFetch(o = this.fetchInfo, pathToPoint: string = '') {
		const toR: QueryFetch<T>[] = [];
		
		for (const k in o) {
			const kt = Array.isArray(o) ? "" : k;
			const toAddPath = Array.isArray(o[k]) ? kt ? kt + '.*' : "*" : kt;
			const field = toAddPath ? pathToPoint ? pathToPoint + '.' + toAddPath : toAddPath : pathToPoint;

			// add to bePath
			if (o[k] && typeof o[k] === 'object' && Object.keys(o[k]).length === 0)
				toR.push({ ...(o[k] as DbObjectInfo<T>), field: field as keyof T });
			else
				toR.push(...this.recursiveBuildFullFetch(o[k] as any, field));
		}

		return toR;
	}

	/**
	 * Given a schema it returns the fetch options and the projection for that schema
	 * @param schema graph-ql like schema
	 */
	public buildGetOptionsBySchema(schema: DbItemSchema<T>): { fetch: QueryFetch<T>[], projection: QueryProjection<T> } {
		// TODO move this logic to the backend like true graph ql ?

		const projs = this.getProjections(schema);
		const fetchsInfo = ObjectUtils.objToPathAndValueHM(schema, true);

		const fields: { [path: string]: any } = {};
		for (const f in fetchsInfo) {
			if (!f.includes('fetched'))
				continue;

			const paths = f.split('.fetched');
			const projPaths: string[] = [];
			const fetchPaths: string[] = [];
			// paths[] has .0.0.0 for arrays
			// the projections dont need array paths
			// the fetch need the wildcards .*.*.*
			//
			// so we create two separate arrays for that
			for (let i = 0; i < paths.length; i++) {
				const p = paths[i];
				if (p.includes('.0')) {
					projPaths.push((i === 0 ? p : p.substr(1)).replace(/\.0/g, ''));
					fetchPaths.push(p.replace(/\.0/g, '.*'));
				}
				else {
					projPaths.push((i === 0 ? p : p.substr(1)));
					fetchPaths.push(p);
				}
			}

			// add the base path to the root projection
			projs[projPaths[0] as keyof T] = 1 as any;

			// add fetch items and their projection
			for (let i = 0; i < fetchPaths.length - 1; i++) {
				let pathToPoint = '';
				for (let j = 0; j < i; j++)
					pathToPoint += fetchPaths[j] + '.fetched';

				const path = pathToPoint + fetchPaths[i];
				// add path to the fetch
				if (!fields[path])
					fields[path] = {};
				// ad proj if needed
				if (fetchPaths[i + 1])
					fields[path][projPaths[i + 1]] = 1;
			}
		}

		const toFetch: QueryFetch<any>[] = [];
		for (const f in fields)
			toFetch.push(Object.keys(fields[f]).length === 0 ? { field: f } : { field: f, projection: fields[f] });

		return { projection: projs, fetch: toFetch };
	}

	/**
	 * builds mongodb projections from a graph-ql like schema
	 * @param schema graph-ql like schema
	 */
	private getProjections(schema: DbItemSchema<T>): QueryProjection<T> {
		const paths = ObjectUtils.objToPathAndValueHM(schema, true);
		const projs: QueryProjection<T> = {};

		for (const p in paths) {
			// projections on the fetched childs are useless
			if (p.includes('fetched.'))
				continue;

			let k = p;

			// remove the trailing .fetched projection
			// thus fetching .id .modelClass of the fetched field
			if (p.endsWith('.fetched'))
				k = p.replace('.fetched', '');

			// remove array traversal
			if (p.includes('.0')) {
				k = p.replace(/\.0/g, '');
				paths[k] = paths[p];
				delete paths[p];
			}

			if (paths[k] === 1)
				projs[k as keyof T] = 1 as any;

		}
		return projs;
	}


	/**
	 * This function only works on projections that dont traverses array, for that use the AbstractDbItemController.buildGetOptionsBySchema()
	 * this is just an util for dt table
	 * 
	 * @param proj projections that DO NOT traverse an array
	 */
	public getToFetchByProjection(proj: QueryProjection<any>): QueryFetch<any>[] {
		const fetchsInfo = proj;

		const fields: { [path: string]: any } = {};
		for (const f in fetchsInfo) {
			if (!f.includes('fetched'))
				continue;

			const paths: string[] = f.split('.fetched');

			// remove the starting dot on paths
			for (let i = 1; i < paths.length; i++)
				paths[i] = paths[i].substr(1);

			// add fetch items and their projection
			for (let i = 0; i < paths.length - 1; i++) {
				let pathToPoint = '';
				for (let j = 0; j < i; j++)
					pathToPoint += paths[j] + '.fetched';

				const path = pathToPoint + paths[i];
				if (!fields[path])
					fields[path] = {};
				
				if (paths[i + 1])
					fields[path][paths[i + 1]] = 1;

			}
		}

		const toFetch: QueryFetch<any>[] = [];
		for (const f in fields)
			toFetch.push(Object.keys(fields[f]).length === 0 ? { field: f } : { field: f, projection: fields[f] })

		return toFetch;
	}

}
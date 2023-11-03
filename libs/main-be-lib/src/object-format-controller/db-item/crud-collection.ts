import { Collection, Db, Filter, FilterOperators, ObjectId } from "mongodb";
import { CS } from "../../services/context.service";
import { MongoUtils } from "../../utils/mongo-utils";
import { SocketCodes, SocketDBObjectChangeMessage, SocketNamespaces } from "../../services/socket/socket.dtd";
import { AugmentedRequest, HookActions } from "@stlse/backend-connector";
import to from "await-to-js";
import { LibModelClass } from "../../utils/enums";

export declare type CrudType = 'create' | 'update' | 'delete';

export type CrudInformation = {type: CrudType, modelClass: string, ids: string[]};

/**
 * A Middlware between a mongodb collection to notify the external world of changes occuring to that collection
 */
export class CrudCollection  {

	/**
	 * A Flag used for tests
	 */
	public static isEnabled = true;

	public static actions: HookActions = {
    stlse_db_collection: {
			// after all the normal hooks
			priority: 11,
			fn: (ctx, ret, collection: string, operation: keyof Collection, ...args: any[]) => {
				// if we await the sync() event this means that we will be nesting deeply and deeply into the newer "req" objects
				// eventually reaching the hook call stack limit
				// TODO: that's the theory, check if true
				CrudCollection.onAfterDbOp(ctx.req, collection, operation, args, ret)
				.then((dbinfo) => dbinfo && dbinfo.length && Promise.all([
					// TODO add here use_action.sxmp_on_after_db.ignored ??
					use_action.sxmp_on_after_db(ctx.req, dbinfo, {args}),
					// emit to socket
					...dbinfo.map(info => use_action.stlse_socket_emit(
						ctx.req, SocketNamespaces.clients, ctx.req.instanceId!, SocketCodes.dbObjectChange, 
						{i: info.ids, m: info.modelClass} satisfies SocketDBObjectChangeMessage
					))
				]))
				.catch(err => CS.addException(ctx.req, err));

				return ret;
			},
		}
	};

	/**
	 * Builds a mongodb collection with a proxie to check for update documents
	 */
	public static async onAfterDbOp(req: AugmentedRequest, collection: string, method: string, args: any[], result: any): Promise<CrudInformation[] | void> {
		if (collection === LibModelClass.Exception)
			return;

		switch (method) {
			case 'findOneAndUpdate':   return CrudCollection.proxyFunction(req, collection, args, result, 'changeOne');
			case 'findOneAndReplace':  return CrudCollection.proxyFunction(req, collection, args, result, 'changeOne');
			case 'replaceOne':         return CrudCollection.proxyFunction(req, collection, args, result, 'changeOne');
			case 'updateOne':          return CrudCollection.proxyFunction(req, collection, args, result, 'changeOne');

			case 'updateMany':         return CrudCollection.proxyFunction(req, collection, args, result, 'changeMany');

			case 'update':             return CrudCollection.proxyFunction(req, collection, args, result, 'change');
			
			case 'findOneAndDelete':   return CrudCollection.proxyFunction(req, collection, args, result, 'deleteOne');
			case 'deleteOne':          return CrudCollection.proxyFunction(req, collection, args, result, 'deleteOne');
			case 'deleteMany':         return CrudCollection.proxyFunction(req, collection, args, result, 'deleteMany');
			case 'remove':             return CrudCollection.proxyFunction(req, collection, args, result, 'deleteMany');
			
			case 'insert':             return CrudCollection.proxyFunction(req, collection, args, result, 'insert');
			case 'insertOne':          return CrudCollection.proxyFunction(req, collection, args, result, 'insert');
			case 'insertMany':         return CrudCollection.proxyFunction(req, collection, args, result, 'insert');
			
			case 'bulkWrite':          return CrudCollection.proxyFunction(req, collection, args, result, 'bulk');
		}
	}

	/**
	 * After we execute the query, we check for the affected ids and emit them, if our middleware errors, it gets logged withouth throwing or affecting the original query function
	 */
	private static async proxyFunction(req: AugmentedRequest, coll: string, args: any[], result: any, type: "deleteOne" | "deleteMany" | "insert" | "changeOne" | "changeMany" | "change" | 'bulk'): Promise<CrudInformation[]> {
		const [filterOrInsertOrBulk, other, options] = args;
		
		// newly created items
		if (result && type === 'insert') {
			const ids = result.ops && result.ops[0] && result.ops[0]._id 
				? result.ops.map(o => o._id.toString())
				: Object.values(result.insertedIds || {}).map(i => i.toString());
			return [{type: 'create', modelClass: coll, ids}];
		}
		
		// complex bulk operation
		if (result && type === 'bulk') {
			const data = await CrudCollection.buildBulkIdsUpdateList(req, result.result || result, filterOrInsertOrBulk, coll)
			const keys = Object.keys(data) as (keyof typeof data)[];
			const info: CrudInformation[] = keys.map(k => ({type: k, ids: data[k], modelClass: coll}));
			return info;
		}

		// do simple logic
		let crudType: CrudType;
		let isOne: boolean = false;

		if (type === 'change')
			type = options && options.multi ? 'changeMany' : 'changeOne';

		// act on the emit
		switch (type) {
			case 'changeOne':  crudType = 'update'; isOne = true; break;
			case 'changeMany': crudType = 'update';               break;

			case 'deleteOne':  crudType = 'delete'; isOne = true; break;
			case 'deleteMany': crudType = 'delete';               break;
		}

		const ids = await CrudCollection.buildIdsListFromUpdate(req, filterOrInsertOrBulk, coll, isOne)
		return [{type: crudType, modelClass: coll, ids}];
	}

	/**
	 * Creates a list of ids of the items updated, first tries to find the _id field, if not present then it re-queries the items with the filter, and this way gets the ids
	 */
	private static async buildIdsListFromUpdate(req: AugmentedRequest, filter: Filter<any>, coll: string, isOne?: boolean): Promise<string[]> {

		let idsList: string[] = [];

		// we only try to get the _id from the root of the filter
		// instead of searching throughout the whole filter, as the _id could be in an $or
		// so we won't get the real value
		//
		// this works 99% of the time as we rarely do updates without the _id field
		if (filter._id) {
			// single string id
			if (typeof filter._id === 'string' || MongoUtils.isObjectId(filter._id)) {
				idsList.push(filter._id.toString());
			}
			// else we check ONLY for $in filter
			// as $nin/$ne are filters that do not contain the affected ids
			else if ((filter._id as FilterOperators<any>).$in) {
				for (const i of (filter._id as FilterOperators<any>).$in) {
					if (typeof i === 'string' || MongoUtils.isObjectId(i)) {
						idsList.push(i.toString());
					}
					// if one of the $in values is not an id, then we reset the ids list array as we will not have the correct ids values in it
					else {
						idsList = [];
						break;
					}
				}
			}
		}

		// if the _id field is not in the root we are in the other 1% of the cases
		// and we fallback to querying the items updated with the given filter
		// and then we return the ids of the resulting items
		if (idsList.length === 0) {
			if (isOne) {
				const r = await CS.db.db(req).collection(coll).findOne(filter);
				if (r) 
					idsList.push(r._id.toString());
			}
			else {
				const r = await CS.db.db(req).collection(coll).find(filter).toArray();
				if (r.length) 
					idsList = r.map(i => i._id.toString());
			}
		}

		return idsList;
	}

	/**
	 * reads the operations to execute and finds the target ids from the given filters
	 */
	private static async buildBulkIdsUpdateList(req: AugmentedRequest, result: any, bulkOps: any[], coll: string): Promise<{create: string[], update: string[], delete: string[]}> {
		const allIds: {create: string[], update: string[], delete: string[]} = {create: [], update: [], delete: []};
		
		for (const op of bulkOps) {
			const k = Object.keys(op)[0];
			switch (k) {
				case "insertOne": 	
					if (result.insertedIds) {
						const list = Object.values(result.insertedIds) as string[];
						if (MongoUtils.isObjectId(list[0]) || (typeof list[0] === 'string' && list[0].match(MongoUtils.objectIdRegex))) {
							allIds.create.push(...list.map(i => i.toString()));
							break;
						}
						if (typeof (list[0] as any).index === 'number') {
							allIds.create.push(...list.map(i => (i as any)._id.toString()));
							break;
						}
					}
					throw new Error('Could not find id from result: ' + JSON.stringify(result));
					break;

				case "updateOne": 	allIds.update.push(...(await CrudCollection.buildIdsListFromUpdate(req, op[k].filter, coll, true))); 	break;
				case "updateMany": 	allIds.update.push(...(await CrudCollection.buildIdsListFromUpdate(req, op[k].filter, coll)));			 		break;
				case "replaceOne": 	allIds.update.push(...(await CrudCollection.buildIdsListFromUpdate(req, op[k].filter, coll, true))); 	break;

				case "deleteOne": 	allIds.delete.push(...(await CrudCollection.buildIdsListFromUpdate(req, op[k].filter, coll, true))); 	break;
				case "deleteMany": 	allIds.delete.push(...(await CrudCollection.buildIdsListFromUpdate(req, op[k].filter, coll))); 				break;
			}

			// http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#bulkWrite
			// { insertOne: { document: { a: 1 } } }
			// { updateOne: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } }
			// { updateMany: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } }
			// { deleteOne: { filter: {c:1} } }
			// { deleteMany: { filter: {c:1} } }
			// { replaceOne: { filter: {c:3}, replacement: {c:4}, upsert:true}}
		}

		return allIds;
	}

}

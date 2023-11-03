import { AbstractDbApiItemController, ObjectUtils, RequestHelperService, FetchableField, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue, AbstractDbItemController, LogService, Error500, IVerifiableItemDtd, IVerifiableItemDtdStatic, DBGetOptions, DBGetReturnValue, DBGetOptionsMethods, MongoUtils, Error403, Error404, DeleteOptions, DeleteResult } from '@sixempress/main-be-lib';
import { Request } from 'express';
import { Filter, ObjectId, AnyBulkWriteOperation, UpdateFilter, FindOptions } from 'mongodb';
import to from 'await-to-js';
import { MultipleModelTrackableVariation, TrackableVariation } from './TrackableVariation';

type MultiModelTarget<T> = T extends MultipleModelTrackableVariation<any, infer U> ? U : T;

/**
 * Allows to create a model that when modified creates a copy and stores the old model
 * 
 * this way you can keep track of each variation separetly so you can use it for statistics, prices etc
 */
export abstract class TrackableVariationController<T extends TrackableVariation<any> | MultipleModelTrackableVariation<any, any>> extends AbstractDbApiItemController<T> {

	/**
	 * If true, then the model is a multiple document item,
	 * like productsGroup
	 */
	protected modelIsMultiple = false;

	abstract dtd: IVerifiableItemDtdStatic<T>;

	/**
	 * List of fields that has to be ALWAYS equal between the multiple models
	 */
	protected getGlobalFields(): (keyof T)[] { return [
		'_trackableGroupId',
		'groupData',
		'documentLocation',
		'documentLocationsFilter',
	] };

	/**
	 * A function triggered after the models have been updated (patch/put)
	 * it gives the list of items saved, and the generatedFromHm of those items
	 * 
	 * @warning the errors will be ignored
	 * @param generatedFromHm a hashmap where the key is the OLD back end item used as reference, and the value is the NEWLY created model
	 * @param beItems the models in the backend
	 */
	protected postUpdate: (req: Request, generatedFromHm: {[id: string]: MultiModelTarget<T>}, beItems: MultiModelTarget<T>[]) => void | Promise<void>;

	/**
	 * update childs required fields status
	 */
	getDtd() {
		const dtd = super.getDtd() as IVerifiableItemDtdStatic<MultipleModelTrackableVariation<any, any>>;

		if (this.modelIsMultiple) {
			
			// these fields are ignored
			dtd.infoData = { type: ['any'], required: false };
			dtd.variationData = { type: ['any'], required: false };
			
			// at least 1 model is necessary
			// else its like deleting
			dtd.models.minArrN = 1;
			// no two equal present
			dtd.models.customFn = (val) => !this.areVariationsUnique(val) && "The variations of a group should be unique";

			// ensure globaldata presence
			dtd.groupData.required = true;

			// remove dtd costraints for child models
			// as these values will be inherited by the group parent
			if (dtd.models.arrayDef && dtd.models.arrayDef.objDef) {
				for (const def of dtd.models.arrayDef.objDef) {
					for (const f of this.getGlobalFields()) {
						if ((def as IVerifiableItemDtdStatic<T>)[f]) {
							(def as IVerifiableItemDtdStatic<T>)[f].required = false;
						}
					}
				}
			}

		}
		// add costraints to single
		else {
			dtd.groupData.required = true;
			dtd.variationData.required = true;
		}

		return dtd as IVerifiableItemDtd<T>;
	}

	/**
	 * in multi mode:\
	 * We get the targets of the delete request normally
	 * and then we send the delete request for the whole group by taking the targets trackGroupId
	 */
	public async deleteForUser(req: Request, filters: Filter<T>, options: DeleteOptions = {}): Promise<DeleteResult> {
		if (!this.modelIsMultiple) {
			return super.deleteForUser(req, filters, options);
		}

		// get the items and delete whole grous
		const d = await this.findItemsToDelete(req, filters, options);

		return super.deleteForUser(
			req, 
			{_trackableGroupId: {$in: d.map(c => c._trackableGroupId)}} as Filter<T>, 
			{...options, deleteMulti: true}
		);
	}

	/**
	 * Simply check if in modelIsMultiple mode
	 * and do a simple aggregation for the model
	 */
	protected async executeDbGet<A extends DBGetOptionsMethods>(
		req: Request, 
		filterOrPipeline: A extends 'aggregate' ? object[] : Filter<T>,
		opts: DBGetOptions<A>
	): Promise<DBGetReturnValue<A, T>> {


		// if it's aggregate, then something funky is going on
		// so give it back
		if (!this.modelIsMultiple || opts.method === 'aggregate') {
			return super.executeDbGet(req, filterOrPipeline, opts);
		}
		// else we need to aggregate the singular models into groups


		// TODO move this away from here
		// and into the controller
		if (opts.base?.skipFilterControl !== true) {
			const skipDeleted = opts.method === 'findOne'
				? typeof opts.base.skipDeletedControl === 'undefined' ? true : opts.base.skipDeletedControl
				: opts.base.skipDeletedControl;
			
			const updatedFilters = this.controlFilters(req, filterOrPipeline as Filter<T>, skipDeleted, opts.base);
	
			if (!updatedFilters) { 
				switch (opts.method) {
					case 'count': return 0 as DBGetReturnValue<A, T>;
					case 'find' : return [] as DBGetReturnValue<A, T>;
					case 'findOne': return null as DBGetReturnValue<A, T>;
				}
				return;
			}
			filterOrPipeline = updatedFilters as any;
		}


		const baseOpts: FindOptions<T> = opts.base ? opts.base.base as FindOptions<T> || {} : {};
		if (opts.method === 'findOne') { baseOpts.limit = 1; }
		else if (opts.method === 'count') { baseOpts.projection = {_id: 1} }

		switch (opts.method) {
			case 'count':
				const count = await this.getGroupedModels(req, 'count', filterOrPipeline || {}, baseOpts, opts.base);
				return count as DBGetReturnValue<A, T>;
			case 'findOne':
				const findOneRes = await this.getGroupedModels(req, 'findOne', filterOrPipeline || {}, baseOpts, opts.base);
				return findOneRes[0] as DBGetReturnValue<A, T>;
			case 'find':
				const findRes = await this.getGroupedModels(req, 'find', filterOrPipeline || {}, baseOpts, opts.base);
				return findRes as DBGetReturnValue<A, T>;
		}

	}

	/**
	 * Returns the aggregated models to form a group
	 */
	protected async getGroupedModels<M extends 'find' | 'findOne' | 'count'>(req: Request, mode: M, filtersToUse: Filter<T>, opts: FindOptions<T>, allOpts?: any): Promise<M extends 'count' ? number : T[]> {

		// change _deleted target
		this.remapFilterFields(filtersToUse);
		filtersToUse._deleted = {$exists: false};
		
		// create the aggregate instructions
		const aggregateFilters: object[] = [
			{$match: filtersToUse},
			{$group: {
				_id: '$_trackableGroupId',

				// get the first items so that the user can sort by those fields
				...this.getGlobalFields().reduce((car, cur) => {
					car[cur as any] = {$first: "$" + (cur as string)};
					return car;
				}, {}),


				models: {$push: '$$ROOT'},
			}},
		]

		if (opts.sort) { aggregateFilters.push({$sort: opts.sort}); }
		if (opts.skip) { aggregateFilters.push({$skip: opts.skip}); }
		if (opts.limit) { aggregateFilters.push({$limit: opts.limit}); }
		if (opts.projection) { aggregateFilters.push({$project: opts.projection}); }

		if (mode === 'count')
			aggregateFilters.push({ $count: '__count' });
		
		const res = await this.getCollToUse(req).aggregate(aggregateFilters, {collation: {locale: 'en_US'}}).toArray() as T[];
		
		if (mode === 'count')
			return (res[0] as any)?.__count || 0 as M extends 'find' ? T[] : number;

		this.remapGroupFields(res as MultipleModelTrackableVariation<any, any>[]);

		return res as M extends 'count' ? number : T[];
	}

	/**
	 * When a user queries the group model, he could query with _id field instead of _trackableGroupId as they are both the same\
	 * here we transform the _id to _trackableGroupId so that the filter will actually work
	 * @param skipId skips the _id to _trackableGroupId transofrmation and only transforms the _deleted
	 */
	protected remapFilterFields(filter: Filter<T>, skipId?: boolean) {
		// ensure the id is a string
		if (!skipId)
			MongoUtils.idToObjectId(filter, true);
		
		this.recursiveFieldsRemap(filter, skipId)
	}

	/**
	 * External function to be abble to call ti recursevily
	 */
	private recursiveFieldsRemap(filter: Filter<T>, skipId?: boolean) {
		for (const k in filter) {
			if (k === '_id' && !skipId) {
				filter._trackableGroupId = filter._id as any;
				delete filter._id;
			}
			else if (k === '_deleted') {
				filter._groupDeleted = filter._deleted;
				delete filter._deleted;
			}
			// if the query is an object, and it's a special operator (eg. $in, $or, $elemMatch, ...etc)
			// then we analyze deeply to check for internal fields
			else if (typeof filter[k] === 'object' && k[0] === '$') {
				// map array 1 by 1
				if (Array.isArray(filter[k])) {
					for (const i of filter[k])
						this.recursiveFieldsRemap(i, skipId);
				}
				// else pass complex object
				else {
					this.recursiveFieldsRemap(filter[k], skipId);
				}
			}
		}
	}

	/**
	 * Sets the global fields in the group model
	 * and creates partial infoData/variationData by taking all the equal fields
	 */
	protected remapGroupFields(res: MultipleModelTrackableVariation<any, T>[]) {
		// ressign manually the global fields as to avoid null values
		for (const r of res) {
			for (const f of this.getGlobalFields()) {
				if (r.models[0][f]) {
					(r as T)[f] = r.models[0][f];
				}
				if ((r as T)[f] === null || (r as T)[f] === undefined) {
					delete (r as T)[f];
				}
			}

			// assign the partial fields if all are equal
			const cloned = ObjectUtils.cloneDeep(r.models[0]);
			for (const f of ['infoData', 'variationData']) {
				// start with the first model available
				r[f] = cloned[f];
				
				for (const m of r.models) {
					// we need to cycle only the group field
					// as if a model has a field that the group field set does not
					// it means its a difference, so we would have to delete it anyway
					for (const k in r[f]) {
						if (!ObjectUtils.areVarsEqual(m[f][k], r[f][k])) {
							delete r[f][k];
						}
					}
				}
			}
		}
		
	}

	/**
	 * During save add the group id
	 * 
	 * During update ensure the other objects are updated/restored if necessary
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request,
		opts: DBSaveOptions<A, T>,
		toSave: A extends "insert" ? T[] : T,
		oldObjInfo: A extends "insert" ? undefined : T
	): Promise<DBSaveReturnValue<T>> {

		// normalize data
		if (this.modelIsMultiple) {
			// it should work on insert and update so check for array
			for (const group of (Array.isArray(toSave) ? toSave : [toSave]) as MultipleModelTrackableVariation<any, T>[]) {
				// reassign global fields
				group._trackableGroupId = group._trackableGroupId || new ObjectId().toString();
				for (const f of this.getGlobalFields())
					for (const m of group.models)
						if ((group as T)[f])
							m[f] = (group as T)[f];
			}
		}


		if (opts.method === 'insert') {
			
			// store all the single models to save so you can add them all toghter
			const allSingleModels: T[] = 
				this.modelIsMultiple 
					? (toSave as MultipleModelTrackableVariation<any, T>[]).reduce((car, cur) => {
							cur.models.forEach(c => c._created = cur._created);
							car.push(...cur.models)
							return car;
						}, [])
					: toSave as T[];

			for (const m of allSingleModels) {
				m._trackableGroupId = m._trackableGroupId || new ObjectId().toString();
				m.infoData = m.infoData || {};
			}
			
			const d = await super.executeDbSave(req, opts, allSingleModels as A extends "insert" ? T[] : T, oldObjInfo);


			// group returned value
			if (this.modelIsMultiple) {
				// TODO remove this mess once we implement the no-model return on POST
				const grouped = await this.findForUser(req, {_id: {$in: d.ops.map(i => i._trackableGroupId)}} as Filter<T>, {skipFilterControl: true});

				// we need to order them back as the original array
				// as its' the default mongo logic
				const ordered = {};
				for (const g of grouped) { ordered[(toSave as T[]).findIndex(c => c._trackableGroupId === g._trackableGroupId)] = g; }

				return { ...d, ops: Object.values(ordered)};
			}

			return d;

			
		}
		else {

			const docs = this.unpackUpdateTargets(toSave);
			// we need ALL the be items (_deleted too), so we use the collectiond directly
			const beItems: MultiModelTarget<T>[] = await this.getCollToUse(req).find({ _trackableGroupId: oldObjInfo._trackableGroupId } as Filter<T>).toArray();
			if (beItems.length === 0) 
				throw new Error404("TrackableGroupModel not found, _trackableGroupId: " + oldObjInfo._trackableGroupId);
	
			// ensure the id is equal
			for (const d of docs) {
				d._trackableGroupId = beItems[0]._trackableGroupId;
			}
	
			// create update item
			const updated = this.createUpdatedItems(req, docs, beItems);
			const cleared = this.removedItemsToNotUpdate(beItems, updated.items);
			const bulkWrite = this.createBulkWriteArray(cleared);
			
			// and update in db
			// TODO update mongodb types to match STLSe
			const addProds = await this.getCollToUse(req).bulkWrite(bulkWrite);
			
			if (addProds.insertedIds)
				for (const idx in addProds.insertedIds)
					(bulkWrite[idx] as any).insertOne.document._id = addProds.insertedIds[idx];

			// log the changes
			const modified = cleared.map(i => (beItems as T[]).find(b => b._id.toString() === i._id.toString())).filter(i => i);
			const old = (beItems as T[]).map(i => modified.find(b => b._id.toString() === i._id.toString())).filter(i => i);
			await LogService.logChange(req, this.modelClass, old, modified);
	
			if (this.postUpdate) {
				const res = this.postUpdate(req, updated.generatedFromHm, beItems);
				
				// dont throw
				if (res instanceof Promise)
					await to(res);
			}

			// yeet back
			return {
				...AbstractDbItemController.getEmptyDbSaveReturn(),
				...addProds,
			};
			
		}

	}

	/**
	 * When updating a model, we need to create an array of items that are active
	 * as this controller support multipleModel objects, we need to unpack them
	 * 
	 * Also this function is used in test, to ensure that we can patch/put the group
	 */
	private unpackUpdateTargets(toSave: T | T[]): MultiModelTarget<T>[] {
		return this.modelIsMultiple ? (toSave as MultipleModelTrackableVariation<any, T>).models as MultiModelTarget<T>[] : [toSave as MultiModelTarget<T>]
	}

	/**
	 * checks if the variation are all unique
	 */
	private areVariationsUnique(models: Partial<T>[]): boolean {
		// remove the duplicates
		const diffed = ObjectUtils.removeDuplicates(models.map(i => {
			const c = i.variationData ? ObjectUtils.cloneDeep(i.variationData) : {};
			TrackableVariationController.recursiveUpperCase(c);
			return c;
		}));

		// check
		return diffed.length === models.length;
	}

	/**
	 * returns a list of items that has to be update in the db
	 * @param newItem a list of items that should be in db\
	 * the param is an array so it can be used with products ;]
	 */
	protected createUpdatedItems(req: Request, newItems: MultiModelTarget<T>[], beItems: MultiModelTarget<T>[]): {items: MultiModelTarget<T>[], generatedFromHm: {[id: string]: MultiModelTarget<T>}} {
		const toR: MultiModelTarget<T>[] = [];
		const genHm: {[id: string]: MultiModelTarget<T>} = {};
		const beIdsItemsHm: { [id: string]: MultiModelTarget<T> } = ObjectUtils.arrayToHashmap(beItems, '_id');

		for (const feItemGiven of newItems) {

			// remove _id if not present in be
			if (feItemGiven._id && !beIdsItemsHm[feItemGiven._id.toString()]) {
				delete feItemGiven._id;
			}

			// start with an empty object
			let toSave: MultiModelTarget<T> = {
				// clone as to not alter the original
				...ObjectUtils.cloneDeep(feItemGiven),
				_trackableGroupId: beItems[0]._trackableGroupId,
				_created: RequestHelperService.getCreatedDeletedObject(req),
			} as MultiModelTarget<T>;
			// delete extra fields
			delete toSave._id;
			delete toSave._groupDeleted;
			delete toSave._deleted;

			// restore other variation if present
			const matchingVariation: T = beItems.find(i => TrackableVariationController.twoVariationAreTheSame(i, feItemGiven));
			if (matchingVariation) {
				toSave = {
					...ObjectUtils.cloneDeep(matchingVariation),
					...toSave,
					_created: matchingVariation._created,
					_id: matchingVariation._id,
				};
				
				// restore the item from the deleted state
				delete beIdsItemsHm[matchingVariation._id.toString()];
				delete toSave._deleted;
			}



			// optional fields

			if (feItemGiven.infoData) {
				toSave.infoData = feItemGiven.infoData;
			} else {
				delete toSave.infoData; 
			}

			if (feItemGiven.documentLocation) {
				toSave.documentLocation = feItemGiven.documentLocation;
			} else {
				delete feItemGiven.documentLocation;
			}

			// add info only if the item is different from the matching variation
			// it could be the same id when we update only groupData/infoData
			if (feItemGiven._id && (!matchingVariation || feItemGiven._id.toString() !== matchingVariation._id.toString())) {
				genHm[feItemGiven._id.toString()] = toSave;
			}


			toR.push(toSave);
		}


		// check if the basic data has changed
		let baseDataDiff = false;
		for (const f of this.getGlobalFields()) {
			if (!ObjectUtils.areVarsEqual(beItems[0][f], newItems[0][f])) {
				baseDataDiff = true;
				break;
			}
		}

		// update the remaining be items
		for (const i of Object.values(beIdsItemsHm)) {
			const cloned = ObjectUtils.cloneDeep(i);
			cloned._id = i._id;
			cloned._deleted = i._deleted || RequestHelperService.getCreatedDeletedObject(req);

			// update base data
			if (baseDataDiff)
				for (const f of this.getGlobalFields())
					if (newItems[0][f])
						cloned[f] = newItems[0][f];

			toR.push(cloned);
		}

		return {generatedFromHm: genHm, items: toR};
	}


	/**
	 * Creates a bulkwrite array to update the products
	 * @param itemsToUpdate The items to push
	 */
	private createBulkWriteArray(itemsToUpdate: T[]): AnyBulkWriteOperation<T>[] {
		const bulkWrite = [];
		for (const item of itemsToUpdate) {

			// if id is present then replace
			if (item._id) {
				bulkWrite.push({
					replaceOne: {
						filter: { _id: new ObjectId(item._id.toString()) },
						replacement: item
					}
				});
			}
			// else insert
			else {
				bulkWrite.push({ insertOne: { document: item } });
			}
		}
		return bulkWrite;
	}

	/**
	 * This function checks which one of the updated items
	 * don't have to be updated because they are identical to the beProds and removes them from the return array
	 * 
	 * @param beItems The items array in the BE
	 * @param updatedItems The items that are to be saved
	 * 
	 * // TODO test the performance with and withouth this
	 */
	private removedItemsToNotUpdate(beItems: T[], updatedItems: T[]): T[] {

		// array that contains only items that will be updated
		const clearedArray = [];

		for (const item of updatedItems) {

			let itemIsDifferent = true;
			for (const prod of beItems) {
				// if the product have same id
				// aka its the same product
				if (item._id && prod._id && prod._id.toString() === item._id.toString()) {
					// if there is difference then break
					if (ObjectUtils.areVarsEqual(prod, item)) {
						itemIsDifferent = false;
						break;
					}
				}
			}

			// if its different then add it to the array that will get the update
			if (itemIsDifferent) { clearedArray.push(item); }

		}

		return clearedArray;
	}

	/**
	 * Checks if two variationData fields are similar ignore the uppercase/lowercase difference
	 */
	public static twoVariationAreTheSame(obj1: Pick<TrackableVariation<any>, 'variationData'>, obj2: Pick<TrackableVariation<any>, 'variationData'>): boolean {
		// clone the object as to not affect the original items
		const obj1Clone = ObjectUtils.cloneDeep(obj1.variationData);
		const obj2Clone = ObjectUtils.cloneDeep(obj2.variationData);

		// ensure the string uppercase variations are indifferent
		TrackableVariationController.recursiveUpperCase(obj1Clone);
		TrackableVariationController.recursiveUpperCase(obj2Clone);

		// diff them
		return !Boolean(ObjectUtils.objectDifference(obj1Clone, obj2Clone));
	}

	/**
	 * transforms all string values to uppercase
	 */
	protected static recursiveUpperCase(obj: object) {
		for (const k in obj) {
			if (typeof obj[k] === 'string')
				obj[k] = (obj[k] as string).toUpperCase();
			else if (typeof obj[k] === 'object')
				TrackableVariationController.recursiveUpperCase(obj[k]);
		}
	}

	/**
	 * marks the deleted group too
	 */
	protected getDeletePatchOp(req: Request): UpdateFilter<T> {
		const delObj = RequestHelperService.getCreatedDeletedObject(req);
		return {
			$set: this.modelIsMultiple
				? { _groupDeleted: delObj, }
				: { _deleted: delObj, },
		} as UpdateFilter<T>
	}

	/**
	 * marks the deleted group too
	 */
	protected getRestoreDeletedPatchOp(): UpdateFilter<T> {
		return {
			$unset: this.modelIsMultiple
				? { _groupDeleted: 1, }
				: { _deleted: 1, },
		} as any as UpdateFilter<T>
	}

}

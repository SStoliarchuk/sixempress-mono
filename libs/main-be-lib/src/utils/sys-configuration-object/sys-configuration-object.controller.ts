import { Request } from 'express';
import { RequestHelperService } from '../../services/request-helper.service';
import { LibModelClass } from '../enums';
import { Filter, CountDocumentsOptions, FindOptions, ReplaceOptions, UpdateResult, Document, InsertManyResult, UpdateFilter, UpdateOptions, DeleteResult } from 'mongodb';
import { SysConfigurationObject } from './sys-configuration-object.dtd';

export class SysConfigurationObjectController<T extends SysConfigurationObject> {

	constructor(public type: any) { }

	private getCollToUse(reqOrDb: Request) {
		return RequestHelperService.getClientDbBySlug(reqOrDb).collection<any>(LibModelClass.Configuration);
	}

	public addTypeToObject(obj: any) {
		(obj as SysConfigurationObject).__sysConfigObjectType = this.type;
	}

	public countDocuments(reqOrDb: Request, filter: Filter<T>, options?: CountDocumentsOptions): Promise<number> {
		this.addTypeToObject(filter);
		return this.getCollToUse(reqOrDb).countDocuments(filter, options);
	}
	
	// public aggregate(reqOrDb: Request, pipeline: object[], options?: CollectionAggregationOptions): AggregationCursor<any> {
	// 	return this.getCollToUse(reqOrDb).aggregate(pipeline, options);
	// }

	public async upsert(req: Request, doc: T): Promise<void> {
		const filter = {};
		this.addTypeToObject(filter);

		await this.replaceOne(req, filter, doc, {upsert: true});
	}

	public findOne(reqOrDb: Request, filter: Filter<T>, options?: FindOptions<T>): Promise<T> {
		this.addTypeToObject(filter);
		return this.getCollToUse(reqOrDb).findOne(filter, options as FindOptions<any>);
	}

	public replaceOne(reqOrDb: Request, filter: Filter<T>, doc: any, options?: ReplaceOptions): Promise<UpdateResult<T> | Document> {
		this.addTypeToObject(filter);
		this.addTypeToObject(doc);
		return this.getCollToUse(reqOrDb).replaceOne(filter, doc, options);
	}

	public insertMany(reqOrDb: Request, items: T[]): Promise<InsertManyResult<any>> {
		for (const i of items) { this.addTypeToObject(i); }
		return this.getCollToUse(reqOrDb).insertMany(items);
	}

	public updateMany(reqOrDb: Request, filter: Filter<T>, action: UpdateFilter<T> | Partial<T>, options?: UpdateOptions): Promise<UpdateResult> {
		this.addTypeToObject(filter);
		return this.getCollToUse(reqOrDb).updateMany(filter, action, options);
	}
	
	public updateOne(reqOrDb: Request, filter: Filter<T>, action: UpdateFilter<T> | Partial<T>, options?: UpdateOptions): Promise<UpdateResult> {
		this.addTypeToObject(filter);
		return this.getCollToUse(reqOrDb).updateOne(filter, action, options);
	}

	public deleteOne(reqOrDb: Request, filter: Filter<T>): Promise<DeleteResult> {
		this.addTypeToObject(filter);
		return this.getCollToUse(reqOrDb).deleteOne(filter);
	}

	public deleteMany(reqOrDb: Request, filter: Filter<T>): Promise<DeleteResult> {
		this.addTypeToObject(filter);
		return this.getCollToUse(reqOrDb).deleteMany(filter);
	}



}

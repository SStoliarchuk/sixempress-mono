import { Db } from 'mongodb';
import { Request, Application } from 'express';
import { LibModelClass } from '../utils/enums';
import { Server as HttpsServer } from 'https';
import { Server as HttpServer } from 'http';
import { RequestHelperService } from './request-helper.service';
import { AugmentedRequest, db } from '@stlse/backend-connector';

/**
 * This class is ContextService
 * It stores some custom stuff (and some other stuff)
 */
export class CS {

	static mongoDbConnectionUrl = 'mongodb://127.0.0.1:27017';
	static db: {db: (req: AugmentedRequest, meta?: object) => Db} = {db: db as any};
	
	static express: Application;
	static extServer: HttpsServer | HttpServer;
	
	static environment: 'local' | 'test' | 'production' = 'production';
	static EXTPORT: number = 80 ;
	


	/**
	 * Adds an exception to the system db
	 */
	public static async addException(reqOrSlug: Request | AugmentedRequest, ex: any, _createdTimestamp?: number): Promise<string> {
		console.error(ex);
		const toAdd: {ex: any, stack: string, _systemSlug: string, _createdTimestamp: number} = {
			ex: ex.message,
			stack: ex.stack,
			_systemSlug: '',
			_createdTimestamp: _createdTimestamp || Math.floor(new Date().getTime() / 1000),
		};
		const res = await CS.db.db(reqOrSlug).collection(LibModelClass.Exception).insertOne(toAdd);
		return res.insertedId.toString();
	}

}

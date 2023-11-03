import { Request } from 'express';
import { IBaseModel } from "../object-format-controller/IBaseModel.dtd";
import moment from "moment";
import { FetchableField } from "../object-format-controller/fetchable-field";
import { AuthHelperService } from "../services/auth-helper.service";
import { SmallUtils } from '../utils/small-utils';
import to from 'await-to-js';
import { ObjectUtils } from '../utils/object-utils';
import { Log, LogType } from '../gateway-paths/globals/logs/Log.dtd';
import { LibModelClass } from '../utils/enums';
import { RequestHelperService } from './request-helper.service';

/**
 * We need to use a service as using directly LogController will result in circular dependency 
 */
export class LogService {

	private static collName = LibModelClass.Log;

	/**
	 * it saves the old values of the item updated
	 */
	public static async logChange(req: Request, modelClass: string, olds: IBaseModel[], news: IBaseModel[]): Promise<void> {
		const objs: Omit<Log, '_id'>[] = [];

		for (let i = 0; i < news.length; i++) {
			const oldItem = olds[i];
			const newItem = news[i];

			const logObj: Log = {
				documentLocationsFilter: [],
				author: new FetchableField(AuthHelperService.getUserIdFromToken(req), LibModelClass.User),
				timestamp: moment().unix(),
				action: {
					mode: LogType.MODIFICATION,
					target: new FetchableField( oldItem._id.toString(), modelClass),
					changes: [],
				}
			};
	
			// add diff
			// old: { a: [{c: 1}, {b: 1, d: 1}] }
			// new { a: [{c: 1}] }
			// produces
			// [{field: "a.1.b": oldValue: 1}], [{field: "a.1.d": oldValue: 1}]
			// and NOT
			// [{field: "a.1": oldValue: {b: 1, d: 1}}]
			//
			// we need to reassing _id as the newItem could have a string
			const diff = ObjectUtils.objectDifference({...newItem, _id: oldItem._id}, oldItem, {returnFullArray: false});
			const hm = ObjectUtils.objToPathAndValueHM(diff, true);
			for (const k in hm) 
				logObj.action.changes.push({field: k, oldValue: hm[k]});
	
			if (logObj.action.changes.length)
				objs.push(logObj);
		}

		if (objs.length)
			await RequestHelperService.getClientDbBySlug(req).collection<Log>(LogService.collName).insertMany(objs);
	}
	
}
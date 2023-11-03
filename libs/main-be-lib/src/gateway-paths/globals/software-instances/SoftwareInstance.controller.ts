export {};
// import { MongoUtils } from 'libs/main-be-lib/src/utils/mongo-utils';
// import { Request } from 'express';
// import moment from 'moment';
// import { ObjectId, Filter } from 'mongodb';
// import { SysConfigurationObjectController } from '../../../utils/sys-configuration-object/sys-configuration-object.controller';
// import { SoftwareInstance, SoftwareInstance__sysConfigObjectType } from './SoftwareInstance.dtd';
// import { Error401 } from 'libs/main-be-lib/src/utils/errors/errors';

// class _SoftwareInstanceService {

// 	private coll = new SysConfigurationObjectController<SoftwareInstance>(SoftwareInstance__sysConfigObjectType);

// 	/**
// 	 * Builds all the fields to fetch. updates the location id, filter etc..
// 	 * @param identifier the uniquely identifier of the software
// 	 * @param idType what identifier type is
// 	 * @param ensureActive if true it ensures that the business is not deleted/expired
// 	 * @param byPermissions given a user it filters the infromation of the software. based on what the user can see (requires attributes)
// 	 */
// 	 public async getCompleteSoftwareInfo(
// 		req: Request,
// 		identifier: string | ObjectId, 
// 		idType: 'slug' | 'loginSlug' | 'id', 
// 		ensureActive: boolean, 
// 		byPermissions?: {allowedLocations: string[], attributes: (string | number)[]}
// 	): Promise<SoftwareInstance | void> {
		
// 		const filters: Filter<SoftwareInstance> = ensureActive ? {
// 			$or: [{expires: false}, {expires: {$gt: moment().unix()}}],
// 			_deleted: {$exists: false},
// 		} : {};

// 		// if (idType === 'loginSlug')
// 		// 	filters.loginSlug = identifier as string;
// 		// else if (idType === 'slug')
// 		// 	filters.slug = identifier as string;
// 		// else
// 		// 	filters._id = MongoUtils.isObjectId(identifier) ? identifier : new ObjectId(identifier);

// 		const item: SoftwareInstance = await this.coll.findOne(req, filters);
// 		if (!item) return;

// 		// add server
// 		// item.server.fetched = await new ServerNodeController().getRawCollection().findOne({_id: new ObjectId(item.server.id)}) as ServerNode;
// 		// delete item.server.fetched.publicCert;

// 		if (!item.slug)
// 			item.slug = item._id.toString();

// 		// once the ids have been assigned, filter the location by user
// 		if (byPermissions)
// 			this.filterSoftwareInstanceByUser(item, byPermissions);

// 		return item;
// 	}


// 	/**
// 	 * Removes things that the user should not see
// 	 * @param byPermissions the user to filter the business by
// 	 */
// 	public filterSoftwareInstanceByUser(item: (SoftwareInstance & {__tempAllLocations?: SoftwareInstance['locations']}), byPermissions: {allowedLocations: string[], attributes: (string | number)[]}) {
// 		// TODO remove
// 		item.__tempAllLocations = [...item.locations];

// 		if (!byPermissions.allowedLocations.includes('*'))
// 			item.locations = item.locations.filter(l => byPermissions.allowedLocations.includes(l._id));
		
// 		// just in case a misconfiguration hides all the business we throw
// 		if (!item.locations.length)
// 			throw new Error401('User is not allowed to view any position associated');
// 	}

// }

// export const SoftwareInstanceService = new _SoftwareInstanceService();

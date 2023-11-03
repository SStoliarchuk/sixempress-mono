import { Request } from 'express';
import { IBaseModel, IVerifiableItemDtdStatic, RequestHelperService, SyncableModel } from "@sixempress/main-be-lib";

export { SyncableModel };

/**
 * we add a namespace to the meta keys as to know which are ours
 * because we will need to do some operations with them
 * 
 * we keep it here to use for EVERY sync where we use meta data
 * 
 * we use slug to prefix as IT COULD BE POSSIBLE that multiple systems connect to the same remote server
 */
export function getMetaDataPrefix(reqOrSlug: Request | string) { 
	const slug = typeof reqOrSlug === 'string' ? reqOrSlug : RequestHelperService.getSlugByRequest(reqOrSlug);
	return '_semp_' + slug + '_';
}

export function getSyncableModelDtd(): IVerifiableItemDtdStatic<SyncableModel> {
	return {
		externalSync: {type: [Object], required: false, objDef: [{
			disabled: {type: [Array], required: false, arrayDef: {type: [Object], objDef: [{
				id: {type: [String], required: true},
			}]}}
		}]}
	}
}


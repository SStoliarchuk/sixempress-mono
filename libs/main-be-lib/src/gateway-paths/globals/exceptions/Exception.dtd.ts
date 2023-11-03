import { IBaseModel } from '../../../object-format-controller/IBaseModel.dtd';
import { ClientsSlugs } from '../../../utils/enums';

export interface Exception extends IBaseModel {
	ex: string;
	stack: string;
	_systemSlug: ClientsSlugs;
	_createdTimestamp: number;
}

import { FetchableField, IBaseModel } from '@sixempress/main-be-lib';
import { ModelClass } from '../../enums';
import { UserRole } from '../user-roles/UserRole.dtd';

export interface User extends IBaseModel {
	_tutorialsDone?: (string | number)[];
	name: string;
	role: FetchableField<ModelClass.UserRole, UserRole>;
	username: string;
	password: string;
	/**
	 * The locations that the user can access
	 * an array of string IDS
	 * 
	 * it can also contain a wildcard ("*") to signal that the user can view every location
	 */
	allowedLocations: string[];
}

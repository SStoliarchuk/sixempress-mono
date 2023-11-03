import { FetchableField, IBaseModel } from "@sixempress/main-fe-lib";
import { UserRole } from "../user-roles/UserRole";

export interface User extends IBaseModel {

	_tutorialsDone?: (string | number)[];
	role: FetchableField<UserRole>;
	name: string;
	username: string;
	allowedLocations: string[];

}

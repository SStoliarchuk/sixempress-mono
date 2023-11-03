import { IBaseModel } from "@sixempress/main-be-lib";

export interface UserRole extends IBaseModel {
	name: string;
	attributes: (string | number)[];
}

import { IBaseModel } from "@sixempress/main-fe-lib";

export interface UserRole extends IBaseModel {
	name: string;
	attributes: (string | number)[];
}
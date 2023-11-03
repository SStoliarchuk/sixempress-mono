import { IBaseModel } from "@sixempress/main-fe-lib";

export interface Exception extends IBaseModel {
	ex: string;
	stack: string;
	_systemSlug: string;
	_createdTimestamp: number;
}
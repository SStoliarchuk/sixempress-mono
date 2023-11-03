import { IBaseModel } from "@sixempress/main-be-lib";

export interface ErrorReport extends IBaseModel {

	userDescription?: string;
	localStorage: {[key: string]: string};
	sessionStorage: {[key: string]: string};
	lastUrl: string;
	lastRequest?: any;
	exception: {
		message: string,
		stack: string
	};
	
	_date: number;
	_systemSlug: string;
}

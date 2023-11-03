import { IBaseModel } from '@sixempress/main-fe-lib';

export interface ErrorReport extends IBaseModel {
	
	userDescription: string;
	localStorage: {[key: string]: any};
	sessionStorage: {[key: string]: any};
	lastUrl: string;
	exception: {
		message: string,
		stack: string
	};
	_date: number;
	_systemSlug: string;

}

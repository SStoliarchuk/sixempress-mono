import { IBaseModel } from '@sixempress/main-fe-lib';

export interface Supplier extends IBaseModel {
	_progCode: number;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	province?: string;
	cap?: string;
	piva?: string;
}

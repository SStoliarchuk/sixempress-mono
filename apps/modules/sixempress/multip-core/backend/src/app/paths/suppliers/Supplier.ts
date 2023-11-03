import { IBaseModel } from '@sixempress/main-be-lib';

export interface Supplier extends IBaseModel {

	_id: string;
	_progCode: number;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	province?: string;
	cap?: string;
	piva?: string;

}

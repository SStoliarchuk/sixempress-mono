import { IBaseModel } from '@sixempress/main-fe-lib';

export interface CustomerInformation {
	first_name?: string,
	last_name?: string,
	company?: string,
	address_1?: string,
	address_2?: string,
	city?: string,
	state?: string,
	postcode?: string,
	country?: string,
	email?: string,
	phone?: string,
}

export const FieldsNameInfo: { [A in keyof (CustomerInformation)]: string } = {
	first_name: 'Nome',
	last_name: 'Cognome',
	address_1: 'Indirizzo',
	address_2: 'Indirizzo 2',
	city: 'Citta\'',
	company: 'Azienda',
	state: 'Stato',
	postcode: 'CAP',
	country: 'Paese',
	email: 'E-Mail',
	phone: 'N. Tel.:',
}


export interface Customer extends IBaseModel {
	name: string;
	lastName: string;
	phone?: string;
	email?: string;
	address?: string;
	fiscalCode?: string;

	notes?: string;

	billing?: CustomerInformation,
	shipping?: CustomerInformation,
}


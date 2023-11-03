import { SyncableModel } from '@sixempress/main-be-lib';

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

export interface Customer extends SyncableModel {
	name: string;
	lastName?: string;
	phone?: string;
	email?: string;
	address?: string;
  fiscalCode?: string;

	notes?: string;

  billing?: CustomerInformation,
  shipping?: CustomerInformation,
}

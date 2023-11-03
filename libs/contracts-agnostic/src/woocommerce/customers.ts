import { WooBaseItem, DateString } from './base';

export interface WooCustomer extends WooCustomerReadOnly, WooBaseItem {
	/**
	 * The email address for the customer.MANDATORY
	 */
	email: string;
	/**
	 * Customer first name.
	 */
	first_name: string;
	/**
	 * Customer last name.
	 */
	last_name: string;
	/**
	 * Customer login name.
	 */
	username: string;
	/**
	 * Customer password.WRITE-ONLY
	 */
	password: string;
	/**
	 * List of billing address data. See Customer - Billing properties
	 */
	billing: {
		/**
		 * First name.
		 */
		first_name: string,
		/**
		 * Last name.
		 */
		last_name: string,
		/**
		 * Company name.
		 */
		company: string,
		/**
		 * Address line 1
		 */
		address_1: string,
		/**
		 * Address line 2
		 */
		address_2: string,
		/**
		 * City name.
		 */
		city: string,
		/**
		 * ISO code or name of the state, province or district.
		 */
		state: string,
		/**
		 * Postal code.
		 */
		postcode: string,
		/**
		 * ISO code of the country.
		 */
		country: string,
		/**
		 * Email address.
		 */
		email: string,
		/**
		 * Phone number.
		 */
		phone: string,
	};
	/**
	 * List of shipping address data. See Customer - Shipping properties
	 */
	shipping: {
		/**
		 * First name.
		 */
		first_name: string,
		/**
		 * Last name.
		 */
		last_name: string,
		/**
		 * Company name.
		 */
		company: string,
		/**
		 * Address line 1
		 */
		address_1: string,
		/**
		 * Address line 2
		 */
		address_2: string,
		/**
		 * City name.
		 */
		city: string,
		/**
		 * ISO code or name of the state, province or district.
		 */
		state: string,
		/**
		 * Postal code.
		 */
		postcode: string,
		/**
		 * ISO code of the country.
		 */
		country: string,
	};

	/**
	 * Meta data. See Customer - Meta data properties
	 */
	meta_data: Array<{
		/**
		 * Meta ID
		 * @readonly
		 */
		id: number,
		/**
		 * Meta key.
		 */
		key: string,
		/**
		 * Meta value.
		 */
		value: string,
	}>;

}

export interface WooCustomerReadOnly {
	/**
		 * Unique identifier for the resource.
	 * @readonly
	*/
	id?: number;
	/**
	 * The date the customer was created, in the site's timezone.
	* @readonly
	*/
	date_created: DateString;
	/**
	 * The date the customer was created, as GMT.
	* @readonly
	*/
	date_created_gmt: DateString;
	/**
	 * The date the customer was last modified, in the site's timezone.
	* @readonly
	*/
	date_modified: DateString;
	/**
 * The date the customer was last modified, as GMT.
	* @readonly
	*/
	date_modified_gmt: DateString;
	/**
		 * Customer role.
	 * @readonly
	 */
	role: string;
	/**
		 * Is the customer a paying customer?
	 * @readonly
	 */
	is_paying_customer: boolean;
	/**
		* Avatar URL.
		* @readonly
		*/
	avatar_url: string;
}

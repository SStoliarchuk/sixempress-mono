import { WooBaseItem, DateString } from './base';

export interface WooProductCategory extends WooProductCategoryReadOnly {
	/** 
	 * Category name 
	 */
	name: string;
	/** 
	 * An alphanumeric identifier for the resource unique to its type. 
	 */
	slug?: string;
	/** 
	 * The ID for the parent of the resource. 
	 */
	parent?: number;
	/** 
	 * HTML description of the resource. 
	 */
	description?: string;
	/** 
	 * Category archive display type. Options: default, products, subcategories and both. Default is default. 
	 */
	display?: string;
	/** 
	 * Image data. See Product category - Image properties 
	 */
	image?: {
		/**
		 * Image ID.
		 */
		id: number;
		/**
		 * The date the image was created, in the site's timezone.
		 * @readonly
		 */
		date_created: DateString;
		/**
		 * The date the image was created, as GMT
		 * @readonly
		 */
		date_created_gmt: DateString;
		/**
		 * The date the image was last modified, in the site's timezone.
		 * @readonly
		 */
		date_modified: DateString;
		/**
		 * The date the image was last modified, as GMT.
		 * @readonly
		 */
		date_modified_gmt: DateString;
		/**
		 * Image URL.
		 */
		src: string;
		/**
		 * Image name.
		 */
		name: string;
		/**
		 * Image alternative text.
		 */
		alt: string;
	};
	/** 
	 * Menu order, used to custom sort the resource. 
	 */
	menu_order?: number;
}

export interface WooProductCategoryReadOnly {
	/**
	 * Unique identifier for the resource 
	 * @readonly
	 */
	id?: number;
	/**
	 * Number of published products for the resource 
	 * @readonly
	 */
	count?: number;
}

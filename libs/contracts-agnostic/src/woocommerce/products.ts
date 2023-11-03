import { WooBaseItem, DateString, WooMetaData } from './base';

/**
 * WooProduct but instead of the property variation containig the IDS[]
 * this contains the variation models, so it's similar to the local ProductGroup
 */
export type WooProductSimple = Omit<WooProduct, 'variations'> & {
	/* optional variations */
	variations?: WooProduct[];
	/** automatically creates tags */
	create_tags?: string[];
	/** whole parent of the variation */
	parent?: WooProductSimple;
	/** used to set category ids */
	category_ids?: number[];
	/** the stock_quantity currently in db, used in case the product is restored from deleted and needs the stock */
	current_stock?: Pick<WooProductSimple, 'stock_quantity' | 'stock_status'>,
};

export interface WooProduct extends WooProductReadOnly, WooProductAdvanced, WooBaseItem {
	/**
	 * Name of the product
	 */
	name?: string,
	/**
	 * Product slug found at the end of the permalink
	 */
	slug?: string,
	/**
	 * Product type. Options: simple, grouped, external and variable. Default is simple.
	 * this field is not present during the get
	 */
	type?: 'simple' | 'grouped' | 'external' | 'variable' | 'variation',
	/**
	 * Product status (post status). Options: draft, pending, private and publish. Default is publish.
	 */
	status?: 'draft' | 'pending' | 'private' | 'publish' | 'trash',
	/**
	 * Featured product. Default is false.
	 */
	featured?: boolean,
	/**
	 * Product description.
	 */
	description?: string,
	/**
	 * Product short description.
	 */
	short_description?: string,
	/**
	 * Unique identifier.
	 */
	sku?: string,
	/**
	 * Product regular price.
	 */
	regular_price?: string,
	/**
	 * Stock management at product level. Default is false.
	 */
	manage_stock?: boolean | 'parent',
	/**
	 * Stock quantity.
	 */
	stock_quantity?: number,
	/**
	 * Controls the stock status of the product. Options: instock, outofstock, onbackorder. Default is instock.
	 */
	stock_status?: 'instock' | 'outofstock' | 'onbackorder',
	/**
	 * If managing stock, this controls if backorders are allowed. Options: no, notify and yes. Default is no.
	 */
	backorders?: string,
	/**
	 * Allow one item to be bought in a single order. Default is false.
	 */
	sold_individually?: boolean,
	/**
	 * List of categories. See Product - Categories properties
	 */
	categories?: Array<{
		/**
		 * Category ID
		 */
		id: number,
		/**
		 * Category name
		 * @readonly
		 */
		name?: string,
		/**
		 * Category slug
		 * @readonly
		 */
		slug?: string,
	}>,
	/**
	 * List of tags. See Product - Tags properties
	 */
	tags?: Array<{
		/**
		 * Tag ID.
		 */
		id: number,
		/**
		 * Tag name.
		 * @readonly
		 */
		name?: string,
		/**
		 * Tag slug.
		 * @readonly
		 */
		slug?: string,
	}>,
	/**
	 * List of images. See Product - Images properties
	 */
	images?: Array<{
		/**
		 * Image ID.
		 */
		id?: number,
		/**
		 * Image URL.
		 */
		src?: string,
		/**
		 * Image name.
		 */
		name?: string,
		/**
		 * Image alternative text.
		 */
		alt?: string,
		/**
		 * The date the image was created, in the site's timezone
		 * @readonly
		 */
		date_created?: DateString,
		/**
		 * The date the image was created, as GMT
		 * @readonly
		 */
		date_created_gmt?: DateString,
		/**
		 * The date the image was last modified, in the site's timezone
		 * @readonly
		 */
		date_modified?: DateString,
		/**
		 * The date the image was last modified, as GMT
		 * @readonly
		 */
		date_modified_gmt?: DateString,
	}>,
	/**
	 * List of attributes. See Product - Attributes properties
	 */
	attributes?: Array<{
		/**
		 * Attribute ID.
		 */
		id?: number,
		/**
		 * Attribute name.
		 */
		name?: string,
		/**
		 * Attribute position.
		 */
		position?: number,
		/**
		 * Define if the attribute is visible on the "Additional information" tab in the product's page. Default is false.
		 */
		visible?: boolean,
		/**
		 * Define if the attribute can be used as variation. Default is false.
		 */
		variation?: boolean,
		/**
		 * List of available term names of the attribute.
		 */
		options?: Array<string>,
		/**
		 * The chosen option used for a variation
		 */
		option?: string,
	}>,
	/**
	 * Defaults variation attributes. See Product - Default attributes properties
	 */
	default_attributes?: Array<{
		/**
		 * Attribute ID.
		 */
		id?: number,
		/**
		 * Attribute name.
		 */
		name?: string,
		/**
		 * Selected attribute term name.
		 */
		option?: string,
	}>,
}

export interface WooProductAdvanced {
	/**
	 * List of grouped products ID.
	 */
	grouped_products?: Array<number>,
	/**
	 * Menu order, used to custom sort products.
	 */
	menu_order?: number,
	/**
	 * Meta data. See Product - Meta data properties
	 */
	meta_data?: Array<WooMetaData>,
	/**
	 * Product weight.
	 */
	weight?: string,
	/**
	 * Product dimensions. See Product - Dimensions properties
	 */
	dimensions?: {
		/**
		 * Product length.
		 */
		length?: string,
		/**
		 * Product width. 
		 */
		width?: string,
		/**
		 * Product height.
		 */
		height?: string,
	},
	/**
	 * Shipping class slug.
	 */
	shipping_class?: string,
	/**
	 * Allow reviews. Default is true.
	 */
	reviews_allowed?: boolean,
	/**
	 * List of up-sell products IDs.
	 */
	upsell_ids?: Array<number>,
	/**
	 * List of cross-sell products IDs.
	 */
	cross_sell_ids?: Array<number>,
	/**
	 * Product parent ID.
	 */
	parent_id?: number,
	/**
	 * Optional note to send the customer after purchase.
	 */
	purchase_note?: string,
	/**
	 * Catalog visibility. Options: visible, catalog, search and hidden. Default is visible.
	 */
	catalog_visibility?: string,
	/**
	 * Product sale price.
	 */
	sale_price?: string,
	/**
	 * Product external URL. Only for external products.
	 */
	external_url?: string,
	/**
	 * Product external button text. Only for external products.
	 */
	button_text?: string,
	/**
	 * Tax status. Options: taxable, shipping and none. Default is taxable.
	 */
	tax_status?: string,
	/**
	 * Tax class.
	 */
	tax_class?: string,
	/**
	 * Start date of sale price, in the site's timezone.
	 */
	date_on_sale_from?: DateString,
	/**
	 * Start date of sale price, as GMT.
	 */
	date_on_sale_from_gmt?: DateString,
	/**
	 * End date of sale price, in the site's timezone.
	 */
	date_on_sale_to?: DateString,
	/**
	 * End date of sale price, as GMT.
	 */
	date_on_sale_to_gmt?: DateString,
	/**
	 * If the product is virtual. Default is false.
	 */
	virtual?: boolean,
	/**
	 * If the product is downloadable. Default is false.
	 */
	downloadable?: boolean,
	/**
	 * List of downloadable files
	 */
	downloads?: Array<{
		/**
		 * File ID
		 */
		id?: string,
		/**
		 * File name
		 */
		name?: string,
		/**
		 * File URL
		 */
		file?: string,
	}>,
	/**
	 * Number of times downloadable files can be downloaded after purchase. Default is -1.
	 */
	download_limit?: number,
	/**
	 * Number of days until access to downloadable files expires. Default is -1.
	 */
	download_expiry?: number,
}

export interface WooProductReadOnly {
	/**
	 * @readonly
	 */
	id?: number,
	/**
	 * unique url that allows you to visit the products page directly
	 * @readonly
	 */
	permalink?: string,
		/**
	 * The date the product was created, in the site's timezone.
	 * @readonly
	 */
	date_created?: DateString,
	/**
	 * The date the product was created, as GMT.
	 * @readonly
	 */
	date_created_gmt?: DateString,
	/**
	 * The date the product was last modified, in the site's timezone.
	 * @readonly
	 */
	date_modified?: DateString,
	/**
	 * The date the product was last modified, as GMT.
	 * @readonly
	 */
	date_modified_gmt?: DateString,
	/**
	 * Current product price.
	 * @readonly
	 */
	price?: string,
	/**
	 * Price formatted in HTML.
	 * @readonly
	 */
	price_html?: string,
	/**
	 * Shows if the product is on sale.
	 * @readonly
	 */
	on_sale?: boolean,
	/**
	 * Shows if the product can be bought.
	 * @readonly
	 */
	purchasable?: boolean,
	/**
	 * Amount of sales.
	 * @readonly
	 */
	total_sales?: number,
	/**
	 * Shows if backorders are allowed.
	 * @readonly
	 */
	backorders_allowed?: boolean,
	/**
	 * Shows if the product is on backordered.
	 * @readonly
	 */
	backordered?: boolean,
	/**
	 * Shows if the product need to be shipped.
	 * @readonly
	 */
	shipping_required?: boolean,
	/**
	 * Shows whether or not the product shipping is taxable.
	 * @readonly
	 */
	shipping_taxable?: boolean,
	/**
	 * Shipping class ID.
	 * @readonly
	 */
	shipping_class_id?: number,
	/**
	 * Reviews average rating.
	 * @readonly
	 */
	average_rating?: string,
	/**
	 * Amount of reviews that the product have.
	 * @readonly
	 */
	rating_count?: number,
	/**
	 * List of related products IDs.
	 * @readonly
	 */
	related_ids?: Array<number>,
	/**
	 * List of variations IDs.
	 * @readonly
	 */
	variations?: Array<number>,
}
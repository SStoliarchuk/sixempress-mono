/**
 * These are remote paths in the sites of the clients
 */
export enum WPRemotePaths {
	/**
	 * POST: used to syncronize elements with online site, you pass here the post_type and ids, and it returns thewhole objects\
	 * GET: get the list of the ids syncable
	 */
	aggregate_sync_ids = '/wp-json/sxmpes/aggregate_sync_ids',
	/**
	 * Allows you to create easily and faster woo commerce products
	 */
	create_easy_products = '/wp-json/sxmpes/woo/products',
	/**
	 * Control the raw files in the site
	 */
	raw_files = '/wp-json/sxmpes/rawfiles',
	/**
	 * Allows to modify the stock of the products with "-n" "+n" updates
	 */
	product_amount = '/wp-json/sxmpes/woo/product_amount',
	/**
	 * controls ONLY the product categories
	 */
	product_categories = '/wp-json/sxmpes/woo/product_categories',
	/**
	 * Used to create/update orders
	 * (for now it's used to update only the status)
	 */
	orders = '/wp-json/sxmpes/woo/orders',

	/**
	 * default path of woocmmerce producs
	 */
	woo_products = '/wp-json/wc/v3/products',

	/**
	 * Allows you to check the status of the connection
	 */
	ping = '/wp-json/sxmpes/ping',
}

/**
 * These are the paths present in our node server, used by remote clients to comunicate with us
 */
export enum WPLocalPaths {
	/**
	 * Used by remote clients to notify that there have been a crud update in the their system
	 */
	crud_updates = 'woo/crudupdate/',
}

export enum WooTypes {
	product = 'product',
	order = 'order',
	customer = 'customer',
	prod_category = 'product_cat',
	product_amount = 'product_amount',
}
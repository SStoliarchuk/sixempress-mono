<?php

use SIXEMPRESS\ExternalSync\Services\AuthService;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Aggregator\AdditionalEndpoints;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Ping\PingController;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Customers\WooCustomers;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Categories\WooProductCategories;
use SIXEMPRESS\ExternalSync\Rest\Controllers\RawFiles\RawFiles;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Orders\WooOrders;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProductAmounts;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProducts;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Redirects\WPRedirects;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_HookTags;

defined( 'ABSPATH' ) || exit;

// woocommerce not loaded
if ( !in_array( 'woocommerce/woocommerce.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ) ) ) {
	// TODO add a banner
}
// is loaded
else {
	sxmpes_startup_rest();
}

// wrap for encapsulation
function sxmpes_startup_rest() {

	// // check version
	// if ( is_admin() ) {
	// 	if( !function_exists('get_plugin_data') ){
	// 		require_once( ABSPATH . 'wp-admin/includes/plugin.php' );
	// 	}
	// 	var_dump(get_plugin_data(PLUGIN_DIR.'/woocommerce/woocommerce.php'));
	// }

	/**
	 * if the request contains the x-api-key associated with the system\
	 * we allow all REST requests directed toward the RAW WooCommerce API (not passing trhough one of our controllers)
	 */
	add_filter('woocommerce_rest_check_permissions', function ($permission) {
		if (AuthService::is_external_req_authorized(false)) {
			return true;
		}

		return $permission;
	}, 100, 1);

	/**
	 * "Remove" the bulk limit for api requests
	 */
	add_filter('woocommerce_rest_batch_items_limit', function($limit, $type) {
		if (AuthService::is_external_req_authorized(false)) {
			return 1000000;
		}

		return $limit;
	}, 100, 2);


	/**
	 * register immediately all the crud actions
	 * as we need to track if its admin or user regardless
	 * as the user can complete a sale and diminish the product amount
	 * create order etc..
	 */
	add_action('init', function() {
		$controllers = sxmpes_get_rest_controller();

		foreach ($controllers as $c) {
			if (method_exists($c, 'register_crud_action_triggers')) {
				$c->register_crud_action_triggers();
			}
		}
	});

	/**
	 * create rest paths for the controllers
	 */
	add_action('rest_api_init', function() {
		$controllers = sxmpes_get_rest_controller();

		foreach ($controllers as $c) {
			if (method_exists($c, 'register_rest_endpoints')) {
				$c->register_rest_endpoints();
			}
		}
	});
	
}

$sxmpes_stored_classes = null;

// returns the rest controllers used for sync
function sxmpes_get_rest_controller() {
	global $sxmpes_stored_classes;
	
	// set cache if not present
	if (!$sxmpes_stored_classes) {

		// array of controllers that needs to be syncronized with the system
		$controller_classes = [
			WooProductCategories::class,
			WooProducts::class,
			WooProductAmounts::class,
			WooOrders::class,
			WooCustomers::class,
			PingController::class,
			
			// WooProductVariations is useless as every change to a variation 
			// triggers a change to the parent
			// WooProductVariations::class,
			
			WPRedirects::class,
			AdditionalEndpoints::class,
			
			RawFiles::class,
		];
	
		// allow the classes to be extended by external resources
		$controller_classes = apply_filters(Enum_HookTags::get_sync_classes_array, $controller_classes);
	
		// create instances of the classes that will be used on init
		$sxmpes_stored_classes = array_map(function ($c) { return new $c(); }, $controller_classes);
	}
	
	return $sxmpes_stored_classes;
}

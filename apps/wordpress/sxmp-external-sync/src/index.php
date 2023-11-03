<?php

use SIXEMPRESS\ExternalSync\Services\AuthService;
use SIXEMPRESS\ExternalSync\Services\RequestService;

defined('ABSPATH') || exit;

/**
 * We store the basic config in a function as to not collide with global scope
 */
function sxmpes_startup() {

	// define environemnt
	$wp_env = wp_get_environment_type();
	if (in_array($wp_env, ['staging', 'tests', 'test']))
		$wp_env = 'test';
	define('ENV', $wp_env); // local, test, production

	// time limit to set for our requests
	define('SE_EXECUTION_TIME_LIMIT', 10 * 60);
	
	// we need to change the plugins root directory to ./assets in local
	if (ENV === 'production') {
		define('PLUGIN_DIR', WP_PLUGIN_DIR);
	}
	else {
		// hot reload
		// add_action("admin_head", function() { echo '<script src="https://admin.sixempress.com:35729/livereload.js"></script>'; } );
		// add_action("wp_head", function() { echo '<script src="https://admin.sixempress.com:35729/livereload.js"></script>'; } );

		define( 'ALLOW_UNFILTERED_UPLOADS', true );
		// define("WP_DEBUG_LOG", true);
		// define("WP_DEBUG", true);
		// RequestService::$dev_local_ip_addres = "192.168.1.173";

		// clear debug file
		// file_put_contents(ABSPATH . 'wp-content/debug.log', "");
		// file_put_contents(ABSPATH . 'wp-content/debug.log', 'test', FILE_APPEND);

		// RequestService::$base_url = "https://admin.sixempress.com/";
		// RequestService::$api_url = "https://admin.sixempress.com/_api/";
	}

	// start services
	AuthService::__initialize();
	RequestService::__initialize();

}

// execute basic config
sxmpes_startup();

// generic functions
// require(plugin_dir_path(__FILE__).'php/functions.php');
// gutenberg
// require(plugin_dir_path(__FILE__).'gutenberg/index.php');
// shortcodes
require(plugin_dir_path(__FILE__).'shortcodes/index.php');
// pages
require(plugin_dir_path(__FILE__).'php/Pages/SettingsPage.php');
// woocommerce adapter
require(plugin_dir_path(__FILE__).'php/Rest/index.php');

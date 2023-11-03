<?php

namespace SIXEMPRESS\ExternalSync\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Contains information about the authentication between sixempress and wordpress
 */
class AuthService {

	/**
	 * @var string
	 */
	public static $slug;
	
	/**
	 * @var string
	 */
	public static $api_key;

	/**
	 * @var bool
	 */
	public static $is_new_time_limit_set = false;

	/**
	 * get slug/api key options
	 */
	public static function __initialize() {
		$opts = get_option("sxmpes-options");
		if (isset($opts['api_key'])) {
			AuthService::$slug = $opts['slug'];
			AuthService::$api_key = $opts['api_key'];
		}
	}

	/**
	 * Checks if an external request has the correct api_key in the header
	 */
	public static function is_external_req_authorized($auto_answer = true) {

		// if the request comes from our server then we increase the execution time
		// this way we allow heavy lifting for the server
		if (!AuthService::$is_new_time_limit_set) {
			set_time_limit(SE_EXECUTION_TIME_LIMIT);
			AuthService::$is_new_time_limit_set = true;
		}

		$k = UrlService::get_header('x-api-key');
		if (!$k || $k !== AuthService::$api_key) {
			if ($auto_answer) {
				status_header(401);
				echo('Invalid "x-api-key" header');
			}
			return false;
		}


		return true;
	}
	
	/**
	 * Used in the permission_callback for wordpress rest_api_routes
	 */
	public static function rest_permission_xapi_check() {
		return AuthService::is_external_req_authorized(false);
	}

}
	

<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Ping;

use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractController;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * This class contains some utility stuff for communication with the system that don't have a specific single category 
 */
class PingController extends AbstractController {

	public function get_rest_name_type() { return Enum_RestEndpoints::ping; }

	/**
	 * Returns all the syncable ids of the system
	 */
	public function rest_read(WP_REST_Request $req) {
		return 'pong';
	}

}

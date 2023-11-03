<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers;

use SIXEMPRESS\ExternalSync\Services\AuthService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

abstract class AbstractController {

	/**
	 * contais the information of already created paths/actions as to not create them twice
	 */
	protected static $one_time_actions_registry = [
		"crud" => [],
		// "rest" => [],
		// etc..
	];

	public $READABLE = WP_REST_Server::READABLE;
	public $CREATABLE = WP_REST_Server::CREATABLE;
	public $EDITABLE = WP_REST_Server::EDITABLE;
	public $DELETABLE = WP_REST_Server::DELETABLE;

	/**
	 * The namespace for wordpress REST
	 */
	public $namespace = 'sxmpes';

	/**
	 * Returns the endpoint of the REST namesapce
	 */
	abstract public function get_rest_name_type();

	/**
	 * Returns the prefix used for the meta data keys inside the meta data array
	 * @return string
	 */
	protected function get_meta_data_prefix() {
		return '_semp_'.AuthService::$slug.'_';
	}

	/**
	 * Rregisterss rest_route, execute in the 'rest_api_init' action
	 */
	public function register_rest_endpoints() {

		$endpoint = $this->get_rest_name_type();

		// ensure only 1 instance is present
		if (!$this->is_one_time_action_available('rest', $endpoint)) {
			return;
		}

		register_rest_route( $this->namespace, '/' . $endpoint, [
			[
				'methods'             => $this->READABLE,
				'callback'            => [$this, 'rest_read'],
				'permission_callback' => [$this, 'rest_permission_check'],
			],
			[
				'methods'             => $this->CREATABLE,
				'callback'            => [$this, 'rest_create'],
				'permission_callback' => [$this, 'rest_permission_check'],
			],
			[
				'methods'             => $this->EDITABLE,
				'callback'            => [$this, 'rest_edit'],
				'permission_callback' => [$this, 'rest_permission_check'],
			],
			[
				'methods'             => $this->DELETABLE,
				'callback'            => [$this, 'rest_delete'],
				'permission_callback' => [$this, 'rest_permission_check'],
			],
		] );

	}

	/**
	 * Executed on rest readable request
	 */
	public function rest_read(WP_REST_Request $req) {
		return new WP_Error( 404, 'Route Not Found', [ 'status' => 404 ] );
	}

	/**
	 * Executed on rest creatable request
	 */
	public function rest_create(WP_REST_Request $req) {
		return new WP_Error( 404, 'Route Not Found', [ 'status' => 404 ] );
	}

	/**
	 * Executed on rest editable request
	 */
	public function rest_edit(WP_REST_Request $req) {
		return new WP_Error( 404, 'Route Not Found', [ 'status' => 404 ] );
	}

	/**
	 * Executed on rest deletable request
	 */
	public function rest_delete(WP_REST_Request $req) {
		return new WP_Error( 404, 'Route Not Found', [ 'status' => 404 ] );
	}

	/**
	 * Checks if the rest request can pass through
	 */
	public function rest_permission_check() {
		return AuthService::is_external_req_authorized(false);
	}

	/**
	 * Simply creates a WP_Error
	 */
	protected function get_invalid_data_error($msg, $data = []) {
		return new WP_Error( 'sxmpes_invalid_body_data', $msg, array_merge([ 'status' => 403 ], $data) );
	}

	/**
	 * Checks if a one time action is possibile to create
	 * @return boolean
	 */
	protected function is_one_time_action_available($type, $name) {
		$c = get_class($this);

		if (!isset(($c::$one_time_actions_registry[$type]))) {
			$c::$one_time_actions_registry[$type] = [];
		}

		if (isset(($c::$one_time_actions_registry[$type][$name]))) {
			return false;
		}

		$c::$one_time_actions_registry[$type][$name] = 1;
		return true;
	}

}

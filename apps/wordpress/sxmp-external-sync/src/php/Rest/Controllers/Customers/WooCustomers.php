<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Customers;

use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractWooController;

defined( 'ABSPATH' ) || exit;

class WooCustomers extends AbstractWooController {

	public function get_rest_name_type() { return Enum_RestEndpoints::customers; }

	public function get_crud_type() { return Enum_WooPostTypes::crud_customer; }

	public function get_post_type() { return Enum_WooPostTypes::post_customer; }

	/**
	 * We sync ALL the users as customers
	 * as woocommerce allows to have admins as customers
	 */
	public function get_crud_hooks_action_names() {
		return array_merge(
			parent::get_crud_hooks_action_names(),
			// https://github.com/WordPress/WordPress/blob/4.0/wp-includes/user.php#L1858
			[
				'profile_update',
				'user_register',
				'delete_user',
			]
		);
	}

}

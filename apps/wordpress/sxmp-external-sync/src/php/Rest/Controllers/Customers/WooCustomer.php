<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Customers;

use Exception;
use WC_Customer;

defined( 'ABSPATH' ) || exit;

/**
 * A quick workaround to use get_data() from the products factory
 */
class WooCustomer extends WC_Customer {

	function __construct($id) {
		parent::__construct($id);
		
		if ($this->id === 0)
			throw new Exception("Invalid Customer ID");
		
	}

}
	
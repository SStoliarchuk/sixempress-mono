<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Products;

use Exception;

defined( 'ABSPATH' ) || exit;

/**
 * A quick workaround to use get_data() from the products factory
 */
class WooProduct {
	private $product_id = null;
	
	function __construct($id) {
		// ensure product exists
		$p = wc_get_product($id);
		if (!$p) throw new Exception("Invalid product");

		$this->product_id = $id;
	}

	public function get_data() {
		$fc = new WooProductsFactory;
		return $fc->get_data($this->product_id);
	}
}

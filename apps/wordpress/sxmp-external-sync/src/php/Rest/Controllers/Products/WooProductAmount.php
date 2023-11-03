<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Products;

use Exception;
use WC_Product;

defined( 'ABSPATH' ) || exit;

/**
 * A quick workaround to use get_data() from the products factory
 */
class WooProductAmount {
	/** 
	 * @var WC_Product
	 */
	private $product;
	
	function __construct($id) {
		// ensure product exists
		$p = wc_get_product($id);
		if (!$p) throw new Exception("Invalid product");

		$this->product = $p;
	}

	function get_data() {
		return [
			'id' => $this->product->get_id(), 
			'value' => $this->product->get_stock_quantity(),
		];
	}

}
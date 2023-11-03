<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Orders;

use Exception;
use WC_Order;
use WC_REST_Orders_Controller;

defined( 'ABSPATH' ) || exit;

/**
 * A quick workaround to use get_data() from the products factory
 */
class WooOrder {
	private $order = null;
	
	function __construct($id) {
		// ensure product exists
		$order = wc_get_order($id);
		if (!$order) throw new Exception("Invalid order");
		// ensure no refund order
		if ($order->get_parent_id()) throw new Exception("Order is a Refund equivalent, not a raw order");

		$this->order = $order;
	}

	public function get_data() {
		$fc = new WooOrderFactory;
		return $fc->get_data($this->order);
	}
}

class WooOrderFactory extends WC_REST_Orders_Controller {

	public function get_data($order) {
		return $this->get_formatted_item_data($order);
	}


}
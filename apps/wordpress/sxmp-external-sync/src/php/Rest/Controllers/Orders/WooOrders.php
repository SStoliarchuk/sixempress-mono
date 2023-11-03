<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Orders;

use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractWooController;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProductAmounts;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProducts;
use WC_Order;
use WP_REST_Request;

defined('ABSPATH') || exit;

class WooOrders extends AbstractWooController {

	private const ALL_STATUSES = [
		'pending',
		'processing',
		'on-hold',
		'completed',
		'cancelled',
		'refunded',
		'failed',
		'trash',
		'auto-draft',
		'draft', // idk if this exists
	];

	/**
	 * Contains the statuses that decrease the stock
	 */
	private const BOOK_STOCK_STATUSES = [
		'processing',
		'on-hold',
		'completed',
	];

	/**
	 * Contains the statuses that completes an order but in failed mode
	 */
	private const PUT_BACK_STOCK_STATUSES = [
		// treat as draft, because otherwise we have a weird error where the order is create in pending state
		// the stock is removed, but to the user it says that the item is not available
		'pending',
		'refunded',
		'cancelled',
		'failed',
		'trash',
		'auto-draft',
		'draft', // idk if this exists
	];

	public function get_rest_name_type() { return Enum_RestEndpoints::orders; }

	public function get_crud_type() { return Enum_WooPostTypes::crud_order; }

	public function get_post_type() { return Enum_WooPostTypes::post_order; }

	/**
	 * Remove pending as it's used in orders
	 */
	public function get_invalid_crud_post_status() {
		$st = parent::get_invalid_crud_post_status();
		return array_diff($st, ['pending']);
	}

	/**
	 * We modify the default reduce/increase behaviour of the order object to match that of the remote
	 */
	public function register_crud_action_triggers() {
		if (parent::register_crud_action_triggers() === false)
			return false;

		// remove all actions already present for stock changing
		// ./assets/woocommerce/includes/wc-stock-functions.php @ 100
		remove_action( 'woocommerce_payment_complete', 'wc_maybe_reduce_stock_levels' );
		remove_action( 'woocommerce_order_status_completed', 'wc_maybe_reduce_stock_levels' );
		remove_action( 'woocommerce_order_status_processing', 'wc_maybe_reduce_stock_levels' );
		remove_action( 'woocommerce_order_status_on-hold', 'wc_maybe_reduce_stock_levels' );
		remove_action( 'woocommerce_order_status_cancelled', 'wc_maybe_increase_stock_levels' );
		remove_action( 'woocommerce_order_status_pending', 'wc_maybe_increase_stock_levels' );

		// add trash hooks
		add_action('wp_trash_post', [$this, 'maybe_increase']);
		add_action('untrashed_post', [$this, 'maybe_reduce']);

		// add custom hooks
		foreach (WooOrders::BOOK_STOCK_STATUSES as $status)
			add_action( 'woocommerce_order_status_'.$status, [$this, 'maybe_reduce'] );

		foreach (WooOrders::PUT_BACK_STOCK_STATUSES as $status)
			add_action( 'woocommerce_order_status_'.$status, [$this, 'maybe_increase'] );

		// order_status hook is triggered only on status *_CHANGE_* not save
		// so here we ensure we trigger the reduce/increase on order save
		add_action('woocommerce_after_order_object_save', [$this, 'hook_update_stock'], 99, 1);

		return true;
	}

	/**
	 * Here we support the changin of the "status" property only
	 * (for now)
	 */
	public function rest_create(WP_REST_Request $req) {

		$data = $req->get_json_params();
		if (!isset($data['items']))
			return $this->get_invalid_data_error('The body should be: {items: WooProduct[]} with at least 1 object inside');

		/** @var WC_Order[] */
		$orders_to_save = [];

		// validate and update fields
		foreach($data['items'] as $i) {
			if (!$i['id'])
				return $this->get_invalid_data_error('An Order item is missing property id');
			
			if (!$i['status'])
				return $this->get_invalid_data_error('An Order item is missing property status');

			if (!in_array($i['status'], WooOrders::ALL_STATUSES))
				return $this->get_invalid_data_error('The status: '.$i['status'].' is not a valid status');

			$order = wc_get_order($i['id']);
			// if the item is not found then we ignore it
			// as the rest_create is used to update only the status
			if (!$order)
				continue;
			// 	return $this->get_invalid_data_error('Order item with id: '.$i['id'].' not found');

			// update the status
			$order->set_status($i['status']);
			$orders_to_save[] = $order;
		}

		$updated_ids = [];
		// save updated fields
		foreach($orders_to_save as $order) {
			$order->save();
			$updated_ids[] = $order->get_id();
		}

		return ['items' => $updated_ids];
	}

	/**
	 * After the order save we need to trigger the update stock, as the status webhook are triggered only on status TRANSITION
	 */
	public function hook_update_stock(WC_Order $order) {
		$id = $order->get_id();
		if (!$id) 
			return;

		$status = $order->get_status();

		if (in_array($status, WooOrders::BOOK_STOCK_STATUSES))
			$this->maybe_reduce($id);
		else if (in_array($status, WooOrders::PUT_BACK_STOCK_STATUSES))
			$this->maybe_increase($id);
	}

	public function maybe_increase($order_id) {
		WooProducts::$PREVENT_CRUD_EMISSION = true;
		WooProductAmounts::$PREVENT_CRUD_EMISSION = true;

		wc_maybe_increase_stock_levels($order_id);

		WooProducts::$PREVENT_CRUD_EMISSION = false;
		WooProductAmounts::$PREVENT_CRUD_EMISSION = false;
	}

	public function maybe_reduce($order_id) {
		WooProducts::$PREVENT_CRUD_EMISSION = true;
		WooProductAmounts::$PREVENT_CRUD_EMISSION = true;

		wc_maybe_reduce_stock_levels($order_id);

		WooProducts::$PREVENT_CRUD_EMISSION = false;
		WooProductAmounts::$PREVENT_CRUD_EMISSION = false;
	}


}

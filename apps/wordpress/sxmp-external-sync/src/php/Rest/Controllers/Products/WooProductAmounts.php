<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Products;

use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use WC_Product;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

// we extend wooproducts as to use the on_crud_action and all the statuses from the WooProducts() correctly
class WooProductAmounts extends WooProducts {

	public static $PREVENT_CRUD_EMISSION = false;

	public function get_rest_name_type() { return Enum_RestEndpoints::product_amount; }

	public function get_crud_type() { return Enum_WooPostTypes::crud_product_amount; }

	public function get_post_type() { return Enum_WooPostTypes::post_product_amount; }

	/**
	 * Prevents emission if a flag is set to true
	 */
	public function on_crud_action($id, $additional_body = []) {
		if (!WooProductAmounts::$PREVENT_CRUD_EMISSION)
			parent::on_crud_action($id, $additional_body);
	}

	/**
	 * this function registers the hooks for the product before and after save to calculate the difference in stock_quantity
	 */
	public function register_crud_action_triggers() {
		// ensure one time only
		if (!$this->is_one_time_action_available('crud',  $this->get_crud_type()))
			return false;

		// as saving an order object does not trigger this action
		// we use it only for manual changes
		add_action('woocommerce_before_product_object_save', [$this, 'on_before_product_save'], 100, 2);

		// the stock of the order is synced by the software
		// as the order directly contains the "-n" and "+n" changes
		// add_action('woocommerce_before_order_object_save', [$this, 'on_before_order_save'], 100, 2);

		return true;
	}

	/**
	 * Allows to change the product amounts with "-n" and "+n" changes
	 */
	public function rest_create(WP_REST_Request $req) {
		$data = $req->get_json_params();
		if (!isset($data['items']))
			return $this->get_invalid_data_error('The body should be: {items: Array<{id: number, amount: number, op?: "increase" | "decrease" | "set"}>} with at least 1 object inside');
		
		// https://woocommerce.wp-a2z.org/oik_api/wc_update_product_stock/
		foreach($data['items'] as $i) {
			if (isset($i['op'])) {
				wc_update_product_stock($i['id'], $i['amount'], $i['op']);
			}
			else {
				if ($i['amount'] > 0)
					wc_update_product_stock($i['id'], $i['amount'], 'increase');
				else 
					wc_update_product_stock($i['id'], -$i['amount'], 'decrease');
			}
		}
	}

	/**
	 * This function is triggered before a product is saved so we can calculate the difference in the amount
	 * @param WC_Product $woo_class
	 */
	public function on_before_product_save($woo_class, $woo_data) {
			
		//
		// we need to compare the top-most product as woocommerce sets the variation to "publish" even tho
		// the parent is still a draft
		//
		// it does this to add stock , what
		//
		// anyway here we check the top-most to be sure we can emit correctly
		//
		$parent_id = $woo_class->get_parent_id();
		$parent = $parent_id ? wc_get_product($parent_id) : null;
		$curr_status = $parent ? $parent->get_status() : $woo_class->get_status();

		// get the item
		$id = $parent_id ? $parent_id : $woo_class->get_id();
		$db_prod = $id ? wc_get_product($id) : null;

		$is_curr_status_invalid = in_array($curr_status, $this->get_invalid_crud_post_status());

		// if the current status is invalid
		// we check for the child status
		// if *BOTH* child and parent are invalid, then we return and don't emit
		// as it means that the item has never been saved to db
		//
		// otherwise we emit as it means that that item was *ONCE* saved to db (now can be draft or whatever)
		//
		// so as in our system we do setAmount only during the first creation of the productGroup
		// here we check the same :D
		if ($is_curr_status_invalid) {

			// if no prior status is present
			// aka product was never saved
			// then we dont emit
			if (!$db_prod)
				return;

			$db_status = $db_prod->get_status();
			$is_db_status_invalid = in_array($db_status, $this->get_invalid_crud_post_status());

			// else if both the db status and the current status are invalid, then we dont emit either
			if ($is_db_status_invalid && $is_curr_status_invalid)
				return;
		}

		//
		// now that we know the status is valid
		// we can happily emit the changes
		//

		$before = $db_prod ? $db_prod->get_stock_quantity() : 0;
		$after = $woo_class->get_stock_quantity();

		// we emit only if there is actually a difference
		// to prevent useless spam
		if (is_int($after) && ($after - $before) !== 0)
			$this->on_crud_action($woo_class->get_id(), ['value' => $after]);
	}

}

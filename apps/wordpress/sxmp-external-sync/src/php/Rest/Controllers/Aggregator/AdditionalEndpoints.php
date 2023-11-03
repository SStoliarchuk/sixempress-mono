<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Aggregator;

use Throwable;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractController;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Categories\WooProductCategory;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Customers\WooCustomer;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Customers\WooCustomers;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Orders\WooOrder;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Orders\WooOrders;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProduct;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProductAmount;
use SIXEMPRESS\ExternalSync\Rest\Controllers\Products\WooProducts;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\MongoUtils;
use SIXEMPRESS\ExternalSync\Utils\RequestUtils;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * This class contains some utility stuff for communication with the system that don't have a specific single category 
 */
class AdditionalEndpoints extends AbstractController {

	public function get_rest_name_type() { return Enum_RestEndpoints::aggregate_sync_ids; }

	/**
	 * Returns all the syncable ids of the system
	 */
	public function rest_read(WP_REST_Request $req) {
		// add this as the last in array_merge() args
		// as this provides unlimited results :]
		$base_args = [
			'fields'         => 'ids',
			'numberposts'    => -1,
			'posts_per_page' => -1,
			'limit'          => -1,
			'hide_empty'     => false,
		];

		$types = [
			Enum_WooPostTypes::crud_customer => [
				'fn' => function ($args) use ($base_args) {
					return array_map(function ($i) { return intval($i); }, get_users(array_merge($args, $base_args))); 
				},
				'invalid_statuses' => (new WooCustomers())->get_invalid_crud_post_status(),
			],
			Enum_WooPostTypes::crud_product_category => [
				'fn' => function ($args) use ($base_args) {
					return get_terms(array_merge($args, ['taxonomy' => Enum_WooPostTypes::post_product_category], $base_args)); 
				},
				// 'invalid_statuses' => (new WooProductCategories())->get_invalid_crud_post_status(),
			],
			Enum_WooPostTypes::crud_product => [
				'fn' => function ($args) use ($base_args) {
					return get_posts(array_merge($args, ['post_type' => Enum_WooPostTypes::post_product], $base_args)); 
				},
				'invalid_statuses' => (new WooProducts())->get_invalid_crud_post_status(),
			],
			// when we refund, woocommerce create an equal order with the parent_id of the original order
			// and the total as the negative of the parent id
			// 
			// also ['fields' => 'ids'] gives an error so we set null here
			// ERROR: <div id="error"><p class="wpdberror"><strong>WordPress database error:</strong> [You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near &#039;) ORDER BY order_item_id&#039; at line 1]<br /><code>SELECT order_item_type, order_item_id, order_id, order_item_name FROM wp_woocommerce_order_items WHERE order_id in (  ) ORDER BY order_item_id;</code></p></div>{
			Enum_WooPostTypes::crud_order => [
				'fn' => function ($args) use ($base_args) {
					return array_map(function ($i) { return $i->get_id(); }, wc_get_orders(array_merge(['post_parent' => 0], $args, $base_args, ['fields' => null]))); 
				},
				'invalid_statuses' => (new WooOrders())->get_invalid_crud_post_status(),
			],
		];

		$filter = RequestUtils::get_query_param_filter($req);
		if (is_wp_error($filter))
			return $filter;

		$projection = RequestUtils::get_query_param_projection($req);
		if (is_wp_error($projection))
			return $projection;

		$ret = [];

		// get all the post statuses available in the system
		$all_statuses = array_values(get_post_stati());

		// we check if isset && !== 0 because
		// if we give prjection: {order: {}}
		// this will ensure that only the orders are returned
		foreach ($types as $type => $val) {
			if (!$projection || (isset($projection[$type]) && $projection[$type] !== 0)) {
				$args = [];
				
				// if invalid statuses are present, then we diff them with all the available, and filter the posts
				if (isset($val['invalid_statuses']))
					$args['post_status'] = array_values(array_diff($all_statuses, $val['invalid_statuses']));

				// add custom manual filters
				if ($filter && isset($filter[$type]) && is_array($filter[$type]))
					$args = array_merge($args, $filter[$type]);

				// validate status
				if (isset($args['post_status'])) {
					// if we give a typo in the status, eg "wp-completeed", then the system searches for ANY status.
					// so here if we ensure that all the status given do actually exist
					$args['post_status'] = is_array($args['post_status']) ? $args['post_status'] : [$args['post_status']];
					
					// remove invalid
					for ($i = 0; $i < count($args['post_status']); $i++)
						if (!in_array($args['post_status'][$i], $all_statuses))
							array_splice($args['post_status'], $i, 1);
					
					// if all the given statuses are invalid, then we skip this query
					if (count($args['post_status']) === 0 && isset($val['invalid_statuses'])) {
						$ret[$type] = [];
						continue;
					}

				}

				// return $args;
				$ret[$type] = ($val['fn'])($args);
			}
		}


		return $ret;
	}

	/**
	 * Given a list of ids products/orders etc it queries those items and returns everything back togheter
	 * we use POST instead of GET as the list could be long
	 */
	public function rest_create(WP_REST_Request $req) {
		$data = $req->get_json_params();
		if (is_scalar($data))
			return $this->get_invalid_data_error('body should be: {[post_type]: number[]}');

		$projection = $req->get_param('projection');
		if ($projection)
			$projection = json_decode($projection, JSON_THROW_ON_ERROR);
		
		// transform ids to objects
		foreach ($data as $crud_type => $ids) {
			
			if (!is_array($ids))
				return $this->get_invalid_data_error('body should be: {[post_type]: number[]}');

			$crud_type_projection = null;

			// handle projections
			if ($projection && isset($projection[$crud_type])) {
				
				// remove this type
				if ($projection[$crud_type] === 0) {
					unset($data[$crud_type]);
					continue;
				}

				// parse them
				$crud_type_projection = RequestUtils::validate_projection_object($projection[$crud_type]);
				if (is_wp_error($crud_type_projection))
					return $crud_type_projection;
			}


			// get the relative class of the model to parse
			$class_name = null;
			switch ($crud_type) {
				
				case Enum_WooPostTypes::crud_customer:
					$class_name = WooCustomer::class;
					break;

				case Enum_WooPostTypes::crud_product_amount:
					$class_name = WooProductAmount::class;
					break;
										
				case Enum_WooPostTypes::crud_order:
					$class_name = WooOrder::class;
					break;

				case Enum_WooPostTypes::crud_product_variation:
				case Enum_WooPostTypes::crud_product:
					$class_name = WooProduct::class;
					break;

				case Enum_WooPostTypes::crud_product_category:
					$class_name = WooProductCategory::class;
					break;
			}

			// enssure the post_type is supported as to not give false positives
			if (!$class_name)
				return $this->get_invalid_data_error('The post_type supplied inside the body is not valid: "'.$crud_type.'"');

			// trasform ids to data
			$items_data = [];
			foreach ($ids as $id) {
				if (!is_int($id))
					return $this->get_invalid_data_error('body should be: {[post_type]: number[]}');

				// it trhows if an item is not found
				// thus we simply continue
				try { 
					$class = new $class_name($id); 
					$items_data[$id] = $class->get_data();
				} 
				catch (Throwable $e) { continue; }

				// project
				if (isset($crud_type_projection)) {
					$items_data[$id] = MongoUtils::project($items_data[$id], $crud_type_projection);
					
					// if we're processing products then we need to check deep fields for proejct
					if ($crud_type === Enum_WooPostTypes::crud_product)
						$items_data[$id] = AdditionalEndpoints::deep_project_product($items_data[$id], $crud_type_projection);
				}

			}
			$data[$crud_type] = $items_data;
		}

		return $data;
	}

	/**
	 * Projects the parent and the variations field respectively
	 */
	private static function deep_project_product(&$product, $projection) {
		
		if (isset($product['parent'])) {
			$product['parent'] = MongoUtils::project($product['parent'], $projection);
			$product['parent'] = AdditionalEndpoints::deep_project_product($product['parent'], $projection);
		}
		else if (isset($product['variations'])) {
			$product['variations'] = array_map(function ($v) use ($projection) { return MongoUtils::project($v, $projection); }, $product['variations']);
		}

		return $product;
	}

}

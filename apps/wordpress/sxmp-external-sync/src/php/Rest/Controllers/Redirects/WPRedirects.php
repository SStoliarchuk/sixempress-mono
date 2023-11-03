<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Redirects;

use Throwable;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractController;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\VariousUtils;
use WC_Product;
use WP_Query;
use WP_REST_Request;

defined('ABSPATH') || exit;

/**
 * This class contains the logic used to redirect a user that scans an external QrCode or other type of links that contain a product id / repair etc..
 * to the appropriate page in the system
 * 
 * it checks which page has the repair-status block, it redirects to the permalink of the product and so on
 */
class WPRedirects extends AbstractController {

	public function get_rest_name_type() { return Enum_RestEndpoints::redirects; }

	/**
	 * Cretes the URL to redirect the user to
	 */
	public function rest_read(WP_REST_Request $req) {
		
		$url = "";
		$type = intval($req->get_param('t'));
		$value = $req->get_param('v');

		// try to find the url for the request type
		switch ($type) {
			case Enum_RedirectTypes::product: $url = $this->get_product_link($value); break;
		}

		$url = apply_filters('sxmpes_wpredirects_destination_url', $url, $type, $value, $req);
		// if an url wasnt' created we fallback to the base sites url
		// we always use 307 for temporary redirect as the end url can always change
		wp_redirect($url ? $url : get_site_url(), 307);
		// Note: wp_redirect() does not exit automatically, and should almost always be followed by a call to exit;:
		// https://developer.wordpress.org/reference/functions/wp_redirect/
		exit();
	}

	/**
	 * Creates a WC_Product by parsing the query value and returns the permalink of that product
	 */
	private function get_product_link($val) {

		// Transform the ObjectId() value given to a wp post ID
		if (VariousUtils::is_object_id($val)) {
			$key = $this->get_meta_data_prefix().'product_id';
			$args = [
				'posts_per_page' => 1,
				'post_type' => 'product',
				'meta_key' => $key,
				'meta_value' => $val,
			];
			$query = new WP_Query($args);
			$items = $query->get_posts();
			if (!$items) return;

			$val = $items[0]->ID;
		}

		// numeric value, aka the ID of the woocommerce post
		if (preg_match('/^[0-9]+$/', $val)) {
			try { $p = new WC_Product($val); }
			catch (Throwable $e) { return; }

			return $p->get_permalink();
		}
	}

	/**
	 * Disable perimssions as these paths are public
	 */
	public function rest_permission_check() {
		return true;
	}

}

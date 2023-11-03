<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Products;

use SIXEMPRESS\ExternalSync\Rest\Controllers\RawFiles\RawFiles;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_HookTags;
use SIXEMPRESS\ExternalSync\Utils\VariousUtils;
use Throwable;
use WC_Product_Factory;
use WC_Product_Variation;
use WC_REST_Products_Controller;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * This class is used by additional endpoint to construct extended get_data() return object
 * where there are present variations models instead of ids and other stuff ?
 * 
 * and also used as a generally improved product controlelr
 */
class WooProductsFactory extends WC_REST_Products_Controller { 

	public function get_data($id) {

		$factory = new WC_Product_Factory( );
		$class = $factory->get_product($id);
		$built_data = $this->get_product_data($class);

		// add parent object
		if ($built_data['parent_id']) {
			$parent = new WooProduct($built_data['parent_id']);
			$parent_data = $parent->get_data();
			// it could happen that the parent variation does not contain this same child,
			// i dont know how that happens but ok.
			// 
			// it happened during csv upload btw
			$self_present = VariousUtils::array_find($parent_data['variations'], function ($v) use ($id) { return $v['id'] === $id; });
			if (!$self_present)
				$parent_data['variations'][] = $built_data;

			// set the parent to the thing here
			$built_data['parent'] = $parent_data;
		}
		// if the product has variable then we add the whole objects inside the variations array
		else if ($built_data['type'] === 'variable') {
			
			$childs = $class->get_children();
			$built_data['variations'] = [];
			
			// add variations child if present
			if ($childs) {
				$built_data['variations'] = array_map(function ($child_id) {
					$child_c = new WC_Product_Variation($child_id);
					return $this->get_product_data($child_c);
				}, $childs);
			}
		}

		return $built_data;
	}

	/**
	 * Before calling the parent, check sif the current server contains the images urls, and if so adds the correct ID back to the array
	 * this function does not throw or return any error
	 * @return WP_Error in case it throws one
	 */
	public function set_product_images($product, $images) {
		
		try {

			// not an array, so we unset the image
			if (!is_array($images)) {
				parent::set_product_images($product, $images);
			}
			else {
				// only allows items with ID
				// this is because otherwise woocommerce will upload them once again
				// and it will do without a hash, as such will always upload the same image
				// over and over and over and over
				$filtered = [];


				foreach ($images as &$image) {
					// already present
					if (isset($image['id'])) {
						$filtered[] = $image;
					}
					// create ne
					else {
						$image['id'] = RawFiles::quick_file_upload($image['name'], $image['src']);
						if (!$image['id'] || !is_int($image['id'])) 
							continue;

						$filtered[] = $image;
					}
				}
			
				// add a filter just in case
				$filtered = apply_filters(Enum_HookTags::filtered_product_images, $filtered, $product);

				// set the new images
				parent::set_product_images($product, $filtered);
			}

		}
		// return instead of trhowing for consistency in json_single_property
		catch (Throwable $e) {
			return new WP_Error(400, $e->getMessage());
		}
	}

}

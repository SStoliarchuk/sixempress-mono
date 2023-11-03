<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Products;

use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractWooController;

defined( 'ABSPATH' ) || exit;

// this class is useless as every change to a variation 
// triggers a change to the parent
class WooProductVariations extends AbstractWooController {

	public function get_rest_name_type() { return Enum_RestEndpoints::product_variations; }

	public function get_crud_type() { return Enum_WooPostTypes::crud_product_variation; }

	public function get_post_type() { return Enum_WooPostTypes::post_product_variation; }

}
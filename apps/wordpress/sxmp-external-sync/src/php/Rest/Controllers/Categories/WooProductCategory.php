<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Categories;

use Exception;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;

defined( 'ABSPATH' ) || exit;

class WooProductCategory {

	private $term;

	// build the object
	public function __construct(int $id) {

		// return as associative array
		$this->term = get_term_by('id', $id, Enum_WooPostTypes::crud_product_category, ARRAY_A);
		
		if (!$this->term)
			throw new Exception(Enum_WooPostTypes::crud_product_category . " with id: '".$id."' was not found");

		// switch term_id to id
		$this->term['id'] = $this->term['term_id'];
		unset($this->term['term_id']);
	}
	
	// return the object
	public function get_data() {
		return $this->term;
	}

}



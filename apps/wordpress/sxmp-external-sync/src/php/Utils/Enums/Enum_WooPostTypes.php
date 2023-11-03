<?php

namespace SIXEMPRESS\ExternalSync\Utils\Enums;

defined( 'ABSPATH' ) || exit;

class Enum_WooPostTypes {

	const crud_customer = 'customer';
	const post_customer = 'customer';

	const crud_product = 'product';
	const post_product = 'product';

	const crud_product_tag = 'product_tag';
	const post_product_tag = 'product_tag';

	// these do not exist in reality
	// we use them internally
	const crud_product_amount = 'product_amount';
	const post_product_amount = 'product_amount';

	const crud_product_category = 'product_cat';
	const post_product_category = 'product_cat';
	
	const crud_product_variation = 'product_variation';
	const post_product_variation = 'product_variation';

	const crud_order = 'order';
	const post_order = 'shop_order';
}
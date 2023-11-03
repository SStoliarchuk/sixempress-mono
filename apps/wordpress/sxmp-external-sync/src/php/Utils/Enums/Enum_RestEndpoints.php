<?php

namespace SIXEMPRESS\ExternalSync\Utils\Enums;

defined( 'ABSPATH' ) || exit;

class Enum_RestEndpoints {
	const rawfiles            = 'rawfiles';
	const aggregate_sync_ids  = 'aggregate_sync_ids';
	const ping                = 'ping';
	const redirects           = 'r'; // we keep this path as short as possibile to decrease qr code sizes

	const products            = 'products';
	const product_amount      = 'product_amount';
	const product_variations  = 'product_variations';
	const orders              = 'orders';
	const product_categories  = 'product_categories';
	const customers           = 'customers';
}
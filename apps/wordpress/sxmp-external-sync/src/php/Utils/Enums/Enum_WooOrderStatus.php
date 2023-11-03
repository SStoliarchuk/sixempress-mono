<?php

namespace SIXEMPRESS\ExternalSync\Utils\Enums;

defined( 'ABSPATH' ) || exit;

class Enum_WooOrderStatus {
	const pending = 'pending';
	const processing = 'processing';
	const on = 'on-hold';
	const completed = 'completed';
	const cancelled = 'cancelled';
	const refunded = 'refunded';
	const failed = 'failed';
}

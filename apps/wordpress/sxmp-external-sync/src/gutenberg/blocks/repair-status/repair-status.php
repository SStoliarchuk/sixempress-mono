<?php

defined( 'ABSPATH' ) || exit;

use SIXEMPRESS\ExternalSync\Services\RequestService;
use SIXEMPRESS\ExternalSync\Services\UrlService;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_BePaths;

// wp_enqueue_scripts, admin_enqueue_scripts
add_action('wp_enqueue_scripts', function() {
	if (is_singular() && has_block('sxmpes/repair-status', get_the_ID())) {
		$asset_file = include(plugin_dir_path(__FILE__) . 'repair-status.asset.php');
		wp_register_script(
			'sxmpes-dr-block-repair-status-js',
			plugins_url('repair-status.js', __FILE__),
			$asset_file['dependencies'],
			$asset_file['version']
		);
	}
});

add_action("init", function() {
	register_block_type(
		'sxmpes/repair-status',
		[
			'editor_script'	=> 'sxmpes-block-js',
			'style'         => 'sxmpes-style-css',
			'editor_style'  => 'sxmpes-block-editor-css',
			'script' 				=> 'sxmpes-dr-block-repair-status-js',
		]
	);
});


function sxmpes_get_repair_info() {
	$search_id = UrlService::get_url_parameter("id", "number");
	// no id, dont need to check
	if (!$search_id)
		return wp_die();

	// query
	$res = RequestService::api_get(Enum_BePaths::repairs, ["value" => $search_id]);
	if (is_wp_error($res) || !$res)
		return wp_die();

	// give back item
	echo json_encode($res);
	wp_die();
}

add_action("wp_ajax_nopriv_get_repair_info", 'sxmpes_get_repair_info');
add_action("wp_ajax_get_repair_info", 'sxmpes_get_repair_info');
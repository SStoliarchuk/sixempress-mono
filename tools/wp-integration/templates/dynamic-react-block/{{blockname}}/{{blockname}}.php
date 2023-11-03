<?php

defined( 'ABSPATH' ) || exit;

add_action('wp_enqueue_scripts', function() {
	// load the script only if the page requests it
	if (is_singular() && has_block('seprimio/{{blockname}}', get_the_ID())) {
		$asset_file = include(plugin_dir_path(__FILE__) . '{{blockname}}.asset.php');
		wp_register_script(
			'seprimio-dr-block-{{blockname}}-js',
			plugins_url('{{blockname}}.js', __FILE__),
			$asset_file['dependencies'],
			$asset_file['version']
		);
	}
});

add_action("init", function() {
	register_block_type(
		'seprimio/{{blockname}}',
		[
			'editor_script'	=> 'seprimio-block-js',
			'style'         => 'seprimio-style-css',
			'editor_style'  => 'seprimio-block-editor-css',
			'script' 				=> 'seprimio-dr-block-{{blockname}}-js',
		]
	);
});


<?php

defined( 'ABSPATH' ) || exit;

// style
add_action( 'wp_enqueue_scripts', 'seprimio_scfn_{{blockname_underscore}}_style' );
function seprimio_scfn_{{blockname_underscore}}_style() {
	if (is_page()) {
		global $post; 
		if (has_shortcode($post->post_content, 'seprimio_sc_{{blockname}}')) {
			wp_enqueue_style( 'seprimio-scfn-{{blockname}}-css' );
		}
	}
}

// register
add_action("init", function() {
	add_shortcode('seprimio_sc_{{blockname}}', 'seprimio_scfn_{{blockname_underscore}}'); 

	$asset_file = include(plugin_dir_path(__FILE__) . 'style.asset.php');

	wp_register_style(
		'seprimio-scfn-{{blockname}}-css',
		plugins_url('style.css', __FILE__),
		$asset_file['dependencies'],
		$asset_file['version'],
	);
});

// logic
function seprimio_scfn_{{blockname_underscore}}() { 
	$html = '<div data-seprimio-sc="seprimio/{{blockname}}">';
	$html .= 'Hello {{blockname}}!';
	$html .= '</div>';
	return $html;
} 
	
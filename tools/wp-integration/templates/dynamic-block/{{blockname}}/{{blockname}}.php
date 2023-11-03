<?php

defined( 'ABSPATH' ) || exit;

add_action("init", function() {
	register_block_type(
		'seprimio/{{blockname}}',
		[
			'editor_script' => 'seprimio-block-js',
			'style'         => 'seprimio-style-css',
			'editor_style'  => 'seprimio-block-editor-css',
			'render_callback' => 'seprimio_{{blockname_underscore}}_render_callback',
		]
	);
});

function seprimio_{{blockname_underscore}}_render_callback($block_attributes, $content, $block_info) {
	return '<div data-block-name="seprimio/{{blockname}}">Hello {{blockname}}</div>';
}

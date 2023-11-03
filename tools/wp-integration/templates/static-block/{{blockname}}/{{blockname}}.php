<?php

defined( 'ABSPATH' ) || exit;

add_action("init", function() {
	register_block_type(
		'seprimio/{{blockname}}',
		[
			'editor_script' => 'seprimio-block-js',
			'style'         => 'seprimio-style-css',
			'editor_style'  => 'seprimio-block-editor-css',
		]
	);
});

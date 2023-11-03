<?php

add_action('init', function() {
	register_block_type(
		'sxmpes/static',
		[
			'editor_script' => 'sxmpes-block-js',
			'style'         => 'sxmpes-style-css',
			'editor_style'  => 'sxmpes-block-editor-css',
		]
	);
});

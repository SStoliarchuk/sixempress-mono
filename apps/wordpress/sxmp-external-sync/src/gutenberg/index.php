<?php

defined( 'ABSPATH' ) || exit;
	

// ensure Gutenberg is active.
if (function_exists('register_block_type')) {
	
	/**
	 * Add custom category
	 */
	add_filter('block_categories', function ($categories, $post) {
		// add after the widgets
		if (ENV === "production") {
			array_splice($categories, count($categories) - 2, 0, [[
				'slug'  => 'sxmpes',
				'title' => 'SIXEMPRESS',
				'icon' => null,
			]]);
			return $categories;
		} 
		// ad as first
		else {
			return array_merge(
				[[
					'slug'  => 'sxmpes',
					'title' => 'SIXEMPRESS',
					'icon' => null,
				]],
				$categories
			);
		}
	}, 10, 2);
	
	
	/**
	 * Register basic block assets
	 * @note the priority is 9, so it's executed BEFORE the blocks init action
	 */
	add_action('init', function () {
		// ensure plugin is present
		if (!file_exists(plugin_dir_path(__FILE__) . 'index.asset.php')) {
			throw new Error("Plugin has not been built");
		}
	
		// add utilities for dynamic react blocks
		// it could be undefined if no utilities are used
		if (file_exists(plugin_dir_path(__FILE__) . 'logic/index.asset.php')) {
			$asset_file = include(plugin_dir_path(__FILE__) . 'logic/index.asset.php');
			wp_enqueue_script(
				'sxmpes-dynamic-react-utils-js',
				plugins_url('logic/index.js', __FILE__),
				$asset_file['dependencies'],
				$asset_file['version']
			);
		}
		
		wp_localize_script(
			'sxmpes-dynamic-react-utils-js',
			'__sxmpes',
			[ 'ajax_url' => admin_url( 'admin-ajax.php' ) ]
		);
	
		// add main entry point
		$asset_file = include(plugin_dir_path(__FILE__) . 'index.asset.php');
		wp_register_script(
			'sxmpes-block-js',
			plugins_url('index.js', __FILE__),
			$asset_file['dependencies'],
			$asset_file['version']
		);
	
		wp_register_style(
			'sxmpes-style-css',
			plugins_url('style-index.css', __FILE__),
			is_admin() ? ['wp-editor'] : null,
			$asset_file['version']
		);
	
		wp_register_style(
			'sxmpes-editor-css',
			plugins_url('index.css', __FILE__),
			['wp-edit-blocks'],
			$asset_file['version']
		);
	
	}, 9);

	// block imports
	require(plugin_dir_path(__FILE__).'blocks/repair-status/repair-status.php');
	
}

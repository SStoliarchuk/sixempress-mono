<?php
/**
 * Plugin Name:       SIXEMPRESS External Sync
 * Description:       Integrates the SIXEMPRESS system with your wordpress/woommerce website
 * Version:           1.0.1
 * Requires PHP:      7.2
 * Author:            SIXEMPRESS
 */

defined( 'ABSPATH' ) || exit;

// we store the main logic in src/index.php, as to avoid importing from "build" folder
// and also in general it is easier to import from there
// and to allow hot reload as i'm lazy to add this file to webpack watcher
require(plugin_dir_path(__FILE__).'vendor/autoload.php');
require(plugin_dir_path(__FILE__).'index.php');

<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers;

use SIXEMPRESS\ExternalSync\Services\AuthService;
use SIXEMPRESS\ExternalSync\Services\RequestService;
use SIXEMPRESS\ExternalSync\Services\UrlService;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_BePaths;
use WC_Data;
use WP_Error;

defined( 'ABSPATH' ) || exit;

abstract class AbstractWooController extends AbstractController {

	public $namespace = 'sxmpes/woo';

	/**
	 * Here we store the invalid statuses as to have a blacklist instead of a whitelist
	 * because there could be present custom statuses that we need to take into account
	 * 
	 * // TODO maybe a whitelist is better?
	 */
	public function get_invalid_crud_post_status() {
		// https://wordpress.stackexchange.com/questions/13484/how-to-get-all-posts-with-any-post-status
		// https://developer.wordpress.org/reference/classes/wp_query/#post-type-parameters
		// 'publish', - a published post or page
		// 'pending', - post is pending review
		// 'draft', - a post in draft status
		// 'auto-draft', - a newly created post, with no content
		// 'future', - a post to publish in the future
		// 'private', - not visible to users who are not logged in
		// 'inherit', - a revision. see get_children.
		// 'trash', - post is in trashbin. added with Version 2.9. 

		return [
			// we need these twos as they mean "active" or "deleted"
			// 'publish',
			// 'trash',

			// standard statuses
			'pending',
			'draft',
			'auto-draft',
			'future',
			'private',
			'inherit',

			// from woocommerce
			'importing'
		];	
	}

	/**
	 * Contains the WC_Webhook name of the type of product its controlling, its used for woocommerce_{new|update|delete}_ hooks
	 * 
	 * i think it uses this:\
	 * WC_Data_Store::$stores\
	 * ./assets/woocommerce/includes/class-wc-data-store.php @ line 35
	 */
	public abstract function get_crud_type();

	/**
	 * Retruns the actual post_type of the item as relative to WordPress
	 */
	public abstract function get_post_type();

	/**
	 * Returns all the names of actions that have crud effects on the model controlled\
	 * used in add_action($hook_name)
	 */
	public function get_crud_hooks_action_names() {
		$type = $this->get_crud_type();
		$ret = ['woocommerce_new_'.$type, 'woocommerce_create_'.$type, 'woocommerce_update_'.$type, 'woocommerce_delete_'.$type];
		return $ret;
	}

	/**
	 * add_action to crud hooks of the controller to notify outside endpoints for changes
	 */
	public function register_crud_action_triggers() {
		// ensure one time only
		if (!$this->is_one_time_action_available('crud',  $this->get_crud_type()))
			return false;

		// add basic crud hooks
		$all_hooks = $this->get_crud_hooks_action_names();
		foreach ($all_hooks as $h)
			add_action($h, [$this, 'on_crud_action'], 100);

		// add trash hooks
		add_action('wp_trash_post', [$this, 'maybe_crud_action']);
		add_action('untrashed_post', [$this, 'maybe_crud_action']);

		return true;
	}

	/**
	 * As woocommerce does not contain (or the ones i tried dont work idk) trash hooks
	 * we use this function to check if the type of the trashed post is the same as this classes post
	 * if so, then we execute on_crud_action
	 * @param string $id
	 */
	public function maybe_crud_action($id) {
		if ($this->get_post_type() === get_post_type($id))
			$this->on_crud_action($id);
	}

	/**
	 * Is triggered whenever there is a CRUD operation on the model
	 * @param string $id the id of the CRUD OP target
	 * @param mixed $additional_body additional body parameter for the post request
	 */
	public function on_crud_action($id, $additional_body = []) {
		// id could be null somehow
		// (happened on order creation)
		if (!$id)
			return;

		// if the status is invalid then dont emit
		$status = get_post_status($id);
		if (in_array($status, $this->get_invalid_crud_post_status()))
			return;
		
		// dont emi updates if the request come from the system itself
		// as to avoid sync loop
		if (AuthService::is_external_req_authorized(false)) {
			// if in test environment then DONT notify if we DONT have the header
			// this is done for testing purposes
			
			if (UrlService::get_header('x-crud-notify') != 'true')
				return;
		}

		sxmpes_woo_controller_notify_crud_update($id, $this->get_crud_type(), $additional_body);
	}


	/**
	 * Saves an array of products and returns the deleted status
	 * @param WC_Data $p the product class to save
	 * @return false|string returns the id saved or a false if there was an error
	 */
	protected function execute_safe_product_save($p) {
		// idk if this throws an error
		$p->save(); 
		$id = $p->get_id();

		// if there is no id then it's errored
		if (!$id)
			return false;

		return $id;
	}

	/**
	 * it calls set_{property_name} for each property of $data
	 * @param WC_Data $class the class that has the setter function
	 * @param mixed $data object with the data to set
	 * @return WP_Error in case there is a wrong property
	 */
	protected function json_to_properties(&$class, $data) {
		foreach ($data as $k => $v) {
			$maybe_error = $this->json_single_property($class, $v, $k);

			if (is_wp_error($maybe_error))
				return $maybe_error;
		}
	}

	/**
	 * Checks for the $k function given as "set_$k" inside the $class
	 * if it found then it executes the set_$k on the class with the $data[$k]
	 * 
	 * This function is out here to be overridden
	 * 
	 * @param WC_Data $class the class where the set_$k function will be executed if present
	 * @param mixed $k_value the value to set, used as parameter for the set_$k function
	 * @param string $k the parameter to set
	 * @return WP_Error returns only the errors in case it has errored
	 */
	protected function json_single_property(&$class, $k_value, $k) {
		if ($k === 'meta_data') {
			if ($k_value)
				$this->set_fixed_metadata($class, $k_value);
		}
		else {
			$set_function_name = 'set_'.$k;
			
			// for invalid properties we just ignore them
			if (!method_exists($class, $set_function_name))
				return;
			
			$class->{$set_function_name}($k_value);
		}
	}

	/**
	 * Fixes metadata that instead of replaceing a key it adds to array...
	 */
	protected function set_fixed_metadata(WC_Data &$p, $new_values) {
		foreach ($new_values as $md) {
			$prefix = $this->get_meta_data_prefix();

			// keep only 1 copy of our meta_data instaed of adding new ones
			if (substr($md['key'], 0, strlen($prefix)) === $prefix)
				$p->update_meta_data($md['key'], $md['value']);
			else
				$p->add_meta_data($md['key'], $md['value']);
		}
	}

	/**
	 * Deletes all given products so the errored POST can be repeated
	 * @param WC_data[] $items
	 */
	protected function delete_on_creation_error($items, WP_Error $err = null) {
		foreach ($items as $i)
			if ($i->get_id()) 
				$i->delete();
				
		if ($err)
			return $err;

		return new WP_Error('Internal save error', 'WooCommerce has errored during the creation of the items: ' + $this->get_crud_type(), ['status' => 500]);
	}


}

/**
 * We keep this function outside of the class as the wp_schedule_single_event needs to be able to see it
 * and to keep it inside the class we would need to instanciate the class
 * 
 * I think it could be possibile to use a static function idk
 * 
 * @param string $id the id of the item changed
 * @param string $type the type of the crud item changed
 */
function sxmpes_woo_controller_notify_crud_update($id, $type, $additional_body = []) {
	$r = RequestService::api_post(
		Enum_BePaths::woo_crudupdate, 
		// merge the array with additional data
		array_merge([
			'item_type' => $type, 
			'id' => $id
		], $additional_body), 
		[], 
		['headers' => ['x-origin-url' => get_site_url()]]
	);

	// error_log(json_encode(['r' => $r]));
	// ob_start();                    // start buffer capture
	// var_dump( $r );           // dump the values
	// $contents = ob_get_contents(); // put the buffer into a variable
	// ob_end_clean();                // end capture
	// error_log( $contents ); 
	
	// // in case the request has errored, we schedule another retry as soon as possible
	// if (is_wp_error($r)) { 
		// TODO, this doesnt work, find out how to fix it
		// wp_schedule_single_event(time(), 'sxmpes_woo_controller_notify_crud_update_error_scheduled_retry', [$id, $type]);
		// WC()->queue()->schedule_single( time() + 10, 'sxmpes_woo_controller_notify_crud_update_error_scheduled_retry', [$a, 'ban'] );
	// }
}
/**
 * action for the scheduled retry
 */
// add_action('sxmpes_woo_controller_notify_crud_update_error_scheduled_retry', 'sxmpes_woo_controller_notify_crud_update', 10, 2);


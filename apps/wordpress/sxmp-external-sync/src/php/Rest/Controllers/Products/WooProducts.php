<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Products;

use Throwable;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractWooController;
use WC_Product;
use WC_Product_Attribute;
use WC_Product_Simple;
use WC_Product_Variable;
use WC_Product_Variation;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

class WooProducts extends AbstractWooController {

	public static $PREVENT_CRUD_EMISSION = false;

	/**
	 * This field is present in a product variable and it contains its' product variation childs classes,
	 * the childs needs to be assigned the set_parent_id() and then save();
	 */
	private static $PRODUCT_VARIATIONS_TEMP_FIELD = '__temp_variation_field';

	public function get_rest_name_type() { return Enum_RestEndpoints::products; }

	public function get_crud_type() { return Enum_WooPostTypes::crud_product; }

	public function get_post_type() { return Enum_WooPostTypes::post_product; }

	/**
	 * As the woocommerce api requires you to create the products and then their variation one by one 
	 * this function exists to allow us to create all the products with their variation with a single call to the customer server
	 * 
	 * use for reference:\
	 * REST CONTROLLER: /assets/woocommerce/includes/rest-api/Controllers/Version3/class-wc-rest-controller.php\
	 * line 195            public function batch_items( $request )
	 * 
	 * PRODUCT CREATE: /assets/woocommerce/includes/rest-api/Controllers/Version1/class-wc-rest-products-v1-controller.php\
	 * line 737           public function create_item( $request )
	 */
	public function rest_create(WP_REST_Request $req) {

		$data = $req->get_json_params();
		if (!isset($data['items']))
			return $this->get_invalid_data_error('The body should be: {items: WooProduct[]} with at least 1 object inside');

		// We create the classes first and then save to ensure that there are no errors
		if ($data['items']) {
			$all_built_products = $this->generate_product_classes_to_save($data['items']);

			if (is_wp_error($all_built_products)) 
				return $all_built_products;

			$ids = $this->execute_product_classes_save($all_built_products);
			if (is_wp_error($ids))
				return $ids;
		}

		// return saved ids
		return ['items' => isset($ids) ? $ids : []];
	}

	/**
	 * Allows to execute modifications on products withouth the strict requirements of the POST counterpart
	 */
	public function rest_edit(WP_REST_Request $req) {
		
		$data = $req->get_json_params();
		if (!isset($data['items']))
			return $this->get_invalid_data_error('The body should be: {items: WooProduct[]} with at least 1 object inside');

		$updated_ids = [];
		foreach ($data['items'] as $p) {
			if (!isset($p['id']))
				return $this->get_invalid_data_error('Each item in the body["items"] array should contain and id');

			$product_class = wc_get_product($p['id']);
			if (!$product_class) 
				continue;

			// update the properties
			unset($p['id']);
			$error = $this->json_to_properties($product_class, $p);
			if ($error) 
				return $error;


			// ignore errors
			try {
				$product_class->save();
				$updated_ids[] = $product_class->get_id();
			} catch (Throwable $e) { }

		}
		
		return ['items' => $updated_ids];
	}

	/**
	 * builds all the product classes for save()
	 * @param mixed $products the products array of the POST request
	 * @return WC_Product[]
	 */
	private function generate_product_classes_to_save($products) {

		// get all the invalid statuses which will be checked by the variations childs
		// to fix the issue where we reference a child that is in status "trash" but it is not
		// restored from trash :/
		$invalid_status_cache = $this->get_invalid_crud_post_status();
		$invalid_status_cache[] = 'trash';

		/**
		 * product controllers that are ready to save();
		 * @var WC_Product[]
		 */
		$all_built_products = [];
		
		// validate data and create the controllers
		foreach ($products as $p) {
			if (is_scalar($p))
				return $this->get_invalid_data_error('The body should be: {items: WooProduct[]} with at least 1 object inside');

			if (!$p['type'])
				return $this->get_invalid_data_error('Each WooProduct given should have a "type" property with value: "simple"|"variable"');

			// we remove the type as the function WC_Product->set_type does not exist;
			$prod_type = $p['type'];
			unset($p['type']);

			// create product with the given values
			if ($prod_type === 'simple') {
				// try to open a with a given id
				// if there is an error because the item was permanently deleted or some other stuff
				// we create a new product
				try { $product_class = new WC_Product_Simple(isset($p['id']) ? $p['id'] : 0); }
				catch (Throwable $e) { $product_class = new WC_Product_Simple(); }

				// if id is different
				// then restore the stock by adding the fields to the json object
				// this way they are managed in the json_to_properties function
				if (isset($p['id']))
					if ($product_class->get_id() !== $p['id'])
						foreach ($p['current_stock'] as $key => $val)
							$p[$key] = $val;

				// remove the id as to later not do set_id();
				unset($p['id']);

				$error = $this->json_to_properties($product_class, $p);
				if ($error) 
					return $error;
			}
			// create variations data
			else if ($prod_type === 'variable') {
				// same as above
				try { $product_class = new WC_Product_Variable(isset($p['id']) ? $p['id'] : 0); }
				catch (Throwable $e) { $product_class = new WC_Product_Variable(); }

				// store the variable and remove it so it can be checked later that it is the same
				// of the parent_id of the variable, ths is for forcedMapping
				$variable_parent_id = isset($p['id']) ? $p['id'] : null;
				
				// map attribute to a attribute class
				if (!$p['attributes'])
					return $this->get_invalid_data_error('Variable product requires attributes field');
				
				$attrs = [];
				foreach ($p['attributes'] as $a) {
					$att_class = new WC_Product_Attribute();
					// add default enable variation
					$a['visible'] = isset($a['visible']) ? $a['visible'] : true;
					$a['variation'] = isset($a['variation']) ? $a['variation'] : true;

					$error = $this->json_to_properties($att_class, $a);
					if ($error) 
						return $error;

					$attrs[] = $att_class;
				}
				$p['attributes'] = $attrs;
				

				
				// map variations
				if (!$p['variations'] || is_scalar($p['variations'][0]))
					return $this->get_invalid_data_error('Variable product requires variations field containing an array of product objects to create');

				/**
				 * @var WC_Product_Variation[] 
				 */
				$variations_to_create = []; 
				foreach ($p['variations'] as $v) {
					if (!is_array($v['attributes']))
						return $this->get_invalid_data_error('A variation of a product should contain the attributes array with the attributes to create');

					// lowercase attribute name and hashmap them
					$attributes_hashmap = [];
					foreach ($v['attributes'] as $att) {
						if (is_scalar($att) || !isset($att['name']) || !isset($att['option']))
							return $this->get_invalid_data_error('The attributes of a product variation should be Array<{name: string, option: string}>');

						$attributes_hashmap[strtolower($att['name'])] = $att['option'];
					}

					// we convert to hashmap as the product_variation class
					// works like that with WC_Product_Variation()->set_attributes();
					$v['attributes'] = $attributes_hashmap;

					// same as above
					try { $var_class = new WC_Product_Variation(isset($v['id']) ? $v['id'] : 0); }
					catch (Throwable $e) { $var_class = new WC_Product_Variation(); }

					// if an existing variant has been taken
					if (isset($v['id']) && $var_class->get_id()) {

						// if the parent_id of this variant is different from the passed parent_id
						// then we just create a new variation product instead
						//
						// this is because on forcedMapping, a wrong id variation id could be given,
						// thus modifying a wrong variation
						//
						// also we check if the variation is "active" as it is not restored :/
						if (in_array($var_class->get_status(), $invalid_status_cache) || $var_class->get_parent_id() !== $variable_parent_id)
							$var_class = new WC_Product_Variation();
						// // check if it was deleted or in draft, and we restore it
						// else if (in_array($var_class->get_status(), $invalid_status_cache))
						// 	$var_class->set_status('publish');
					}

					// if id is different
					// then restore the stock by adding the fields to the json object
					// this way they are managed in the json_to_properties function
					if (isset($v['id']))
						if ($var_class->get_id() !== $v['id'])
							foreach ($v['current_stock'] as $key => $val)
								$v[$key] = $val;

					unset($v['id']);
					$error = $this->json_to_properties($var_class, $v);
					if ($error) 
						return $error;

					// $this->fix_common_product_fields($var_class);
					$variations_to_create[] = $var_class;
				}


				// we remove the custom schema field
				// we remap the json properties
				// and then we reassing the variation back so they can be later saved
				unset($p['variations']);
				unset($p['id']);

				$error = $this->json_to_properties($product_class, $p);
				if ($error) 
					return $error;
				
				$product_class->{WooProducts::$PRODUCT_VARIATIONS_TEMP_FIELD} = $variations_to_create;
			}
			
			// $this->fix_common_product_fields($product_class);
			$all_built_products[] = $product_class;
		}

		return $all_built_products;
	}

	/**
	 * Prevents emission if a flag is set to true
	 */
	public function on_crud_action($id, $additional_body = []) {
		// we prevent emission only if the current crud type is a product
		// this is because this class is extended by the WooProductAmount
		// which emits through this function
		// so to be sure we don't block those emission, we check the crud type
		if (WooProducts::$PREVENT_CRUD_EMISSION && $this->get_crud_type() === Enum_WooPostTypes::crud_product)
			return;

		parent::on_crud_action($id, $additional_body);
	}

	/**
	 * saves/updates the product classes and returns the data of the saved items
	 * @param WC_Product[] $all_built_products the product classes to save/update
	 */
	private function execute_product_classes_save($all_built_products) {
		/**
		 * Contains the varitions of a variant product
		 * it is stored here so in case of error they can be deleted
		 * @var WC_Product[]
		 */
		$variation_classes = [];
	
		/**
		 * // TODO add images info so we can update the images status also as they are sent separetly
		 * Hashmap
		 * { [id: string]: {
		 * 		meta_data: []
		 * 		variations?: {[id: string]: {meta_data: []}}
		 * } }
		 */
		$ids = [];

		/** 
		 * Store the classes of products that are created only not updated
		 * @var WC_Product[]
		 */
		$only_created = [];

		// save
		foreach ($all_built_products as $p) {
			
			// store the items that will be created
			$product_to_create = boolval($p->get_id());
			if ($product_to_create)
				$only_created[] = $p;

			// try to save and return the id
			$maybe_id = $this->execute_safe_product_save($p);
			
			// if we error in saving the items then we delete the created products only
			// as to keep this function quasi-idempotent
			// thus allowing safely to re-run the request and not create additional products
			if (!$maybe_id)
				return $this->delete_on_creation_error($only_created);
			
			$ids[$maybe_id] = [
				'meta_data' => $p->get_meta_data(),
			];
			
			// in case the product has variations save them
			if (property_exists($p, WooProducts::$PRODUCT_VARIATIONS_TEMP_FIELD)) {
				
				$ids[$maybe_id]['variations'] = [];
				
				// we store the created variations ids as to not delete them later
				$created_variation_ids = [];

				/** @var WC_Product_Variation[] */
				$variations = $p->{WooProducts::$PRODUCT_VARIATIONS_TEMP_FIELD};
				foreach ($variations as $v) {

					// store the items that will be created
					$product_to_create = boolval($v->get_id());
					if ($product_to_create)
						$only_created[] = $v;

					$variation_classes[] = $v;

					$v->set_parent_id($maybe_id);
					$maybe_id_v = $this->execute_safe_product_save($v);
					
					// same "quasi-idempotent" request logic
					if (!$maybe_id_v)
						return $this->delete_on_creation_error($only_created);

					$created_variation_ids[] = $maybe_id_v;
					$ids[$maybe_id]['variations'][$maybe_id_v] = [
						'meta_data' => $v->get_meta_data(),
					];
				}

				// once we created/update all the ids, we remove the excess ones
				// we remove AFTER as to not add excess meta_data about trashed tiems
				$childs_ids = $p->get_children();
				foreach($childs_ids as $id) {
					if (!in_array($id, $created_variation_ids)) {
						$pvc = new WC_Product_Variation($id);
						$pvc->delete();
					}
				}

			}

		}

		return $ids;
	}

	/**
	 * Set the name as the first value and then other values
	 * this is to ensure that the SKU is appended correctly to the name in case it is being used
	 * @param WC_Product $class
	 */
	protected function json_to_properties(&$class, $data) {
		// set the name first
		if (isset($data['name'])) {
			$maybe_error = $this->json_single_property($class, $data['name'], 'name');
			
			if (is_wp_error($maybe_error))
				return $maybe_error;
		}

		// unset the key as to not re-set the name once again removing the appended sku
		// we can safely unset here as $data is passed as a copy and not a ref
		unset($data['name']);

		// then other properties
		return parent::json_to_properties($class, $data);
	}

	/**
	 * checks the images url to set, and then cheks the current database for those urls, if present then it will set those ids as gallery ids
	 * else will upload the image
	 * @param WC_Product $class
	 * @return WP_Error
	 */
	protected function json_single_property(&$class, $k_value, $k) {

		//
		// ignore
		//
		if ($k === 'current_stock') {

		}
		//
		// images
		//
		else if ($k === 'images') {
			$fact = new WooProductsFactory();
			// do not return the result (in case it's WP_Error)
			// as the excpetion can be throw when invalid url is passed etc
			// the user will fix the image manually
			$fact->set_product_images($class, $k_value);
		}
		//
		// sku
		//
		else if ($k === 'sku') {
			$sku_prod_id = wc_get_product_id_by_sku($k_value);
			// if the id is 0 (aka no product associated) (or the sku already is part of the class)
			// then the sku is not used so we can set it
			if ($sku_prod_id === 0 || $class->get_id() === $sku_prod_id)
				$class->set_sku($k_value);
			// else to not lose it we add it to the name
			else 
				$class->set_name($class->get_name().' ['.$k_value.']');
		}
		//
		// tags
		//
		else if ($k === 'create_tags') {

			// class is not a valid WC_Product
			if (!method_exists($class, 'set_tag_ids'))
				return;

			if (!function_exists('wp_create_term'))
				require_once(ABSPATH . 'wp-admin/includes/taxonomy.php');

			$ids = [];

			// generate tags from the tags name
			foreach ($k_value as $tag) {
				$maybe_inserted = wp_create_term($tag, Enum_WooPostTypes::post_product_tag);
				if (is_wp_error($maybe_inserted))
					return $maybe_inserted;
				
				$ids[] = intval(strval($maybe_inserted['term_id']));
			}

			// update the tags name
			$class->set_tag_ids($ids);
		}
		//
		// default
		//
		else {
			return parent::json_single_property($class, $k_value, $k);
		}
	}

}

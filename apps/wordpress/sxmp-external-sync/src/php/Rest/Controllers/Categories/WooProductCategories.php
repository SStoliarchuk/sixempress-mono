<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\Categories;

use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_WooPostTypes;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractWooController;
use SIXEMPRESS\ExternalSync\Utils\VariousUtils;
use WP_Error;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

class WooProductCategories extends AbstractWooController {

	public function get_rest_name_type() { return Enum_RestEndpoints::product_categories; }

	public function get_crud_type() { return Enum_WooPostTypes::crud_product_category; }

	public function get_post_type() { return Enum_WooPostTypes::post_product_category; }

	/**
	 * categories uses the default {action}_{taxonomy} hook of wordpress
	 * https://wpseek.com/hook/create_taxonomy/
	 */
	public function get_crud_hooks_action_names() {
		$type = $this->get_crud_type();
		$ret = ['create_'.$type, 'edited_'.$type, 'delete_'.$type];
		return $ret;
	}
	
	public function rest_create(WP_REST_Request $req) {
		
		$data = $req->get_json_params();
		if (!isset($data['items']) && !isset($data['delete']))
			return $this->get_invalid_data_error('The body should be: {items?: WooProductCategory[], delete?: number[]} with at least 1 object inside');
		
		//
		// create/update
		// 
		if (isset($data['items']) && $data['items']) {
			// validate body
			$items = $this->generatePostBodyTerms($data['items']);
			if (is_wp_error($items)) return $items;

			$tor = [];
	
			foreach ($items as $i) {
				// term data
				$data = [
					'slug' => $i['slug'],
					'name' => $i['name'],
				];
				if (isset($i['parent']))
					$data['parent'] = $i['parent'];

				if (isset($i['__extends']))
					$data['parent'] = $tor[$i['__extends']];
				
				$update_item = isset($i['id']) && get_term_by('id', $i['id'], $this->get_crud_type());
				// update or save the term
				$saved = $update_item
					? wp_update_term($i['id'], $this->get_crud_type(), $data)
					: wp_insert_term($i['name'], $this->get_crud_type(), $data);

				if (is_wp_error($saved))
					return $this->delete_on_creation_error($tor, $saved);
	
				$tor[$i['__id']] = $saved['term_id'];
			}
		}

		//
		// delete
		//
		if (isset($data['delete'])) {
			foreach ($data['delete'] as $id) {
				if (!is_int($id))
					return $this->get_invalid_data_error('Passed non int id to delete function');

				$e = wp_delete_term($id, $this->get_crud_type());

				if (is_wp_error($e))
					return $e;
			}
		}

		return ['items' => isset($tor) ? $tor : [], 'delete' => isset($data['delete']) ? $data['delete'] : []];
	}

	/**
	 * Validates the POST body and returns the terms object to insert
	 * @param Array $items
	 * @return Array [{name: string, parent: number, slug: string}]
	 */
	private function generatePostBodyTerms($items) {
		$tor = [];

		$stored_terms = get_terms([
			'taxonomy' => $this->get_crud_type(),
			'hide_empty' => false,
		]);

		foreach ($items as $i) {
			// ensure name is present
			if (!isset($i['name']) || !is_string($i['name']) || strlen($i['name']) < 1)
				return $this->get_invalid_data_error('Property "name" should be a string of at least 1 char');

			if (!isset($i['__id']) || !is_string($i['__id']))
				return $this->get_invalid_data_error('Property "__id" should be a the ObjectId string of the item in the system db');

			if (isset($i['__extends']) && !is_string($i['__extends']))
				return $this->get_invalid_data_error('Property "__extends" should be a the ObjectId string of the item in the system db');

			// ensure id is correct
			if (isset($i['id']) && !is_int($i['id']))
				return $this->get_invalid_data_error('Property "id" should be a number');

			// ensure parent is valid
			if (isset($i['parent'])) {
				if (!is_int($i['parent']))
					return $this->get_invalid_data_error('Property "parent" should be a number');

				// ensure parent exists
				$parent_present = VariousUtils::array_includes( $stored_terms, function($stored) use($i) { 
					return $stored->term_id === $i['parent'];
				});

				// if no parent and no __extends auto logic
				if (!$parent_present && !isset($i['__extends']))
					return $this->get_invalid_data_error('Property "parent" refers to a non existent term id and no "__extends" id set');
			}
		
			//
			// now that everything is verified we add it to the return array
			//
		
			$add = [
				'__id' => $i['__id'],
				'name' => $i['name'],
				'slug' => $this->get_non_conflicting_slug($stored_terms, $tor, $i),
			];
			if (isset($i['id'])) 
				$add['id'] = $i['id'];
			
			if (isset($i['parent'])) 
				$add['parent'] = $i['parent'];

			if (isset($i['__extends'])) 
				$add['__extends'] = $i['__extends'];

			$tor[] = $add;
		}

		return $tor;
	}

	/**
	 * Creates a slug taht doesnt collide with the other slugs
	 * @param ProductCategoryTerms[] $stored_terms the product_cat terms stored in the db
	 * @param mixed[] $already_built_cats the categories that are currently being built, this way we can ensure no same cat is generated for two equal names on array build
	 * @param mixed $i The object to create/update in db
	 */
	private function get_non_conflicting_slug($stored_terms, $already_built_cats, $i) {

		// start with new slugs
		$slug = $this->normalize_slug($i['name']);
		
		// use manually given slug in case the user wants to change it
		if (isset($i['slug'])) {
			$slug = $i['slug'];
		}
		// ELSE use old slug
		else if (isset($i['id'])) {
			$relative = VariousUtils::array_find($stored_terms, function($stored) use($i) {
				return $stored->term_id === $i['id'];
			});

			if ($relative)
				$slug = $relative->slug;
		}

		$resolved_slug = $slug;
		
		// we check if we should validate the slug or not
		// we do it on category creation OR if the original slug has changed
		$validate_slug = !isset($i['id']) || !VariousUtils::array_includes( $stored_terms, function($stored) use($resolved_slug, $i) { 
			return $stored->term_id === $i['id'] && $this->are_slugs_equal($stored->slug, $resolved_slug);
		});

		// perform the slug validation
		if ($validate_slug) {
			$iteration_count = 0;
			
			while (true) {
				$slug_conflict = 
					VariousUtils::array_includes( $stored_terms, function($stored) use($resolved_slug) { 
						return $this->are_slugs_equal($stored->slug, $resolved_slug);
					}) || 
					VariousUtils::array_includes( $already_built_cats, function($already_built) use($resolved_slug) { 
						return $this->are_slugs_equal($already_built['slug'], $resolved_slug);
					});
				
				if (!$slug_conflict)
					break;

				// increase slug count to ensure that the 
				$iteration_count++;
				$resolved_slug = $slug . $iteration_count;
			}
		}

		return $resolved_slug;
	}

	/**
	 * Trasforms the name of a category into a slug usable in the URL, thus withouth special chars
	 */
	private function normalize_slug(string $name) {
		return strtolower(preg_replace('/[^a-z0-9_-]/i', '_', trim($name)));
	}

	/**
	 * As slugs can be lowercase/uppercase, here we check them with strtolower
	 */
	private function are_slugs_equal(string $slug1, string $slug2) {
		return strtolower($this->normalize_slug($slug1)) === strtolower($this->normalize_slug($slug2));
	}

	/**
	 * Deletes all given products so the errored POST can be repeated
	 * @param number[] $items
	 */
	protected function delete_on_creation_error($items, WP_Error $err = null) {
		foreach ($items as $i)
			wp_delete_term($i, $this->get_crud_type());

		if ($err)
			return $err;

		return new WP_Error('Internal save error', 'WooCommerce has errored during the creation of the items: '. $this->get_crud_type(), ['status' => 500]);
	}


}

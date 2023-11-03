<?php

namespace SIXEMPRESS\ExternalSync\Rest\Controllers\RawFiles;

use Error;
use SIXEMPRESS\ExternalSync\Rest\Controllers\AbstractController;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_ErrorCodes;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_RestEndpoints;
use Throwable;
use WP_Error;
use WP_Query;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;


class RawFiles extends AbstractController {

	public const META_HASH_KEY = 'sxmp_file_hash';

	public function get_rest_name_type() { return Enum_RestEndpoints::rawfiles; }

	/**
	 * Executed on rest readable request
	 */
	public function rest_read(WP_REST_Request $req) {

		// create query parameters
		$params = $req->get_query_params();
		$query_images_args = [
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',

			'posts_per_page' => isset($params['limit']) ? $params['limit'] : 10,
			'offset' => isset($params['skip']) ? $params['skip'] : 0,
			'orderby'   => array(
				'date' => 'DESC',
			),
		];
		if (isset($params['mime_type']))
			$query_images_args['post_mime_type'] = $params['mime_type'];


		// set the total header
		$total_count_args = $query_images_args;
		$total_count_args['posts_per_page'] = -1;
		$total_count_args['offset'] = 0;
		
		$total_query = new WP_Query( $total_count_args );
		header("X-WP-Total: $total_query->post_count");
		


		// return the queried images
		$query_images = new WP_Query( $query_images_args );
		return array_map(function ($image) {
			return [
				'id' => $image->ID,
				'url' => wp_get_attachment_url( $image->ID ),
				'name' => get_the_title($image),
				'guid' => $image->guid,
				'mime_type' => get_post_mime_type($image),
				'meta_data' => get_post_meta($image->ID),
			];
		}, $query_images->posts);
	}

	/**
	 * Executed on rest creatable request
	 */
	public function rest_create(WP_REST_Request $req) {
		$files = $this->normalize_upload_file_array($req->get_file_params());
		if (is_wp_error($files))
			return $files;

		// try catch as we're executing low level operations
		try {
			$processed_data = [];
			foreach ($files as $k => $v)
				$processed_data[$k] = RawFiles::transfer_files_to_storage($v);
			return $processed_data;
		} 
		catch (Throwable $e) {
			return new WP_Error(400, $e->getMessage());
		}
	}

	/**
	 * Executed on rest deletable request
	 */
	public function rest_delete(WP_REST_Request $req) {
		$body = $req->get_json_params();
		if (!$body || !isset($body['ids']) || !is_array($body['ids']))
			return $this->get_invalid_data_error('The Body should be {ids: number[]}');

		foreach ($body['ids'] as $id) 
			wp_delete_post(intval($id));

		return;
	}


	/**
	 * checks if all files have been successfuly uploaded, and transforms it into a normal array
	 */
	private function normalize_upload_file_array($files) {
		// ensure at least 1 key is present
		if (!$files)
			return $this->get_invalid_data_error('No File present in request, fields supported: "images" | "others"');
		

		$ks = array_keys($files);
		$peasants_arrays = [];
		$errored_file_names = [];

		// transform arrayd
		foreach ($ks as $k) {
			// ensure only these fields are supported
			if ($k !== 'images' && $k !== 'others')
				return $this->get_invalid_data_error('Field "'.$k.'" not supported. fields supported: "images" | "others"');


			$arr = $this->fix_files_array($files[$k]);
			$peasants_arrays[$k] = [];

			foreach ($arr as &$a) {
				if ($a['error'])
					$errored_file_names[] = $a['name'];
				
				$peasants_arrays[$k][] = $a;
			}
			break;
		}

		if ($errored_file_names) 
			return $this->get_invalid_data_error('Some files were not successfully uploaded', ['code' => Enum_ErrorCodes::error_file_upload, 'data' => ['names' => $errored_file_names]]);
		
		return $peasants_arrays;
	}

	/**
	 * Takes the files from request and sets them in disk
	 */
	private static function transfer_files_to_storage(&$files_array) {
		// for images and videos
		require_once( ABSPATH . 'wp-admin/includes/image.php' );
		require_once( ABSPATH . 'wp-admin/includes/media.php' );

		$urls = [];
		foreach ($files_array as &$file_obj) {

			// prepare the file
			$data = RawFiles::prepare_file_to_save($file_obj);

			// check if the hash already exist and retunr that post
			$already_existing = RawFiles::find_by_hash($data['hash']);
			if ($already_existing) {
				$urls[] = [
					'id' => $already_existing->ID,
					'url' => wp_get_attachment_url( $already_existing->ID ),
					'name' => get_the_title($already_existing),
					'mime_type' => get_post_mime_type($already_existing),
				];
				continue;
			}

			// move all to permanent save
			$urls[] = RawFiles::move_save_file_to_permanent($data, $file_obj['name']);
		}

		return $urls;
	}

	/**
	 * Sets proper configurations of the file, like extension etc..
	 * and return some info about the file
	 */
	private static function prepare_file_to_save(&$file_obj) {
		// basic info
		$image_data = file_get_contents($file_obj['tmp_name']);
		$hash = md5($image_data);
		
		// update mime
		$mime = finfo_file(finfo_open(FILEINFO_MIME_TYPE), $file_obj['tmp_name']);
		$allowed = get_allowed_mime_types();

		foreach ( $allowed as $ext_preg => $mime_match ) {
			if ($mime == $mime_match) {
				if (!preg_match('\.'.$ext_preg.'$!i', $file_obj['name'])) {
					$file_obj['name'] = $file_obj['name'].'.'.(explode('|', $ext_preg))[0];
					break;
				}
			}
		}

		return ['hash' => $hash, 'mime' => $mime, 'content' => $image_data];
	}

	/**
	 * Stores the content in db and updates the meta making it permanent
	 */
	private static function move_save_file_to_permanent(&$data, $desired_name) {

		$filename = rand(10000000, 99999999) . "--" . sanitize_file_name($desired_name);
		$upload_dir = wp_upload_dir();

		// uploads/year/month
		if (wp_mkdir_p($upload_dir['path'])) {
			$file_url = $upload_dir['url'] . '/' . $filename;
			$file = $upload_dir['path'] . '/' . $filename;
		}
		// uploads/
		else {
			$file_url = $upload_dir['baseurl'] . '/' . $filename;
			$file = $upload_dir['basedir'] . '/' . $filename;
		}

		// tansfer
		file_put_contents($file, $data['content']);

		// create thumnail and other stuff
		$attachment = [
			'post_mime_type' => $data['mime'],
			'post_title' => $desired_name,
			'post_content' => '',
			'post_status' => 'inherit'
		];
		$attach_id = wp_insert_attachment($attachment, $file);
		$attach_data = wp_generate_attachment_metadata($attach_id, $file);
		wp_update_attachment_metadata($attach_id, $attach_data);

		// add the hash of the file so we avoid creating duplicates
		update_post_meta($attach_id, RawFiles::META_HASH_KEY, $data['hash']);

		return [
			'id' => $attach_id,
			'url' => $file_url,
			'name' => $desired_name,
			'mime_type' => $data['mime'],
		];
		
	}

	/**
	 * Transforms the $_FILES holy array format, into a peasants array
	 */
	private function fix_files_array(&$file_post) {
    $is_array = is_array($file_post['name']);
    $count = $is_array ? count($file_post['name']) : 1;
    $file_keys = array_keys($file_post);

    $file_ary = [];
    for ($i = 0; $i < $count; $i++) {
			foreach ($file_keys as $key) {
				if($is_array) {
					$file_ary[$i][$key] = $file_post[$key][$i];
				} else {
					$file_ary[$i][$key] = $file_post[$key];
				}
			}
		}

    return $file_ary;
	}
	
	/**
	 * finds an attachment by it's hash
	 */
	private static function find_by_hash($hash) {
		// https://wordpress.stackexchange.com/questions/181546/getting-attachments-by-meta-value
		$posts = get_posts([
			'post_type'   => 'attachment',
			'post_status' => 'inherit',
			'numberposts' => 1,
			'meta_query'  => [[
				'key'   => RawFiles::META_HASH_KEY,
				'value' => $hash
			]]
		]);
		if (count($posts) === 0)
			return false;

		return $posts[0];
	}

	/**
	 * Upload only 1 file per REST request as it can take a lot of time
	 * @var string $name
	 * @var string $src
	 * @return int ID of the file
	 */
	public static function quick_file_upload($name, $src) {
		
		// check if the link is already uploaded
		$id = attachment_url_to_postid($src);
		if ($id)
			return $id;

		// else upload manually
		// https://developer.wordpress.org/reference/functions/download_url/
		$maybe_file = download_url($src);
		if (is_wp_error($maybe_file))
			throw new Error($maybe_file->get_error_message());
		
		$pass = [['tmp_name' => $maybe_file, 'name' => $name]];
		
		// try catch as to unlink the downloaded filed
		try {
			$uploaded = RawFiles::transfer_files_to_storage($pass);
			return $uploaded[0]['id'];
		} 
		catch (Throwable $e) {
			throw $e;
		} 
		finally {
			unlink($maybe_file);
		}
	}

}

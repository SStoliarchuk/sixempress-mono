<?php

namespace SIXEMPRESS\ExternalSync\Utils;

use Throwable;
use WP_Error;
use WP_REST_Request;

defined('ABSPATH') || exit;

class RequestUtils {

	/**
	 * Returns a query param filter after json_decode()
	 * @return null|mixed
	 */
	public static function get_json_query_param(WP_REST_Request $req, $param_name) {
		$val = $req->get_param($param_name);
		
		if (!$val)
			return null;

		// try to parse
		try {
			$val = json_decode($val, JSON_THROW_ON_ERROR);
		} catch (Throwable $e) {
			$val = null;
		}
		
		// not parsed successfully
		if (!$val)
			return null;
		
		return $val;
	}

	/**
	 * Gets the filter query paramter
	 * @param WP_REST_Request $req the request object of wordpress
	 * @param string $param_name optional name to use for the query parameter, instead of the default one "projection"
	 * @return null|WP_Rrror|mixed
	 */
	public static function get_query_param_filter(WP_REST_Request $req, $param_name = null) {
		$val = RequestUtils::get_json_query_param($req, $param_name ? $param_name : 'filter');
		return RequestUtils::validate_filter_object($val);
	}

	/**
	 * checks the query parameters to get the 'projection' paramter, and then validates it
	 * @param WP_REST_Request $req the request object of wordpress
	 * @param string $param_name optional name to use for the query parameter, instead of the default one "projection"
	 * @return null|WP_Rrror|mixed
	 */
	public static function get_query_param_projection(WP_REST_Request $req, $param_name = null) {
		$val = RequestUtils::get_json_query_param($req, $param_name ? $param_name : 'projection');
		return RequestUtils::validate_projection_object($val);
	}

	/**
	 * Validates the filter object
	 * @return null|filter|WP_Error
	 */
	public static function validate_filter_object($filter) {
		// no object
		if (!$filter)
			return null;

		// not an hashmap
		if (!is_array($filter))
			return new WP_Error( 'sxmpes_invalid_query_param', 'filter param should be a hashmap {[field]: any}', [ 'status' => 403 ]);

		// no proj count so we return null as there is nothing to project
		if (count($filter) === 0)
			return null;

		return $filter;
	}

	/**
	 * validates the projection object given in, and then returns it if valid
	 * @return null|WP_Rrror|mixed
	 */
	public static function validate_projection_object($projection) {
		// no object
		if (!$projection)
			return null;

		// not an hashmap
		if (!is_array($projection))
			return new WP_Error( 'sxmpes_invalid_query_param', 'projection param should be a hashmap {[field]: 1|0}', [ 'status' => 403 ]);

		// no proj count so we return null as there is nothing to project
		if (count($projection) === 0)
			return null;

		$type = MongoUtils::projection_type($projection);

		// as we know there is some length, null here means that the value of the keys are invalid, thus we trhow an error
		if (is_null($type))
			return new WP_Error( 'sxmpes_invalid_query_param', 'projection param should be a hashmap {[field]: 1|0}', [ 'status' => 403 ]);

		// check each key
		foreach ($projection as $k => $v) {
			// invalid projection value
			if ($v !== $type)
				return new WP_Error( 'sxmpes_invalid_query_param', 'projection cannot be mixed 1|0. Key "'.$k.': '.$v.'" is different from type: "'.$type.'"', [ 'status' => 403 ]);
			
			// deep property
			if (strpos($k, '.') !== false)
				return new WP_Error( 'sxmpes_invalid_query_param', 'projection field cannot contain a ".", only root fields are allowed', [ 'status' => 403 ]);
		}

		return $projection;
	}

}

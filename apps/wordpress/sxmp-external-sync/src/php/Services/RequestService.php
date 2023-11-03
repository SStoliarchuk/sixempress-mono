<?php

namespace SIXEMPRESS\ExternalSync\Services;

use SIXEMPRESS\ExternalSync\Services\AuthService;
use SIXEMPRESS\ExternalSync\Utils\Enums\Enum_BePaths;
use Throwable;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Allows to make requests to the sixempress server
 */
class RequestService {
	
	public static $base_url = "https://app.sixempress.com/";
	public static $api_url = "https://app.sixempress.com/_api/";
	public static $default_module = "sixempress__external_sync";

	/** 
	 * this exists to rewrite the api_url "localhost" to this ip address as we're inside a docker container 
	 */
	public static $dev_local_ip_addres = '';

	/**
	 * get api_url key options
	 */
	public static function __initialize() {
		$opts = get_option("sxmpes-options");
		if (isset($opts['api_url']))
			RequestService::$api_url = $opts['api_url'];
	}

	/**
	 * Generates the api_url to contact but changes localhost to an ip in case in dev mode
	 * @param string $type "api" | "control"
	 */
	private static function get_url($type) {
		if ($type === 'api')
			$base = RequestService::$api_url;

		if (ENV !== 'production' && isset(RequestService::$dev_local_ip_addres) && preg_match('/http:\/\/localhost/', $base))
			$base = str_replace('localhost', RequestService::$dev_local_ip_addres, $base);

		return $base;
	}

	/**
	 * Returns information to build api
	 */
	public static function get_api_key_info($login_slug, $username, $password) {
		$tokens = RequestService::get_authz_tokens($login_slug, $username, $password);
		if (is_wp_error($tokens))
			return ['success' => false, 'data' => $tokens];

		AuthService::$slug = $tokens['instanceId'];

		//
		// request the external connection creation
		//
		$curl = RequestService::api_request('POST', Enum_BePaths::ext_connection_request, [], [
			'body' => json_encode([ 'originUrl' => get_site_url() ]),
			'headers' => [ 'authorization' => $tokens['sxxs'] ],
			'module' => 'sixempress__multip_core',
			'cookies' => $tokens['cookies']
		]);
		if (is_wp_error($curl))
			return ['success' => false, 'data' => $curl];

		$body = $curl['body'];
		$status = wp_remote_retrieve_response_code($curl['res']);

		if (!$body)
			return ['success' => false, 'status' => $status];

		if ($status !== 200 && $status !== 201)
			return ['success' => false, 'status' => $status, 'data' => $body];
		
		// add the data to the response as to allow settings page to set them
		$body['apiUrl'] = RequestService::$api_url;
		$body['slug'] = AuthService::$slug;

		return ['success' => true, 'data' => $body];
	}

	/**
	 * Authenticates with sxxs and returns their tokens
	 */
	public static function get_authz_tokens($login_slug, $username, $password) {
		//
		// get sxxs info
		//
		$url = RequestService::get_url('api').Enum_BePaths::auth;
		$curl = RequestService::api_request('POST', '', [], [
			'url' => $url,
			'body' => json_encode([
				'instance' => [
					'type' => 'slug',
					'slug' => $login_slug,
				],
				'payload' => [
					'type' => 'default',
					'username' => $username,
					'password' => $password,
				]
			])
		]);
		
		if (is_wp_error($curl))
			return $curl;
		
		$cookies = wp_remote_retrieve_cookies($curl['res']);
		$sxxs_token = $curl['body']['authz'];
		$instance_id = json_decode(base64_decode(explode('.', $sxxs_token)[1]), true, 512, JSON_THROW_ON_ERROR)['instanceId'];

		return ['sxxs' => $sxxs_token, 'cookies' => $cookies, 'instanceId' => $instance_id];
	}

	/**
	 * Does a request to the main system api server
	 * @var string $method GET | POST
	 * @var string $path the path to contact to, for example: "repairs" "products"
	 * @var object $params a hashmap of params to pass (they will be automatically encoded if you pass objects)
	 * @var object $opts additional options
	 * @var object $opts.headers additional headers
	 * @return WP_Error|mixed
	 */
	private static function api_request($method, $path, $params = [], $opts = []) {

		$module = isset($opts['module']) ? $opts['module'] : RequestService::$default_module;
		$url = isset($opts['url']) ? $opts['url'] : RequestService::get_url('api')."m/".$module.'/'.$path."?" . http_build_query(RequestService::encode_params($params));
		$opts = is_scalar($opts) ? [] : $opts;
		
		if (!isset($opts['headers']))
			$opts['headers'] = [];
		
		// auth
		if (isset(AuthService::$api_key) && !isset($opts['headers']['authorization'])) {
			$opts['headers']['x-api-key'] = AuthService::$api_key;
			$opts['headers']['x-api-key-instance-id'] = AuthService::$slug;
		}
		
		// set default
		if (!isset($opts['headers']['Content-Type']))
			$opts['headers']['Content-Type'] = 'application/json';

		// send request
		$res = $method === 'POST' ? wp_remote_post($url, $opts) : wp_remote_get($url, $opts);
		if (is_wp_error($res))
			return $res; 

		$status_code = wp_remote_retrieve_response_code( $res );
		if ($status_code > 299 || $status_code < 200)
			return new WP_Error( 'Error status code', "Status code is: ".$status_code, $res );

		// get response if present
		$body = wp_remote_retrieve_body($res);
		// try to parse it
		if ($body) {
			try {
				$body = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
			} catch (Throwable $e) {}
		}

		return ['res' => $res, 'body' => $body];
	}

	/**
	 * Allows to send GET requests to the main system
	 * @var string $path the path to contact to, for example: "repairs" "products"
	 * @var object $params a hashmap of params to pass (they will be automatically encoded if you pass objects)
	 * @var object $opts additional options
	 * @var object $opts.headers additional headers
	 * @return WP_Error|mixed
	 */
	public static function api_get($path, $params = [], $opts = []) {
		$res = RequestService::api_request('GET', $path, $params, $opts);
		
		if (is_wp_error($res))
			return $res;

		if (isset($res['body']))
			return $res['body'];
	}

	/**
	 * Allows to send POST requests to the main system
	 * @var string $path the path to contact to, for example: "repairs" "products"
	 * @var object $params a hashmap of params to pass (they will be automatically encoded if you pass objects)
	 * @var object $opts additional options
	 * @var object $opts.headers additional headers
	 * @return WP_Error|mixed
	 */
	public static function api_post($path, $body = [], $params = [], $opts = []) {
		$opts['body'] = json_encode($body);
		$res = RequestService::api_request('POST', $path, $params, $opts);

		if (is_wp_error($res))
			return $res;

		if (isset($res['body']))
			return $res['body'];
	}

	/**
	 * json encodes the params
	 */
	public static function encode_params($params) {

		// remove if empty object/array
		if (isset($params['filter']) && !$params['filter']) {
			unset($params['filter']);
		}

		foreach ($params as $k => $v) {
			if (!is_scalar($v)) {
				$params[$k] = json_encode($v);
			}
		}
		return $params;
	}

	/**
	 * creates an $or query for mongo
	 */
	public static function create_or_query($fields, $value, $is_regex = false) {
		return [
			'$or' => array_map(function ($f) use ($value, $is_regex) {
				return ["$f" => $is_regex ? ['$regex' => $value, '$options' => 'i'] : $value ];
			}, $fields),
		];
	}

	/**
	 * tries to parse the body of a POST request, if it fails it throws an error for the user
	 * @param auto_answer answers automatically to the user request or else you handle it yourself
	 * @return mixed|false
	 */
	public static function get_request_json_body($auto_answer = true) {
		// parse body
		try {
			$data = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
			return $data;
		}
		catch (Throwable $e) {
			if (!$auto_answer) {
				return false;
			}
			else {
				http_response_code(403);
				echo 'Invalid POST body, must be a JSON object';
				wp_die();
				return false;
			}
		}
	}

}
<?php

namespace SIXEMPRESS\ExternalSync\Services;

defined( 'ABSPATH' ) || exit;

class UrlService {

	/**
	 * Returns the url get parameter searched for
	 * @param string $key the key of the param
	 * @param mixed $match "number" | RegExp\
	 * optional match to pass for the param value before return
	 * @param boolean $opts.decode default true\
	 */
	public static function get_url_parameter($key, $match = NULL, $opts = []) {

		if (!isset($_GET[$key]))
			return;
		
		// get value
		$v = $_GET[$key];
		if (isset($opts['decode']) && $opts['decode'] !== false)
			$v = urldecode($v);

		// ensure value is gud
		if (!$match) { 
			return $v; 
		}
		else if ($match == "number") {
			if (preg_match("/^[0-9]+$/", $v)) {
				return $v;
			}
		} 
		else if (preg_match($match, $v)) {
			return $v;
		}
	}

	/**
	 * Builds the complete own URL of the current page
	 * used for forms action
	 */
	public static function get_current_url($keep_query_params = false) {

		$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off' ? 'https' : 'http';
		$port = $_SERVER['SERVER_PORT'];

		return sprintf(
			"%s://%s%s%s",
			$protocol,
			$_SERVER['SERVER_NAME'],
			($protocol == 'http' && $port != 80) ? ":".$port : "",
			$keep_query_params ? $_SERVER['REQUEST_URI'] : explode('?', $_SERVER['REQUEST_URI'], 2)[0]
		);
	}

	/**
	 * Reads the $_GET parameters and creates hidden inputs for a form
	 * @param array $skip array of keys to skip
	 */
	public static function get_params_to_hidden_form_fields($skip = []) {
		$html = '';

		foreach ($_GET as $k => $v) {
			if (!in_array($k, $skip)) {
				$html .= ' <input type="hidden" name="'.$k.'" value="'.$v.'" />';
			}
		}

		return $html;
	}

	/**
	 * getallheaders() but actually working
	 */
	public static function get_headers() {
		// getallheaders() sometimes is not present
		// and when it's present it returns capitalized headers
		$headers = [];
		foreach ($_SERVER as $name => $value) {
			if (substr($name, 0, 5) == 'HTTP_') {
				$head_name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
				$headers[strtolower($head_name)] = $value;
			}
		}

		return $headers;

	}

	/**
	 * Returns a header value by checking the lowercased key
	 */
	public static function get_header($key) {
		$headers = UrlService::get_headers();
		return isset($headers[strtolower($key)]) ? strtolower($headers[strtolower($key)]) : '';
	}

}
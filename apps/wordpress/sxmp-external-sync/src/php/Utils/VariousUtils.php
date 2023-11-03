<?php

namespace SIXEMPRESS\ExternalSync\Utils;

defined('ABSPATH') || exit;

class VariousUtils {

	/**
	 * Checks if a string is an object id string
	 * @return boolean
	 */
	public static function is_object_id($str) {
		return preg_match('/^[abcdef0123456789]{24}$/', $str);
	}
	
	/**
	 * Finds the index of the element based on the given search function
	 * @param Array $arr the array to search in
	 * @param Function $fn The callback to execute when searching for the item
	 * @return number
	 */
	public static function array_index(Array &$arr, $fn) {
		for ($i = 0; $i < count($arr); $i++)
			if ($fn($arr[$i], $i, $arr))
				return $i;

		return -1;
	}

	/**
	 * Checks if the array contains the object or not
	 * @param Array $arr the array to search in
	 * @param Function $fn The callback to execute when searching for the item
	 * @return boolean
	 */
	public static function array_includes(Array &$arr, $fn) {
		return -1 !== VariousUtils::array_index($arr, $fn);
	}

	/**
	 * Find the item that returns true on the given function check
	 * @param Array $arr the array to search in
	 * @param Function $fn The callback to execute when searching for the item
	 * @return Mixed
	 */
	public static function array_find(Array &$arr, $fn) {
		for ($i = 0; $i < count($arr); $i++)
			if ($fn($arr[$i], $i, $arr))
				return $arr[$i];
	}

	/**
	 * As the has_shortcode function can be slow
	 * here we implement a custom one
	 */
	public static function has_se_shortcode(string $content, string $shortcode): bool {
		return strpos($content, $shortcode) !== false;
	}

}
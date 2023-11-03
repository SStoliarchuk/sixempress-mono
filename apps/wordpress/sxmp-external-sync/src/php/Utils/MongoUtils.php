<?php

namespace SIXEMPRESS\ExternalSync\Utils;

defined('ABSPATH') || exit;

class MongoUtils {

	/**
	 * Applies projection to an item
	 * @param mixed $item an object to cast (NOT AN STDCLASS)
	 * @param mixed $projection the projections to apply (mongodb style, but only works for top level fields)
	 */
	public static function project($item, $projection = []) {

		$type = MongoUtils::projection_type($projection);
		
		// invalid type, or empty object
		if (is_null($type))
			return $item;

		// negative projection, remove from $item
		if ($type === 0) {
			$ret = $item;

			foreach ($projection as $k => $v)
				unset($ret[$k]);
		}
		// positive projection, add to $ret from $item
		else {
			$ret = isset($item['id']) ? ['id' => $item['id']] : [];

			foreach ($projection as $k => $v)
				if (isset($item[$k]))
					$ret[$k] = $item[$k];
		}

		return $ret;
	}

	/**
	 * returns the projection type, if positive, negative or if invalid
	 * @return 1|0|null
	 */
	public static function projection_type($proj) {
		$v = $proj[array_key_first($proj)];
		
		if (is_null($v))
			return null;
			
		// TODO handle special case '_id' (id) 
		// i don't think we need it

		if ($v === 0)
			return 0;
		else if ($v === 1)
			return 1;
		else 
			return null;
	}

}

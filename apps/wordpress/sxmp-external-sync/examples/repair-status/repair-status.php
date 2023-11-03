<?php
use SIXEMPRESS\ExternalSync\Services\UrlService;

// to access safely the query string instead of using $_GET[]l
add_filter( 'query_vars', function ( $qvars ) {
	$qvars[] = 'id';
	return $qvars;
} );

add_action('init', function() {
	register_block_type(
		'sxmpes/repair-status',
		[
			'editor_script' => 'sxmpes-block-js',
			'style'         => 'sxmpes-style-css',
			'editor_style'  => 'sxmpes-block-editor-css',
			'render_callback' => 'sxmpes_repair_status_render_callback',
		]
	);
});

function sxmpes_repair_status_render_callback($block_attributes, $content, $block_info) {
	// $search_id = isset($_GET["id"]) ? $_GET["id"] : "";
	$search_id = get_query_var("id");


	if (ENV === "production") {
		if ($search_id && !preg_match('/^[a-f0-9]+$/i', $search_id)) {
			$search_id = "";
		}
	} else {
		if ($search_id && !preg_match('/^[0-9]+$/i', $search_id)) {
			$search_id = "";
		}
	}

	$html = '';
	$html .= '<div>';
		$html .= '<form role="search" class="search-form" method="GET" action="'.UrlService::get_current_url().'">';
			$html .= UrlService::get_params_to_hidden_form_fields(["id"]);
			$html .= '<input type="search" class="search-field" name="id" value="'.$search_id.'"/>';
			$html .= '<button type="submit" class="search-submit">Cerca</button>';
		$html .= '</form>';
	$html .= '</div>';
	$html .= '<div>';
		$html .= $search_id ? sxmpes_repair_status_repair_html($search_id) : 'Cerca con il codice';
	$html .= '</div>';

	return $html;
}


function sxmpes_repair_status_repair_html($search_id) {
	$url = "https://my.sixempress.com/be-server-api-path/5/gpoint_20190723/repairs?" . http_build_query([
		"limit" => 1,
		"filter" => json_encode(["_progCode" => intval($search_id)]),
	]);
	$args = [ 'headers' => [ 
		"X-Api-Key" => "5f421d5f7c33315e105c46a1" 
	] ];
	$res = wp_remote_get($url, $args);
	$body = wp_remote_retrieve_body($res);

	if (!$body) {
		return "No Results";
	}
	$decoded = json_decode($body);
	if (count($decoded) === 0) {
		return "No Results";
	}
	
	$body = $decoded[0];
	return "Prodotto: ".$body->model;
}
<?php

use SIXEMPRESS\ExternalSync\Services\RequestService;
use SIXEMPRESS\ExternalSync\Services\UrlService;
use SIXEMPRESS\ExternalSync\Utils\VariousUtils;

defined( 'ABSPATH' ) || exit;

// style
add_action( 'wp_enqueue_scripts', 'sxmpes_scfn_repair_status_style' );
function sxmpes_scfn_repair_status_style() {
	if (is_page()) {
		global $post; 
		if (VariousUtils::has_se_shortcode($post->post_content, 'sxmpes_sc_repair-status')) {
			wp_enqueue_style( 'sxmpes-scfn-repair-status-css' );
		}
	}
}

// register
add_action("init", function() {
	add_shortcode('sxmpes_sc_repair-status', 'sxmpes_scfn_repair_status'); 
	
	$asset_file = include(plugin_dir_path(__FILE__) . 'style.asset.php');

	wp_register_style(
		'sxmpes-scfn-repair-status-css',
		plugins_url('style.css', __FILE__),
		$asset_file['dependencies'],
		$asset_file['version'],
	);
});

/**
 * Checks for a page in the system that contains our custom repair-status block
 * and then returns the url to that page with the queried val
 */
add_filter('sxmpes_wpredirects_destination_url', 'sxmpes_scfn_redirect_repair', 10, 4);
function sxmpes_scfn_redirect_repair($url, $type, $val, $req) {
	
	if ($type === 2 || $type === 'r2') {
		$all_pages = get_pages();
		foreach ($all_pages as $page) {
			if (VariousUtils::has_se_shortcode($page->post_content, 'sxmpes_sc_repair-status')) {
				$link = get_page_link($page);
				// add query val
				$query_add_char = strpos($link, '?') === false ? '?' : '&';
				$url = $link.$query_add_char."repair_status_id=".$val;
			}
		}
	}

	return $url;
}


// logic
function sxmpes_scfn_repair_status() {

	$search_id = UrlService::get_url_parameter("repair_status_id");
	$repair = null;
	if ($search_id) {
		$repair = RequestService::api_get('repairs/extconn/', ["value" => $search_id], ['module' => 'sixempress__repairs']);
		if (!$repair || is_wp_error($repair))
			$repair	= false;
		else {
			// $repair['code']
			// $repair['customer']
			// $repair['enterDate']
			// $repair['exitDate']
			// $repair['delivered']
			// $repair['noticeStatus']
			// $repair['status']
			// $repair['deviceType']
			// $repair['model']
			// $repair['color']
			// $repair['defects']
			// $repair['visibleDefects']
			// $repair['diagnostic']
			// $repair['report']
			// $repair['price']
			
			if (!isset($repair['visibleDefects']))
				$repair['visibleDefects'] = '';

			if (!isset($repair['diagnostic']))
				$repair['diagnostic'] = '';

			if (!isset($repair['report']))
				$repair['report'] = '';

			$repair['price'] = number_format($repair['price'] / 100, 2);

			$repair['enterDate'] = get_date_from_gmt( date( 'Y-m-d H:i', $repair['enterDate'] ), 'F j, Y H:i' );
			
			$repair['exitDate'] = isset($repair['exitDate']) 
				? get_date_from_gmt( date( 'Y-m-d H:i', $repair['exitDate'] ), 'F j, Y H:i' ) 
				: '';
				

			$DeviceTypeLabel = [
				1 => 'Smartphone',
				2 => 'PC Fisso',
				3 => 'Notebook',
				4 => 'Tablet',
				5 => 'Altro',
			];
			$repair['deviceType'] = $DeviceTypeLabel[$repair['deviceType']];

			$RepairStateLabel = [
				1 => 'Entrata',
				2 => 'Lavorazione',
				3 => 'Attesa Cliente',
				4 => 'Uscita Riparati',
				5 => 'Uscita Non Riparati',
				6 => 'Attesa Ricambi',
			];
			$repair['_status'] = $repair['status'];
			$repair['status'] = $RepairStateLabel[$repair['status']];

			$CustomerNoticeLabel = [
				1 => 'Da chiamare',
				2 => 'Chiamato',
				3 => 'Chiamato non risponde',
				4 => 'Cliente non raggiungibile',
				5 => 'Contattato diversamente',
			];
			$repair['noticeStatus'] = isset($repair['noticeStatus']) ? $CustomerNoticeLabel[$repair['noticeStatus']] : '';
		}
	}

	$html = '<div class="sxmpes" data-sxmpes-sc="sxmpes/repair-status">';
	
	// opened the page empty
	if ($repair === null) {
		$img_src = plugin_dir_path(__FILE__).'scan.svg';
		$html .= '<div class="sxmpes-repair-scan-svg-container">';
		$html .= file_get_contents($img_src);
		$html .= '</div>';
	}
	// there was an errore during repair get
	else if ($repair === false || is_wp_error($repair)) {
		$html .= 'Errore controllo stato riparazione, riprova nuovamente';
	}
	// the repair is preset
	else if ($repair) {

		// main state title
		$html .= '<div class="sxmpes-repair-status-head sxmpes-repair-status-'.$repair['_status'].'">';
		$html .= '<h3>Stato Attuale: <span>'.$repair['status'].'</span></h3>';
		$html .= '</div>';

		// detail table
		$html .= '<table class="sxmpes-repair-status-table">';
		$html .= '<tr><th>Codice Riparazione </th><td>'.$repair['code'].'</td></tr>';
		$html .= '<tr><th>Cliente            </th><td>'.$repair['customer'].'</td></tr>';
		$html .= '<tr><th>Dispositivo        </th><td>'.$repair['deviceType'].' '.$repair['model'].' '.$repair['color'].'</td></tr>';
		$html .= '<tr><th>Entrata            </th><td>'.$repair['enterDate'].'</td></tr>';
		if ($repair['exitDate'])
			$html .= '<tr><th>Consegnato       </th><td>'.$repair['exitDate'].'</td></tr>';
		$html .= '<tr><th>                   </th><td></td></tr>';

		$html .= '<tr><th>Difetti            </th><td>'.nl2br($repair['defects']).'</td></tr>';
		$html .= '<tr><th>Difetti Visibili   </th><td>'.nl2br($repair['visibleDefects']).'</td></tr>';
		$html .= '<tr><th>                   </th><td></td></tr>';

		$html .= '<tr><th>Stato              </th><td>'.$repair['status'].'</td></tr>';
		if ($repair['noticeStatus'])
			$html .= '<tr><th>Comunicazione      </th><td>'.$repair['noticeStatus'].'</td></tr>';
		$html .= '<tr><th>                   </th><td></td></tr>';

		if ($repair['diagnostic'])
			$html .= '<tr><th>Diagnostica      </th><td>'.nl2br($repair['diagnostic']).'</td></tr>';
		if ($repair['report'])
			$html .= '<tr><th>Intervento       </th><td>'.nl2br($repair['report']).'</td></tr>';
		$html .= '<tr><th>Preventivo finale  </th><td>'.$repair['price'].'</td></tr>';

		$html .= '</table>';
	}

	$html .= '</div>';

	$html = apply_filters('sxmpes_sc_repair-status_html-status-table', $html, $repair);

	return $html;
} 
	
<?php

use SIXEMPRESS\ExternalSync\Services\RequestService;

defined( 'ABSPATH' ) || exit;

// init
if (is_admin()) new SettingsPage();

class SettingsPage {
	/**
	 * Holds the values to be used in the fields callbacks
	 */
	private $options;

	/**
	 * Start up
	 */
	public function __construct() {
		add_action('admin_menu', array($this, 'add_plugin_page'));
		add_action('admin_init', array($this, 'page_init'));
	}

	/**
	 * Add options page
	 */
	public function add_plugin_page() {
		// This page will be under "Settings"
		add_menu_page(
			'Impostazioni SIXEMPRESS',
			'SIXEMPRESS',
			'manage_options',
			'sxmpes_menu_settings',
			array($this, 'create_admin_page')
		);
	}

	/**
	 * Options page callback
	 */
	public function create_admin_page() {
		// Set class property
		$this->options = get_option('sxmpes-options');
		?>
			<div class="wrap">
				<h1>Impostazioni sincronizzazione SIXEMPRESS</h1>
				<?php settings_errors('sxmpes-options'); ?>

				<?php if (isset($this->options['slug'])) { ?>
					<div style="padding: 1em; color: white; background: green; border-radius: 5px; margin: 7px 0;">
						Il sistema e' collegato a "<?php echo $this->options['login_slug'] ?>" per completare la configurazione e sincronizzare i prodotti aprire il sistema: 
						<a style="background: white; padding: 3px 6px; border-radius: 3px" target="_blank" href="<?php echo RequestService::$base_url."extconn/configuration" ?>">Apri</a>
					</div>
					<div style="padding: 1em; color: white; background: green; border-radius: 5px; margin: 7px 0;">
						Ricorda di impostare i permalink!
					</div>
				<?php } ?>

				<form method="post" action="options.php">
					<?php
						// This prints out all hidden setting fields
						settings_fields('sxmpes-main-group');
						do_settings_sections('sxmpes-main-setting-page');
						submit_button();
					?>
				</form>
			</div>
		<?php
	}

	/**
	 * Register and add settings
	 */
	public function page_init() {
		register_setting(
			'sxmpes-main-group', // Option group
			'sxmpes-options', // Option name
			[$this, 'sanitize'] // Sanitize
		);

		add_settings_section(
			'sxmpes-main-section',
			'',
			[$this, 'print_section_info'],
			'sxmpes-main-setting-page'
		);

		add_settings_field(
			'login_slug',
			'Codice Sistema',
			[$this, 'login_slug_callback'],
			'sxmpes-main-setting-page',
			'sxmpes-main-section'
		);

		add_settings_field(
			'username',
			'Nome Utente',
			[$this, 'username_callback'],
			'sxmpes-main-setting-page',
			'sxmpes-main-section' 
		);

		add_settings_field(
			'password_callback',
			'Password',
			[$this, 'password_callback'],
			'sxmpes-main-setting-page',
			'sxmpes-main-section' 
		);

	}

	/**
	 * Sanitize each setting field as needed
	 *
	 * @param array $input Contains all settings fields as array keys
	 */
	public function sanitize($input) {
		$new_input = $input;

		/**
		 *  ensure the api is correct and get the slug info
		 */
		if (isset($new_input['login_slug']) && isset($new_input['username']) && isset($new_input['password'])) {
			$res = RequestService::get_api_key_info($new_input['login_slug'], $new_input['username'], $new_input['password']);

			if ($res['success'] === true) {
				add_settings_error("sxmpes-options", "200", "Sistema collegato con successo", 'updated');
				$new_input['slug'] = $res['data']['slug'];
				$new_input['api_key'] = $res['data']['apiKey'];
				$new_input['api_url'] = $res['data']['apiUrl'];
			}
			else {
				$obj = json_decode(json_encode($res), true);
				add_settings_error("sxmpes-options", "404", json_encode($obj['data']['errors']));

				if (isset($res['data']) && is_object($res['data'])) {
					if (is_wp_error($res['data'])) {
						add_settings_error("sxmpes-options", "404", "Errore di configurazione");
					}
					else if ($res['data']['code'] === 90001) {
						add_settings_error("sxmpes-options", "90001", "L'utente corrente non ha le autorizzazioni necessarie per creare la connessione con il sistema. Provare con un altro utente del sistema");
					}
					else if ($res['data']['code'] === 40003) {
						add_settings_error("sxmpes-options", "40003", "Il sistema di destinazione non e' stato configurato");
					}
				}
				else if ($res['status'] === 401) {
					add_settings_error("sxmpes-options", "401", "Credenziali errate");
				}
				else {
					add_settings_error("sxmpes-options", "404", "Errore di configurazione");
				}
			}
		}

		// hide always password
		unset($new_input['password']);
		// unset($new_input['username']);

		return $new_input;
	}

	/** 
	 * Print the Section text
	 */
	public function print_section_info() {
		print 'Collegati usando le credenziali di un utente che ha il permesso di gestire collegamenti a siti esterni';
	}


	public function login_slug_callback() {
		printf(
			'<input type="text" id="login_slug" name="sxmpes-options[login_slug]" value="%s" />',
			isset($this->options['login_slug']) ? esc_attr($this->options['login_slug']) : ''
		);
	}

	public function username_callback() {
		printf(
			'<input type="text" id="username" name="sxmpes-options[username]" value="%s" />',
			isset($this->options['username']) ? esc_attr($this->options['username']) : ''
		);
	}

	public function password_callback() {
		printf(
			'<input type="text" id="password" name="sxmpes-options[password]" value="%s" />',
			isset($this->options['password']) ? esc_attr($this->options['password']) : ''
		);
	}

}


<?php

namespace SIXEMPRESS\ExternalSync\Utils\Enums;

defined( 'ABSPATH' ) || exit;

class Enum_BePaths {
	const auth = 'authentication/';
	const authz = 'authorization/';
	const sxmp_auth = 'authenticate/';
	const sxmp_authz = 'authorize/';
	// const products = 'public/products';
	// const inventorycategories = 'public/inventorycategories';
	
	const woo_crudupdate = 'woo/crudupdate/';
	const ext_connection_request = 'multipsysteminfo/externalconnection/request/';
}
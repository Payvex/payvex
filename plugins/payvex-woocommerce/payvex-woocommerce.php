<?php
/**
 * Plugin Name: Payvex for WooCommerce
 * Plugin URI: https://payvex.com
 * Description: Integracao inicial do WooCommerce com a Payvex.
 * Version: 0.1.0
 * Author: Payvex
 * Author URI: https://payvex.com
 * Text Domain: payvex-woocommerce
 */

if (! defined('ABSPATH')) {
    exit;
}

define('PAYVEX_WC_VERSION', '0.1.0');
define('PAYVEX_WC_PLUGIN_FILE', __FILE__);
define('PAYVEX_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PAYVEX_WC_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once PAYVEX_WC_PLUGIN_DIR . 'includes/class-payvex-woocommerce-plugin.php';
require_once PAYVEX_WC_PLUGIN_DIR . 'includes/class-payvex-wc-pix-gateway.php';

function payvex_wc_bootstrap()
{
    Payvex_WooCommerce_Plugin::instance();
}

add_action('plugins_loaded', 'payvex_wc_bootstrap');

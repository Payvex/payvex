<?php
/**
 * Plugin Name: Payvex Payment Gateway for WooCommerce
 * Plugin URI: https://payvex.com.br
 * Description: Gateway Payvex para WooCommerce com criacao de transacao, webhook assinado e reconciliacao de pedidos.
 * Version: 1.1.0
 * Author: Payvex
 * Author URI: https://payvex.com.br
 * License: GNU General Public License v3.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PAYVEX_WC_PLUGIN_VERSION', '1.1.0');

function payvex_wc_settings() {
    return get_option('woocommerce_payvex_settings', []);
}

function payvex_wc_setting($key, $default = '') {
    $settings = payvex_wc_settings();
    return isset($settings[$key]) ? $settings[$key] : $default;
}

function payvex_wc_api_url() {
    return rtrim((string) payvex_wc_setting('api_url'), '/');
}

function payvex_wc_webhook_url() {
    return rest_url('payvex/v1/webhook');
}

function payvex_wc_can_manage_woocommerce() {
    return current_user_can('manage_woocommerce') || current_user_can('edit_shop_orders');
}

function payvex_wc_verify_webhook(WP_REST_Request $request) {
    $secret = trim((string) payvex_wc_setting('webhook_secret'));
    if ($secret === '') {
        return new WP_Error('payvex_missing_secret', 'Webhook secret nao configurado.', ['status' => 401]);
    }

    $timestamp = $request->get_header('x-payvex-timestamp');
    $signature = $request->get_header('x-payvex-signature');
    if (!$timestamp || !$signature) {
        return new WP_Error('payvex_missing_signature', 'Assinatura Payvex ausente.', ['status' => 401]);
    }

    if (abs(time() - (int) floor(((int) $timestamp) / 1000)) > 300) {
        return new WP_Error('payvex_expired_signature', 'Assinatura Payvex expirada.', ['status' => 401]);
    }

    $received = str_replace('sha256=', '', $signature);
    $expected = hash_hmac('sha256', $timestamp . '.' . $request->get_body(), $secret);

    if (!hash_equals($expected, $received)) {
        return new WP_Error('payvex_invalid_signature', 'Assinatura Payvex invalida.', ['status' => 401]);
    }

    return true;
}

function payvex_wc_find_order_from_payload($payload) {
    $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];
    $metadata = isset($data['metadata']) && is_array($data['metadata']) ? $data['metadata'] : [];

    $order_id = $metadata['orderId']
        ?? $metadata['woocommerceOrderId']
        ?? $metadata['wooOrderId']
        ?? null;

    if ($order_id) {
        return wc_get_order(absint($order_id));
    }

    $transaction_id = $data['externalId'] ?? $data['id'] ?? null;
    if (!$transaction_id) {
        return false;
    }

    $orders = wc_get_orders([
        'limit' => 1,
        'meta_key' => '_payvex_transaction_id',
        'meta_value' => sanitize_text_field((string) $transaction_id),
        'return' => 'objects',
    ]);

    return !empty($orders) ? $orders[0] : false;
}

function payvex_wc_handle_webhook(WP_REST_Request $request) {
    $verified = payvex_wc_verify_webhook($request);
    if (is_wp_error($verified)) {
        return $verified;
    }

    $payload = json_decode($request->get_body(), true);
    if (!is_array($payload)) {
        return new WP_Error('payvex_invalid_payload', 'Payload invalido.', ['status' => 400]);
    }

    $order = payvex_wc_find_order_from_payload($payload);
    if (!$order) {
        return new WP_Error('payvex_order_not_found', 'Pedido WooCommerce nao encontrado.', ['status' => 404]);
    }

    $event = sanitize_text_field((string) ($payload['event'] ?? 'payment.updated'));
    $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];
    $status = strtoupper((string) ($data['status'] ?? ''));
    $transaction_id = sanitize_text_field((string) ($data['externalId'] ?? $data['id'] ?? ''));

    $order->update_meta_data('_payvex_last_event', $event);
    $order->update_meta_data('_payvex_last_status', $status);
    if ($transaction_id !== '') {
        $order->update_meta_data('_payvex_transaction_id', $transaction_id);
    }

    if ($status === 'PAID' || $event === 'payment.approved') {
        if (!$order->is_paid()) {
            $order->payment_complete($transaction_id);
        }
        $order->add_order_note('Pagamento aprovado pela Payvex.');
    } elseif ($status === 'FAILED' || $event === 'payment.failed') {
        $order->update_status('failed', 'Pagamento recusado pela Payvex.');
    } elseif ($status === 'EXPIRED' || $event === 'payment.expired') {
        $order->update_status('cancelled', 'Pagamento expirado na Payvex.');
    } elseif ($status === 'CANCELED' || $event === 'payment.canceled') {
        $order->update_status('cancelled', 'Pagamento cancelado na Payvex.');
    } elseif ($status === 'PENDING' || $event === 'payment.pending') {
        $order->update_status('on-hold', 'Aguardando confirmacao da Payvex.');
    }

    $order->save();

    return new WP_REST_Response([
        'received' => true,
        'orderId' => $order->get_id(),
        'status' => $status,
    ], 200);
}

function payvex_wc_decimal_amount($amount) {
    $value = (float) $amount;
    if ($value >= 1000 && floor($value) === $value) {
        return $value / 100;
    }
    return $value;
}

function payvex_wc_create_order_from_payvex(WP_REST_Request $request) {
    if (!function_exists('wc_create_order')) {
        return new WP_Error('payvex_woocommerce_unavailable', 'WooCommerce indisponivel.', ['status' => 500]);
    }

    $payload = $request->get_json_params();
    $amount = payvex_wc_decimal_amount($payload['amount'] ?? 0);
    if ($amount <= 0) {
        return new WP_Error('payvex_invalid_amount', 'Valor invalido.', ['status' => 400]);
    }

    $order = wc_create_order();
    $fee = new WC_Order_Item_Fee();
    $fee->set_name(sanitize_text_field((string) ($payload['description'] ?? $payload['itemName'] ?? 'Pedido Payvex')));
    $fee->set_amount($amount);
    $fee->set_total($amount);
    $order->add_item($fee);

    if (!empty($payload['customerEmail'])) {
        $order->set_billing_email(sanitize_email((string) $payload['customerEmail']));
    }

    if (!empty($payload['customerName'])) {
        $parts = explode(' ', sanitize_text_field((string) $payload['customerName']), 2);
        $order->set_billing_first_name($parts[0]);
        if (!empty($parts[1])) {
            $order->set_billing_last_name($parts[1]);
        }
    }

    $order->set_payment_method('payvex');
    $order->set_payment_method_title('Payvex');
    $order->update_status('pending', 'Pedido criado via Payvex.');
    $order->calculate_totals();
    $order->save();

    return new WP_REST_Response([
        'id' => (string) $order->get_id(),
        'paymentUrl' => $order->get_checkout_payment_url(false),
        'status' => 'PENDING',
    ], 200);
}

function payvex_wc_refund_order_from_payvex(WP_REST_Request $request) {
    $order = wc_get_order(absint($request['id']));
    if (!$order) {
        return new WP_Error('payvex_order_not_found', 'Pedido WooCommerce nao encontrado.', ['status' => 404]);
    }

    $order->update_status('refunded', 'Reembolso solicitado pela Payvex.');
    $order->save();

    return new WP_REST_Response([
        'id' => (string) $order->get_id(),
        'status' => 'CANCELED',
    ], 200);
}

function payvex_wc_register_routes() {
    register_rest_route('payvex/v1', '/webhook', [
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'payvex_wc_handle_webhook',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('wc/v3', '/payvex/transactions', [
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'payvex_wc_create_order_from_payvex',
        'permission_callback' => 'payvex_wc_can_manage_woocommerce',
    ]);

    register_rest_route('wc/v3', '/payvex/transactions/(?P<id>[\d]+)/refund', [
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'payvex_wc_refund_order_from_payvex',
        'permission_callback' => 'payvex_wc_can_manage_woocommerce',
    ]);
}

add_action('rest_api_init', 'payvex_wc_register_routes');

function wc_payvex_gateway_init() {
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class WC_Payvex_Gateway extends WC_Payment_Gateway {
        public $api_key;
        public $api_url;
        public $webhook_secret;
        public $gateway;
        public $payment_method;

        public function __construct() {
            $this->id = 'payvex';
            $this->method_title = __('Payvex Gateway', 'wc-payvex');
            $this->method_description = __('Gateway Payvex com webhook assinado e reconciliacao automatica.', 'wc-payvex');
            $this->icon = 'https://payvex.com.br/assets/images/logo-white.svg';
            $this->has_fields = false;
            $this->supports = ['products'];

            $this->init_form_fields();
            $this->init_settings();

            $this->title = $this->get_option('title');
            $this->description = $this->get_option('description');
            $this->api_key = trim((string) $this->get_option('api_key'));
            $this->api_url = rtrim((string) $this->get_option('api_url'), '/');
            $this->webhook_secret = trim((string) $this->get_option('webhook_secret'));
            $this->gateway = trim((string) $this->get_option('gateway'));
            $this->payment_method = trim((string) $this->get_option('payment_method', 'PIX'));

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        }

        public function init_form_fields() {
            $this->form_fields = [
                'enabled' => [
                    'title' => __('Habilitado', 'wc-payvex'),
                    'type' => 'checkbox',
                    'label' => __('Ativar o gateway Payvex', 'wc-payvex'),
                    'default' => 'yes',
                ],
                'title' => [
                    'title' => __('Titulo', 'wc-payvex'),
                    'type' => 'text',
                    'default' => __('Pagamento via Payvex', 'wc-payvex'),
                ],
                'description' => [
                    'title' => __('Descricao', 'wc-payvex'),
                    'type' => 'textarea',
                    'default' => __('Finalize o pagamento com Payvex.', 'wc-payvex'),
                ],
                'api_key' => [
                    'title' => __('API Key Payvex', 'wc-payvex'),
                    'type' => 'password',
                    'default' => '',
                ],
                'webhook_secret' => [
                    'title' => __('Webhook Secret Payvex', 'wc-payvex'),
                    'type' => 'password',
                    'default' => '',
                ],
                'api_url' => [
                    'title' => __('URL da API Payvex', 'wc-payvex'),
                    'type' => 'text',
                    'default' => 'http://localhost:3001',
                ],
                'gateway' => [
                    'title' => __('Gateway Payvex', 'wc-payvex'),
                    'type' => 'text',
                    'default' => '',
                ],
                'payment_method' => [
                    'title' => __('Metodo de pagamento', 'wc-payvex'),
                    'type' => 'select',
                    'default' => 'PIX',
                    'options' => [
                        'PIX' => 'PIX',
                        'BOLETO' => 'Boleto',
                        'CREDIT_CARD' => 'Cartao de credito',
                        'CRYPTO' => 'Cripto',
                    ],
                ],
            ];
        }

        public function process_admin_options() {
            $saved = parent::process_admin_options();
            $this->init_settings();
            $this->api_key = trim((string) $this->get_option('api_key'));
            $this->api_url = rtrim((string) $this->get_option('api_url'), '/');
            $this->register_webhook();
            return $saved;
        }

        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            if (!$order) {
                wc_add_notice(__('Pedido invalido.', 'wc-payvex'), 'error');
                return ['result' => 'failure'];
            }

            $response = $this->create_transaction($this->build_transaction_data($order));
            if (isset($response['result']) && $response['result'] === 'failure') {
                return ['result' => 'failure'];
            }

            $transaction_id = sanitize_text_field((string) ($response['id'] ?? ''));
            if ($transaction_id !== '') {
                $order->update_meta_data('_payvex_transaction_id', $transaction_id);
            }
            if (!empty($response['paymentUrl'])) {
                $order->update_meta_data('_payvex_payment_url', esc_url_raw((string) $response['paymentUrl']));
            }
            if (!empty($response['pixQrCode'])) {
                $order->update_meta_data('_payvex_pix_qr_code', sanitize_textarea_field((string) $response['pixQrCode']));
            }

            $order->set_payment_method($this->id);
            $order->set_payment_method_title($this->title);
            $order->update_status('on-hold', __('Aguardando confirmacao da Payvex.', 'wc-payvex'));
            $order->save();

            if (WC()->cart) {
                WC()->cart->empty_cart();
            }

            return [
                'result' => 'success',
                'redirect' => $response['paymentUrl'] ?? $this->get_return_url($order),
            ];
        }

        private function build_transaction_data($order) {
            $gateway = trim((string) $this->get_option('gateway'));

            return [
                'amount' => (int) round(((float) $order->get_total()) * 100),
                'currency' => $order->get_currency(),
                'paymentMethod' => $this->get_option('payment_method', 'PIX'),
                'gateway' => $gateway !== '' ? $gateway : null,
                'customerEmail' => $order->get_billing_email(),
                'customerName' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                'customerDocument' => $order->get_meta('_billing_cpf') ?: $order->get_meta('_billing_cnpj'),
                'orderId' => (string) $order->get_id(),
                'returnUrl' => $this->get_return_url($order),
                'description' => sprintf('Pedido WooCommerce #%s', $order->get_order_number()),
                'metadata' => [
                    'orderId' => (string) $order->get_id(),
                    'woocommerceOrderId' => (string) $order->get_id(),
                    'woocommerceOrderNumber' => (string) $order->get_order_number(),
                    'source' => 'woocommerce',
                    'webhookUrl' => payvex_wc_webhook_url(),
                ],
            ];
        }

        private function create_transaction($data) {
            if (!$this->api_key || !$this->api_url) {
                wc_add_notice(__('API Key ou URL da API Payvex nao configurada.', 'wc-payvex'), 'error');
                return ['result' => 'failure'];
            }

            $response = wp_remote_post($this->api_url . '/transactions/plugin/create', [
                'body' => wp_json_encode($data),
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-API-KEY' => $this->api_key,
                    'X-Payvex-Plugin' => 'woocommerce/' . PAYVEX_WC_PLUGIN_VERSION,
                ],
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                wc_add_notice(__('Erro na conexao com API: ', 'wc-payvex') . $response->get_error_message(), 'error');
                return ['result' => 'failure'];
            }

            $code = (int) wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $decoded = json_decode($body, true);

            if ($code < 200 || $code >= 300 || !is_array($decoded)) {
                $message = is_array($decoded) && isset($decoded['message'])
                    ? $decoded['message']
                    : __('Falha ao processar pagamento.', 'wc-payvex');
                wc_add_notice(__('Erro: ', 'wc-payvex') . $message, 'error');
                return ['result' => 'failure'];
            }

            return $decoded;
        }

        private function register_webhook() {
            if (!$this->api_key || !$this->api_url) {
                return;
            }

            $response = wp_remote_request($this->api_url . '/identity/plugin/webhook', [
                'method' => 'PATCH',
                'body' => wp_json_encode(['webhookUrl' => payvex_wc_webhook_url()]),
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-API-KEY' => $this->api_key,
                    'X-Payvex-Plugin' => 'woocommerce/' . PAYVEX_WC_PLUGIN_VERSION,
                ],
                'timeout' => 15,
            ]);

            if (is_wp_error($response) && class_exists('WC_Admin_Settings')) {
                WC_Admin_Settings::add_error('Nao foi possivel registrar o webhook Payvex: ' . $response->get_error_message());
            }
        }
    }

    add_filter('woocommerce_payment_gateways', function($gateways) {
        $gateways[] = 'WC_Payvex_Gateway';
        return $gateways;
    });
}

add_action('plugins_loaded', 'wc_payvex_gateway_init', 11);

<?php

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('WC_Payment_Gateway')) {
    return;
}

class Payvex_WC_PIX_Gateway extends WC_Payment_Gateway
{
    public function __construct()
    {
        $this->id = 'payvex_pix';
        $this->method_title = 'Payvex PIX';
        $this->method_description = 'Gateway inicial PIX via Payvex.';
        $this->title = 'PIX Payvex';
        $this->has_fields = false;

        $this->init_form_fields();
        $this->init_settings();

        $this->enabled = $this->get_option('enabled', 'yes');
        $this->title = $this->get_option('title', 'PIX Payvex');
        $this->description = $this->get_option('description', 'Pague com PIX via Payvex.');

        add_action(
            'woocommerce_update_options_payment_gateways_' . $this->id,
            [$this, 'process_admin_options']
        );
    }

    public function init_form_fields()
    {
        $this->form_fields = [
            'enabled' => [
                'title' => 'Ativar/Desativar',
                'type' => 'checkbox',
                'label' => 'Ativar Payvex PIX',
                'default' => 'yes',
            ],
            'title' => [
                'title' => 'Titulo',
                'type' => 'text',
                'default' => 'PIX Payvex',
            ],
            'description' => [
                'title' => 'Descricao',
                'type' => 'textarea',
                'default' => 'Pague com PIX via Payvex.',
            ],
        ];
    }

    public function process_payment($order_id)
    {
        $order = wc_get_order($order_id);
        $plugin = Payvex_WooCommerce_Plugin::instance();
        $result = $plugin->create_transaction_for_order($order);

        if (is_wp_error($result)) {
            wc_add_notice($result->get_error_message(), 'error');
            return ['result' => 'failure'];
        }

        $external_id = isset($result['externalId']) ? $result['externalId'] : '';
        $order->update_status('on-hold', 'Aguardando pagamento PIX pela Payvex.');
        $order->update_meta_data('_payvex_payment_status', 'PENDING');
        $order->add_order_note('Cobranca Payvex criada. External ID: ' . $external_id);
        $order->save();
        WC()->cart->empty_cart();

        return [
            'result' => 'success',
            'redirect' => $this->get_return_url($order),
        ];
    }
}

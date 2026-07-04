<?php

if (! defined('ABSPATH')) {
    exit;
}

class Payvex_WooCommerce_Plugin
{
    const OPTION_KEY = 'payvex_wc_settings';
    const WEBHOOK_NAMESPACE = 'payvex/v1';
    const WEBHOOK_ROUTE = '/webhook';

    /**
     * @var Payvex_WooCommerce_Plugin|null
     */
    private static $instance = null;

    public static function instance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    private function __construct()
    {
        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_post_payvex_wc_test_connection', [$this, 'handle_test_connection']);
        add_action('admin_post_payvex_wc_register_webhook', [$this, 'handle_register_webhook']);
        add_filter('woocommerce_payment_gateways', [$this, 'register_payment_gateway']);
        add_action('woocommerce_thankyou_payvex_pix', [$this, 'render_payment_instructions']);
        add_action('woocommerce_view_order', [$this, 'render_payment_instructions']);
        add_action('payvex_wc_webhook_received', [$this, 'handle_payvex_webhook'], 10, 2);
    }

    public function register_admin_menu()
    {
        add_menu_page(
            'Payvex',
            'Payvex',
            'manage_options',
            'payvex-woocommerce',
            [$this, 'render_settings_page'],
            'dashicons-cart',
            56
        );
    }

    public function register_settings()
    {
        register_setting(
            'payvex_wc_settings_group',
            self::OPTION_KEY,
            [$this, 'sanitize_settings']
        );

        add_settings_section(
            'payvex_wc_main_section',
            'Configuracao da integracao',
            function () {
                echo '<p>Conecte o WooCommerce com a Payvex usando a sua API Key.</p>';
            },
            'payvex-woocommerce'
        );

        $fields = [
            'api_base_url' => 'URL da API Payvex',
            'api_key' => 'API Key',
            'webhook_secret' => 'Webhook Secret',
            'gateway' => 'Gateway padrao',
            'filial_id' => 'Filial ID',
            'plugin_status' => 'Status da instalacao',
        ];

        foreach ($fields as $key => $label) {
            add_settings_field(
                $key,
                $label,
                [$this, 'render_field'],
                'payvex-woocommerce',
                'payvex_wc_main_section',
                ['key' => $key, 'label' => $label]
            );
        }
    }

    public function sanitize_settings($input)
    {
        $current = $this->get_settings();

        $settings = [
            'api_base_url' => isset($input['api_base_url']) ? esc_url_raw(untrailingslashit($input['api_base_url'])) : '',
            'api_key' => isset($input['api_key']) ? sanitize_text_field($input['api_key']) : '',
            'webhook_secret' => isset($input['webhook_secret']) ? sanitize_text_field($input['webhook_secret']) : '',
            'gateway' => isset($input['gateway']) ? sanitize_text_field($input['gateway']) : 'STRIPE',
            'filial_id' => isset($input['filial_id']) ? sanitize_text_field($input['filial_id']) : '',
            'plugin_status' => isset($current['plugin_status']) ? sanitize_text_field($current['plugin_status']) : 'disconnected',
            'webhook_url' => isset($current['webhook_url']) ? esc_url_raw($current['webhook_url']) : $this->get_webhook_url(),
            'last_connection_payload' => isset($current['last_connection_payload']) ? wp_json_encode($current['last_connection_payload']) : '',
        ];

        return $settings;
    }

    public function render_field($args)
    {
        $key = $args['key'];
        $settings = $this->get_settings();
        $value = isset($settings[$key]) ? $settings[$key] : '';

        if ($key === 'plugin_status') {
            echo '<strong>' . esc_html($value ? $value : 'disconnected') . '</strong>';
            return;
        }

        if ($key === 'gateway') {
            echo '<select name="' . esc_attr(self::OPTION_KEY) . '[gateway]">';
            $options = ['STRIPE' => 'Stripe', 'MERCADO_PAGO' => 'Mercado Pago'];
            foreach ($options as $option_value => $label) {
                echo '<option value="' . esc_attr($option_value) . '" ' . selected($value, $option_value, false) . '>' . esc_html($label) . '</option>';
            }
            echo '</select>';
            return;
        }

        $type = $key === 'api_key' || $key === 'webhook_secret' ? 'password' : 'text';
        $readonly = $key === 'filial_id' ? 'readonly' : '';

        printf(
            '<input type="%s" name="%s[%s]" value="%s" class="regular-text" %s />',
            esc_attr($type),
            esc_attr(self::OPTION_KEY),
            esc_attr($key),
            esc_attr($value),
            $readonly
        );

        if ($key === 'api_base_url') {
            echo '<p class="description">Ex.: http://localhost:3001</p>';
        }

        if ($key === 'webhook_secret') {
            echo '<p class="description">Use o segredo de webhook gerado no painel da Payvex.</p>';
        }
    }

    public function render_settings_page()
    {
        if (! current_user_can('manage_options')) {
            return;
        }

        $settings = $this->get_settings();
        $connection_data = $this->get_last_connection_payload();
        ?>
        <div class="wrap">
            <h1>Payvex for WooCommerce</h1>
            <p>Configure a conexao com a Payvex e registre o webhook da loja.</p>

            <?php settings_errors('payvex_wc_messages'); ?>

            <form method="post" action="options.php">
                <?php
                settings_fields('payvex_wc_settings_group');
                do_settings_sections('payvex-woocommerce');
                submit_button('Salvar configuracoes');
                ?>
            </form>

            <hr />

            <h2>Webhook da loja</h2>
            <p><code><?php echo esc_html($this->get_webhook_url()); ?></code></p>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-right:12px;">
                <?php wp_nonce_field('payvex_wc_test_connection'); ?>
                <input type="hidden" name="action" value="payvex_wc_test_connection" />
                <?php submit_button('Testar conexao', 'secondary', 'submit', false); ?>
            </form>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;">
                <?php wp_nonce_field('payvex_wc_register_webhook'); ?>
                <input type="hidden" name="action" value="payvex_wc_register_webhook" />
                <?php submit_button('Registrar webhook', 'primary', 'submit', false); ?>
            </form>

            <?php if (! empty($connection_data)) : ?>
                <hr />
                <h2>Ultimo retorno da Payvex</h2>
                <pre style="background:#fff;padding:16px;border:1px solid #dcdcde;max-width:100%;overflow:auto;"><?php echo esc_html(wp_json_encode($connection_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); ?></pre>
            <?php endif; ?>

            <?php if (! empty($settings['webhook_url'])) : ?>
                <p><strong>Webhook registrado:</strong> <?php echo esc_html($settings['webhook_url']); ?></p>
            <?php endif; ?>
        </div>
        <?php
    }

    public function register_rest_routes()
    {
        register_rest_route(
            self::WEBHOOK_NAMESPACE,
            self::WEBHOOK_ROUTE,
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'handle_webhook'],
                'permission_callback' => '__return_true',
            ]
        );
    }

    public function handle_test_connection()
    {
        if (! current_user_can('manage_options')) {
            wp_die('Permissao negada.');
        }

        check_admin_referer('payvex_wc_test_connection');

        $response = $this->request('GET', '/identity/plugin/me');

        if (is_wp_error($response)) {
            $this->add_admin_notice('error', $response->get_error_message());
            $this->redirect_settings_page();
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        $settings = $this->get_settings();
        $settings['plugin_status'] = 'connected';
        $settings['filial_id'] = isset($body['filial']['id']) ? sanitize_text_field($body['filial']['id']) : '';
        $settings['last_connection_payload'] = $body;
        update_option(self::OPTION_KEY, $settings);

        $this->add_admin_notice('success', 'Conexao com a Payvex validada com sucesso.');
        $this->redirect_settings_page();
    }

    public function handle_register_webhook()
    {
        if (! current_user_can('manage_options')) {
            wp_die('Permissao negada.');
        }

        check_admin_referer('payvex_wc_register_webhook');

        $payload = [
            'webhookUrl' => $this->get_webhook_url(),
        ];

        $response = $this->request('PATCH', '/identity/plugin/webhook', $payload);

        if (is_wp_error($response)) {
            $this->add_admin_notice('error', $response->get_error_message());
            $this->redirect_settings_page();
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        $settings = $this->get_settings();
        $settings['webhook_url'] = isset($body['webhookUrl']) ? esc_url_raw($body['webhookUrl']) : $this->get_webhook_url();
        update_option(self::OPTION_KEY, $settings);

        $this->add_admin_notice('success', 'Webhook registrado na Payvex com sucesso.');
        $this->redirect_settings_page();
    }

    public function handle_webhook(WP_REST_Request $request)
    {
        $settings = $this->get_settings();
        $webhook_secret = isset($settings['webhook_secret']) ? $settings['webhook_secret'] : '';

        if (! $webhook_secret) {
            return new WP_REST_Response(
                ['message' => 'Webhook secret nao configurado.'],
                400
            );
        }

        $signature = $request->get_header('x-payvex-signature');
        $timestamp = $request->get_header('x-payvex-timestamp');
        $raw_body = $request->get_body();

        if (! $this->is_valid_signature($raw_body, $timestamp, $signature, $webhook_secret)) {
            return new WP_REST_Response(
                ['message' => 'Assinatura invalida.'],
                401
            );
        }

        $payload = json_decode($raw_body, true);
        $event = isset($payload['event']) ? $payload['event'] : '';

        do_action('payvex_wc_webhook_received', $event, $payload);

        return new WP_REST_Response(
            ['received' => true, 'event' => $event],
            200
        );
    }

    public function register_payment_gateway($gateways)
    {
        if (class_exists('WC_Payment_Gateway')) {
            $gateways[] = 'Payvex_WC_PIX_Gateway';
        }

        return $gateways;
    }

    public function create_transaction_for_order($order)
    {
        $settings = $this->get_settings();
        $filial_id = isset($settings['filial_id']) ? $settings['filial_id'] : '';

        if (! $filial_id) {
            return new WP_Error('payvex_missing_filial', 'Defina a filial da instalacao antes de gerar cobrancas.');
        }

        $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());

        $payload = [
            'amount' => (float) $order->get_total(),
            'paymentMethod' => 'PIX',
            'gateway' => isset($settings['gateway']) ? $settings['gateway'] : 'STRIPE',
            'filialId' => $filial_id,
            'customerName' => $customer_name,
            'customerEmail' => $order->get_billing_email(),
            'metadata' => [
                'orderId' => $order->get_id(),
                'orderKey' => $order->get_order_key(),
                'siteUrl' => home_url(),
            ],
        ];

        $response = $this->request('POST', '/transactions/plugin/create', $payload);
        if (is_wp_error($response)) {
            return $response;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (! is_array($body)) {
            return new WP_Error('payvex_invalid_response', 'Resposta invalida da Payvex ao criar a cobranca.');
        }

        $order->update_meta_data('_payvex_transaction_id', isset($body['id']) ? $body['id'] : '');
        $order->update_meta_data('_payvex_external_id', isset($body['externalId']) ? $body['externalId'] : '');
        $order->update_meta_data('_payvex_payment_url', isset($body['paymentUrl']) ? $body['paymentUrl'] : '');
        $order->update_meta_data('_payvex_pix_qr_code', isset($body['pixQrCode']) ? $body['pixQrCode'] : '');
        $order->save();

        return $body;
    }

    public function render_payment_instructions($order_id)
    {
        $order = wc_get_order($order_id);
        if (! $order) {
            return;
        }

        $payment_url = $order->get_meta('_payvex_payment_url');
        $pix_qr_code = $order->get_meta('_payvex_pix_qr_code');
        $payment_status = $order->get_meta('_payvex_payment_status');
        $transaction_id = $order->get_meta('_payvex_transaction_id');
        $external_id = $order->get_meta('_payvex_external_id');

        if (! $payment_url && ! $pix_qr_code && ! $payment_status) {
            return;
        }

        $status_map = $this->get_payment_status_map();
        $status_config = isset($status_map[$payment_status]) ? $status_map[$payment_status] : [
            'label' => $payment_status ? $payment_status : 'Sem status',
            'background' => '#f1f5f9',
            'color' => '#334155',
        ];

        echo '<section class="woocommerce-order payvex-payment-instructions" style="margin-top:24px;padding:24px;border:1px solid #e2e8f0;border-radius:18px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);">';
        echo '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px;">';
        echo '<div>';
        echo '<h2 style="margin:0 0 6px;color:#1e293b;">Pagamento Payvex</h2>';
        echo '<p style="margin:0;color:#64748b;">Acompanhe abaixo o status da cobranca e os dados do PIX.</p>';
        echo '</div>';
        echo '<span style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;background:' . esc_attr($status_config['background']) . ';color:' . esc_attr($status_config['color']) . ';">' . esc_html($status_config['label']) . '</span>';
        echo '</div>';

        echo '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:18px;">';

        if ($transaction_id) {
            echo '<div style="padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;">';
            echo '<strong style="display:block;font-size:12px;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Transaction ID</strong>';
            echo '<code style="font-size:12px;color:#0f172a;">' . esc_html($transaction_id) . '</code>';
            echo '</div>';
        }

        if ($external_id) {
            echo '<div style="padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;">';
            echo '<strong style="display:block;font-size:12px;text-transform:uppercase;color:#64748b;margin-bottom:6px;">External ID</strong>';
            echo '<code style="font-size:12px;color:#0f172a;">' . esc_html($external_id) . '</code>';
            echo '</div>';
        }

        echo '</div>';

        if ($pix_qr_code) {
            $textarea_id = 'payvex-pix-code-' . absint($order_id);
            echo '<div style="padding:18px;border:1px solid #dbeafe;border-radius:16px;background:#eff6ff;margin-bottom:16px;">';
            echo '<p style="margin:0 0 10px;color:#1d4ed8;font-weight:700;">Use o codigo PIX abaixo para concluir o pagamento:</p>';
            echo '<textarea id="' . esc_attr($textarea_id) . '" readonly rows="5" style="width:100%;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#fff;font-size:12px;line-height:1.5;">' . esc_textarea($pix_qr_code) . '</textarea>';
            echo '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">';
            echo '<button type="button" class="button" onclick="(function(){var field=document.getElementById(\'' . esc_js($textarea_id) . '\'); if(!field){return;} field.focus(); field.select(); try{document.execCommand(\'copy\');}catch(e){}})();" style="background:#0f172a;color:#fff;border-color:#0f172a;">Copiar codigo PIX</button>';
            echo '</div>';
            echo '</div>';
        }

        if ($payment_url) {
            echo '<p style="margin:0 0 16px;"><a class="button" href="' . esc_url($payment_url) . '" target="_blank" rel="noopener noreferrer" style="background:#84cc16;border-color:#84cc16;color:#1e293b;font-weight:700;">Abrir pagamento</a></p>';
        }

        echo '<p style="margin:0;color:#64748b;font-size:13px;">Depois que o pagamento for identificado pela Payvex, o pedido sera atualizado automaticamente.</p>';
        echo '</section>';
    }

    public function handle_payvex_webhook($event, $payload)
    {
        if (! function_exists('wc_get_orders')) {
            return;
        }

        $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];
        $transaction_id = isset($data['id']) ? sanitize_text_field($data['id']) : '';
        $external_id = isset($data['externalId']) ? sanitize_text_field($data['externalId']) : '';
        $metadata = isset($data['metadata']) && is_array($data['metadata']) ? $data['metadata'] : [];

        $order = $this->find_order_by_payvex_reference($transaction_id, $external_id, $metadata);
        if (! $order) {
            return;
        }

        if ($event === 'payment.approved') {
            $this->mark_order_as_paid($order, $transaction_id, $external_id, $data, $metadata);
            return;
        }

        $this->update_order_from_unsuccessful_event($order, $event, $transaction_id, $external_id, $data, $metadata);
    }

    public function request($method, $path, $body = null)
    {
        $settings = $this->get_settings();
        $api_base_url = isset($settings['api_base_url']) ? untrailingslashit($settings['api_base_url']) : '';
        $api_key = isset($settings['api_key']) ? $settings['api_key'] : '';

        if (! $api_base_url || ! $api_key) {
            return new WP_Error('payvex_missing_config', 'Configure a URL da API e a API Key antes de continuar.');
        }

        $args = [
            'method' => $method,
            'timeout' => 20,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $api_key,
            ],
        ];

        if ($body !== null) {
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($api_base_url . $path, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code < 200 || $status_code >= 300) {
            return new WP_Error(
                'payvex_http_error',
                sprintf(
                    'A Payvex retornou status %d: %s',
                    $status_code,
                    wp_remote_retrieve_body($response)
                )
            );
        }

        return $response;
    }

    private function is_valid_signature($raw_body, $timestamp, $signature, $secret)
    {
        if (! $raw_body || ! $timestamp || ! $signature) {
            return false;
        }

        $provided_signature = str_replace('sha256=', '', (string) $signature);
        $signed_payload = $timestamp . '.' . $raw_body;
        $expected_signature = hash_hmac('sha256', $signed_payload, $secret);

        return hash_equals($expected_signature, $provided_signature);
    }

    private function find_order_by_payvex_reference($transaction_id, $external_id, $metadata = [])
    {
        if (! empty($metadata['orderId'])) {
            $order = wc_get_order((int) $metadata['orderId']);
            if ($order) {
                return $order;
            }
        }

        if (! empty($metadata['orderKey'])) {
            $orders = wc_get_orders([
                'limit' => 1,
                'type' => 'shop_order',
                'order_key' => sanitize_text_field($metadata['orderKey']),
            ]);

            if (! empty($orders)) {
                return $orders[0];
            }
        }

        $meta_queries = [];

        if ($transaction_id) {
            $meta_queries[] = [
                'key' => '_payvex_transaction_id',
                'value' => $transaction_id,
            ];
        }

        if ($external_id) {
            $meta_queries[] = [
                'key' => '_payvex_external_id',
                'value' => $external_id,
            ];
        }

        foreach ($meta_queries as $meta_query) {
            $orders = wc_get_orders([
                'limit' => 1,
                'type' => 'shop_order',
                'meta_key' => $meta_query['key'],
                'meta_value' => $meta_query['value'],
            ]);

            if (! empty($orders)) {
                return $orders[0];
            }
        }

        return null;
    }

    private function mark_order_as_paid($order, $transaction_id, $external_id, $data, $metadata)
    {
        if ($order->is_paid()) {
            return;
        }

        $order->payment_complete($external_id ? $external_id : $transaction_id);
        $order->update_meta_data('_payvex_paid_at', isset($data['paidAt']) ? sanitize_text_field($data['paidAt']) : '');
        $order->update_meta_data('_payvex_payment_status', isset($data['status']) ? sanitize_text_field($data['status']) : 'PAID');
        $order->update_meta_data('_payvex_webhook_metadata', wp_json_encode($metadata));
        $order->save();

        $order->add_order_note(
            sprintf(
                'Pagamento confirmado pela Payvex. Transaction ID: %s | External ID: %s',
                $transaction_id ? $transaction_id : '-',
                $external_id ? $external_id : '-'
            )
        );
    }

    private function update_order_from_unsuccessful_event($order, $event, $transaction_id, $external_id, $data, $metadata)
    {
        $event_map = [
            'payment.failed' => [
                'status' => 'failed',
                'payment_status' => 'FAILED',
                'note' => 'Pagamento falhou na Payvex.',
            ],
            'payment.expired' => [
                'status' => 'cancelled',
                'payment_status' => 'EXPIRED',
                'note' => 'Cobranca expirada na Payvex.',
            ],
            'payment.canceled' => [
                'status' => 'cancelled',
                'payment_status' => 'CANCELED',
                'note' => 'Pagamento cancelado na Payvex.',
            ],
        ];

        if (! isset($event_map[$event])) {
            return;
        }

        $config = $event_map[$event];
        $order->update_status($config['status'], $config['note']);
        $order->update_meta_data('_payvex_payment_status', $config['payment_status']);
        $order->update_meta_data('_payvex_webhook_metadata', wp_json_encode($metadata));
        $order->save();

        $order->add_order_note(
            sprintf(
                '%s Transaction ID: %s | External ID: %s',
                $config['note'],
                $transaction_id ? $transaction_id : '-',
                $external_id ? $external_id : '-'
            )
        );
    }

    private function get_webhook_url()
    {
        return rest_url(self::WEBHOOK_NAMESPACE . self::WEBHOOK_ROUTE);
    }

    private function get_payment_status_map()
    {
        return [
            'PENDING' => [
                'label' => 'Aguardando pagamento',
                'background' => '#fef3c7',
                'color' => '#92400e',
            ],
            'PAID' => [
                'label' => 'Pagamento aprovado',
                'background' => '#dcfce7',
                'color' => '#166534',
            ],
            'FAILED' => [
                'label' => 'Pagamento falhou',
                'background' => '#fee2e2',
                'color' => '#991b1b',
            ],
            'EXPIRED' => [
                'label' => 'Cobranca expirada',
                'background' => '#e2e8f0',
                'color' => '#334155',
            ],
            'CANCELED' => [
                'label' => 'Pagamento cancelado',
                'background' => '#e2e8f0',
                'color' => '#334155',
            ],
        ];
    }

    public function get_settings()
    {
        $defaults = [
            'api_base_url' => 'http://localhost:3001',
            'api_key' => '',
            'webhook_secret' => '',
            'gateway' => 'STRIPE',
            'filial_id' => '',
            'plugin_status' => 'disconnected',
            'webhook_url' => '',
            'last_connection_payload' => '',
        ];

        return wp_parse_args(get_option(self::OPTION_KEY, []), $defaults);
    }

    private function get_last_connection_payload()
    {
        $settings = $this->get_settings();

        if (empty($settings['last_connection_payload'])) {
            return null;
        }

        if (is_array($settings['last_connection_payload'])) {
            return $settings['last_connection_payload'];
        }

        $decoded = json_decode($settings['last_connection_payload'], true);
        return is_array($decoded) ? $decoded : null;
    }

    private function add_admin_notice($type, $message)
    {
        add_settings_error(
            'payvex_wc_messages',
            'payvex_wc_message',
            $message,
            $type
        );

        set_transient('settings_errors', get_settings_errors(), 30);
    }

    private function redirect_settings_page()
    {
        wp_safe_redirect(admin_url('admin.php?page=payvex-woocommerce'));
        exit;
    }
}

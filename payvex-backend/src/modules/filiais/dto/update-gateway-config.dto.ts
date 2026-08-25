import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * 📋 DTO CANÔNICO — espelha exatamente as colunas do modelo Filial
 * em prisma/schema.prisma. Como o ValidationPipe usa
 * `forbidNonWhitelisted: true`, qualquer campo não listado aqui é rejeitado.
 */
export class UpdateGatewayConfigDto {
  // ── Stripe ─────────────────────────────────────────
  @IsOptional() @IsString() stripeSecretKey?: string | null;
  @IsOptional() @IsString() stripePublicKey?: string | null;
  @IsOptional() @IsString() stripeWebhookSecret?: string | null;

  // ── Mercado Pago ───────────────────────────────────
  @IsOptional() @IsString() mercadoPagoAccessToken?: string | null;
  @IsOptional() @IsString() mercadoPagoWebhookSecret?: string | null;

  // ── Pagar.me ───────────────────────────────────────
  @IsOptional() @IsString() pagarMeAccessToken?: string | null;
  @IsOptional() @IsString() pagarMePublicKey?: string | null;

  // ── PagBank ────────────────────────────────────────
  @IsOptional() @IsString() pagarBankPrivateKey?: string | null;
  @IsOptional() @IsBoolean() pagarBankSandbox?: boolean;

  // ── Asaas ──────────────────────────────────────────
  @IsOptional() @IsString() asaasApiKey?: string | null;
  @IsOptional() @IsString() asaasWebhookToken?: string | null;
  @IsOptional() @IsBoolean() asaasSandbox?: boolean;

  // ── Cielo ──────────────────────────────────────────
  @IsOptional() @IsString() cieloMerchantId?: string | null;
  @IsOptional() @IsString() cieloMerchantKey?: string | null;
  @IsOptional() @IsString() cieloWebhookHeaderKey?: string | null;
  @IsOptional() @IsString() cieloWebhookHeaderValue?: string | null;
  @IsOptional() @IsBoolean() cieloSandbox?: boolean;

  // ── Stone ──────────────────────────────────────────
  @IsOptional() @IsString() stoneApiKey?: string | null;
  @IsOptional() @IsString() stoneClientId?: string | null;
  @IsOptional() @IsString() stoneSecret?: string | null;
  @IsOptional() @IsBoolean() stoneSandbox?: boolean;

  // ── NOWPayments ────────────────────────────────────
  @IsOptional() @IsString() nowPaymentsApiKey?: string | null;
  @IsOptional() @IsString() nowPaymentsIpnSecret?: string | null;

  // ── Coinbase Commerce ──────────────────────────────
  @IsOptional() @IsString() coinbaseCommerceApiKey?: string | null;
  @IsOptional() @IsString() coinbaseCommerceWebhookSecret?: string | null;

  // ── BitPay ─────────────────────────────────────────
  @IsOptional() @IsString() bitPayToken?: string | null;
  @IsOptional() @IsBoolean() bitPaySandbox?: boolean;

  // ── PicPay ─────────────────────────────────────────
  @IsOptional() @IsString() picPayPublicKey?: string | null;
  @IsOptional() @IsString() picPayClientId?: string | null;
  @IsOptional() @IsString() picPayClientSecret?: string | null;
  @IsOptional() @IsString() picPaySellerToken?: string | null;

  // ── PagSeguro ──────────────────────────────────────
  @IsOptional() @IsString() pagSeguroEmail?: string | null;
  @IsOptional() @IsString() pagSeguroToken?: string | null;
  @IsOptional() @IsString() pagSeguroSalt?: string | null;
  @IsOptional() @IsBoolean() pagSeguroSandbox?: boolean;

  // ── WooCommerce (mantido para compatibilidade) ───
  @IsOptional() @IsString() woocommerceUrl?: string | null;
  @IsOptional() @IsString() woocommerceConsumerKey?: string | null;
  @IsOptional() @IsString() woocommerceConsumerSecret?: string | null;

  // ── Nuvem Shop (mantido para compatibilidade) ────
  @IsOptional() @IsString() nuvemShopUrl?: string | null;
  @IsOptional() @IsString() nuvemShopAccessToken?: string | null;
  @IsOptional() @IsString() nuvemShopStoreId?: string | null;
}

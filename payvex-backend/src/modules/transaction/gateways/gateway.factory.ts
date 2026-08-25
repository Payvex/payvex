import { BadRequestException, Injectable } from '@nestjs/common';
import { StripeAdapter } from './adapters/stripe.adapter';
import { MercadoPagoAdapter } from './adapters/mercado-pago.adapter';
import { PagarMeAdapter } from './adapters/pagar-me.adapter';
import { PagBankAdapter } from './adapters/pag-bank.adapter';
import { AsaasAdapter } from './adapters/asaas.adapter';
import { CieloAdapter } from './adapters/cielo.adapter';
import { StoneAdapter } from './adapters/stone.adapter';
import { NowPaymentsAdapter } from './adapters/now-payments.adapter';
import { CoinbaseCommerceAdapter } from './adapters/coinbase-commerce.adapter';
import { BitPayAdapter } from './adapters/bitpay.adapter';
import { PicPayAdapter } from './adapters/picpay.adapter';
import { PagSeguroAdapter } from './adapters/pagseguro.adapter';
import { WooCommerceAdapter } from './adapters/woocommerce.adapter';
import { NuvemShopAdapter } from './adapters/nuvem-shop.adapter';
import { ShopifyAdapter } from './adapters/shopify.adapter';
import { PaymentGateway } from './payment-gateway.interface';

@Injectable()
export class GatewayFactory {
  getGateway(gatewayName: string): PaymentGateway {
    const name = gatewayName.toUpperCase().replace(/\s+/g, '_');

    switch (name) {
      case 'STRIPE':
        return new StripeAdapter();
      case 'MERCADO_PAGO':
        return new MercadoPagoAdapter();
      case 'PAGARME':
      case 'PAGAR_ME':
        return new PagarMeAdapter();
      case 'PAGBANK':
      case 'PAG_BANK':
        return new PagBankAdapter();
      case 'ASAAS':
        return new AsaasAdapter();
      case 'CIELO':
      case 'CIEL0':
        return new CieloAdapter();
      case 'STONE':
        return new StoneAdapter();
      case 'NOW_PAYMENTS':
      case 'NOWPAYMENTS':
        return new NowPaymentsAdapter();
      case 'COINBASE':
      case 'COINBASE_COMMERCE':
        return new CoinbaseCommerceAdapter();
      case 'BITPAY':
      case 'BIT_PAY':
        return new BitPayAdapter();
      case 'PICPAY':
        return new PicPayAdapter();
      case 'PAGSEGURO':
      case 'PAG_SEGURO':
        return new PagSeguroAdapter();
      case 'WOO_COMMERCE':
      case 'WOOCOMMERCE':
        return new WooCommerceAdapter();
      case 'NUVEM_SHOP':
      case 'NUVEMSHOP':
        return new NuvemShopAdapter();
      case 'SHOPIFY':
        return new ShopifyAdapter();
      default:
        throw new BadRequestException('Gateway não suportado.');
    }
  }
}

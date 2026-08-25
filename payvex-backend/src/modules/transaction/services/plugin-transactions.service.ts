/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { GatewayFactory } from '../gateways/gateway.factory';
import { CreatePluginTransactionDto } from '../dtos/create-plugin-transaction.dto';
import { PaymentResponse } from '../gateways/payment-gateway.interface';
import { TransactionStatus, PaymentMethod } from '@prisma/client';
import { decryptWithKey } from 'src/utils/security.util';
import { randomUUID } from 'crypto';

type FilialType = {
  cnpj?: string | null;
  stripePublicKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  mercadoPagoAccessToken?: string | null;
  mercadoPagoWebhookSecret?: string | null;
  mercadoPagoTestMode?: boolean | null;
  pagarMeAccessToken?: string | null;
  pagarMePublicKey?: string | null;
  pagarBankPrivateKey?: string | null;
  pagarBankSandbox?: boolean | null;
  asaasApiKey?: string | null;
  asaasWebhookToken?: string | null;
  asaasSandbox?: boolean | null;
  cieloMerchantId?: string | null;
  cieloMerchantKey?: string | null;
  cieloSandbox?: boolean | null;
  stoneApiKey?: string | null;
  stoneClientId?: string | null;
  stoneSecret?: string | null;
  stoneSandbox?: boolean | null;
  nowPaymentsApiKey?: string | null;
  nowPaymentsIpnSecret?: string | null;
  coinbaseCommerceApiKey?: string | null;
  coinbaseCommerceWebhookSecret?: string | null;
  bitPayToken?: string | null;
  bitPaySandbox?: boolean | null;
  picPayPublicKey?: string | null;
  picPayClientId?: string | null;
  picPayClientSecret?: string | null;
  picPaySellerToken?: string | null;
  pagSeguroEmail?: string | null;
  pagSeguroToken?: string | null;
  pagSeguroSalt?: string | null;
  pagSeguroSandbox?: boolean | null;
  woocommerceUrl?: string | null;
  woocommerceConsumerKey?: string | null;
  woocommerceConsumerSecret?: string | null;
  nuvemShopUrl?: string | null;
  nuvemShopAccessToken?: string | null;
  nuvemShopStoreId?: string | null;
  shopifyUrl?: string | null;
  shopifyAccessToken?: string | null;
  shopifyStoreId?: string | null;
  shopifyApiVersion?: string | null;
  preferredGateway?: string | null;
};

@Injectable()
export class PluginTransactionsService {
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayFactory: GatewayFactory,
  ) {}

  async createTransactionForApiKey(apiKeyId: string, dto: CreatePluginTransactionDto) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      include: { filial: true },
    });

    if (!apiKey) {
      throw new NotFoundException('Api Key não encontrada.');
    }

    const gatewayName =
      String(dto.gateway || apiKey.filial.preferredGateway || 'MERCADO_PAGO').toUpperCase().replace(
        /\s+/g,
        '_',
      );
    const paymentMethod = this.normalizePaymentMethod(dto.paymentMethod);

    const gateway = this.gatewayFactory.getGateway(gatewayName);
    const credentials = this.buildGatewayCredentials(gatewayName, apiKey.filial as FilialType);
    const payvexReference = dto.metadata?.payvexReference || randomUUID();

    const created: PaymentResponse = await gateway.createPayment(
      {
        amount: dto.amount,
        currency: dto.currency || 'BRL',
        paymentMethod,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        customerDocument: dto.customerDocument,
        installments: dto.installments,
        customerPhone: dto.customerPhone,
        shippingName: dto.shippingName,
        orderId: dto.orderId,
        returnUrl: dto.returnUrl,
        webhookUrl: dto.webhookUrl,
        expirationDate: dto.expirationDate,
        description: dto.description,
        pix: dto.pix,
        securityCode: dto.securityCode,
        cardNumber: dto.cardNumber,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        cardToken: dto.cardToken,
        cardId: dto.cardId,
        cardBrand: dto.cardBrand,
        paymentToken: dto.paymentToken,
        cardHolder: dto.cardHolder,
        encryptedCard: dto.encryptedCard,
        capture: dto.capture,
        channel: dto.channel,
        statementDescriptor: dto.statementDescriptor,
        localDatetime: dto.localDatetime,
        remoteIp: dto.remoteIp,
        notificationDisabled: dto.notificationDisabled,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        locality: dto.locality,
        neighborhood: dto.neighborhood,
        city: dto.city,
        regionCode: dto.regionCode,
        postalCode: dto.postalCode,
        cep: dto.cep,
        cryptoCurrency: dto.cryptoCurrency,
        orderHash: dto.orderHash,
        ipAddress: dto.ipAddress,
        cancelUrl: dto.cancelUrl,
        amountLimit: dto.amountLimit,
        refundable: dto.refundable,
        sig: dto.sig,
        correlationId: dto.orderId,
        quantity: dto.quantity,
        itemName: dto.itemName,
        itemLink: dto.itemLink,
        itemWeight: dto.itemWeight,
        itemId: dto.itemId,
        shippingType: dto.shippingType,
        sandbox: dto.sandbox,
        payvexReference,
        metadata: {
          ...(dto.metadata || {}),
          apiKeyId,
          source: 'plugin',
          payvexReference,
        },
      },
      credentials,
    );

    const externalId = created.externalId || '';

    await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        currency: dto.currency || 'BRL',
        paymentMethod: paymentMethod as PaymentMethod,
        gateway: gatewayName,
        externalId,
        filialId: apiKey.filialId,
        status: (created.status as TransactionStatus) || TransactionStatus.PENDING,
        pixQrCode: created.pixQrCode || undefined,
        paymentUrl: created.paymentUrl || undefined,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        customerDocument: dto.customerDocument,
        metadata: {
          ...(dto.metadata || {}),
          apiKeyId,
          source: 'plugin',
          payvexReference,
          gatewayResponse: created.rawResponse,
        },
      },
    });

    return {
      id: externalId || null,
      paymentUrl: created.paymentUrl || null,
      pixQrCode: created.pixQrCode || null,
      status: created.status || 'PENDING',
    };
  }

  async findTransactionForApiKey(apiKeyId: string, externalId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { filialId: true },
    });

    if (!apiKey) {
      throw new NotFoundException('Api Key não encontrada.');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        filialId: apiKey.filialId,
        externalId,
      },
      select: {
        id: true,
        externalId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        gateway: true,
        paymentUrl: true,
        pixQrCode: true,
        customerEmail: true,
        customerName: true,
        customerDocument: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada para esta API Key.');
    }

    return transaction;
  }

  private normalizePaymentMethod(paymentMethod: string) {
    const normalized = String(paymentMethod || '').toUpperCase().replace(/[\s-]+/g, '_');
    const map: Record<string, PaymentMethod> = {
      PIX: PaymentMethod.PIX,
      BOLETO: PaymentMethod.BOLETO,
      BILLET: PaymentMethod.BOLETO,
      CREDIT_CARD: PaymentMethod.CREDIT_CARD,
      CREDITCARD: PaymentMethod.CREDIT_CARD,
      CARD: PaymentMethod.CREDIT_CARD,
      CARTAO: PaymentMethod.CREDIT_CARD,
      CARTAO_CREDITO: PaymentMethod.CREDIT_CARD,
      CRYPTO: PaymentMethod.CRYPTO,
      CRIPTO: PaymentMethod.CRYPTO,
    };

    return map[normalized] || (normalized as PaymentMethod);
  }

  private buildGatewayCredentials(gatewayName: string, filial: FilialType) {
    if (!this.MASTER_KEY) {
      throw new Error('Configuração de segurança (ENCRYPTION_KEY) ausente.');
    }

    const dec = (value?: string | null) =>
      value ? decryptWithKey(value, this.MASTER_KEY as string) : undefined;

    if (gatewayName.includes('STRIPE')) {
      return {
        secretKey: dec(filial?.stripeSecretKey),
        publicKey: dec(filial?.stripePublicKey),
        webhookSecret: dec(filial?.stripeWebhookSecret),
      };
    }

    if (gatewayName.includes('PAGARME') || gatewayName.includes('PAGAR_ME')) {
      return {
        apiKey: dec(filial?.pagarMeAccessToken),
        publicKey: dec(filial?.pagarMePublicKey),
      };
    }

    if (gatewayName.includes('PAGBANK') || gatewayName.includes('PAG_BANK')) {
      return {
        merchantId: filial?.cnpj || undefined,
        privateKey: dec(filial?.pagarBankPrivateKey),
        accessToken: dec(filial?.pagarBankPrivateKey),
        sandbox: !!filial?.pagarBankSandbox,
      };
    }

    if (gatewayName === 'ASAAS') {
      return {
        apiKey: dec(filial?.asaasApiKey),
        webhookToken: dec(filial?.asaasWebhookToken),
        sandbox: !!filial?.asaasSandbox,
      };
    }

    if (gatewayName.includes('CIELO') || gatewayName.includes('CIEL0')) {
      return {
        merchantId: dec(filial?.cieloMerchantId),
        merchantKey: dec(filial?.cieloMerchantKey),
        sandbox: filial?.cieloSandbox ?? false,
      };
    }

    if (gatewayName === 'STONE') {
      return {
        apiKey: dec(filial?.stoneApiKey),
        clientId: dec(filial?.stoneClientId),
        secret: dec(filial?.stoneSecret),
        sandbox: !!filial?.stoneSandbox,
      };
    }

    if (gatewayName.includes('NOW_PAYMENTS') || gatewayName.includes('NOWPAYMENTS')) {
      return {
        apiKey: dec(filial?.nowPaymentsApiKey),
        ipnSecret: dec(filial?.nowPaymentsIpnSecret),
      };
    }

    if (gatewayName.includes('COINBASE')) {
      return {
        apiKey: dec(filial?.coinbaseCommerceApiKey),
        webhookSecret: dec(filial?.coinbaseCommerceWebhookSecret),
      };
    }

    if (gatewayName.includes('BITPAY') || gatewayName.includes('BIT_PAY')) {
      return {
        token: dec(filial?.bitPayToken),
        sandbox: !!filial?.bitPaySandbox,
      };
    }

    if (gatewayName === 'PICPAY') {
      return {
        apiKey: dec(filial?.picPayPublicKey),
        clientId: dec(filial?.picPayClientId),
        clientSecret: dec(filial?.picPayClientSecret),
        sellerToken: dec(filial?.picPaySellerToken),
        merchantId: filial?.cnpj || undefined,
      };
    }

    if (gatewayName.includes('PAGSEGURO')) {
      return {
        email: dec(filial?.pagSeguroEmail),
        token: dec(filial?.pagSeguroToken),
        salt: dec(filial?.pagSeguroSalt),
        sandbox: filial?.pagSeguroSandbox ?? false,
      };
    }

    if (gatewayName.includes('WOO') && gatewayName.includes('COMMERCE')) {
      return {
        url: dec(filial?.woocommerceUrl),
        consumerKey: dec(filial?.woocommerceConsumerKey),
        consumerSecret: dec(filial?.woocommerceConsumerSecret),
      };
    }

    if (gatewayName.includes('NUVEM') && gatewayName.includes('SHOP')) {
      return {
        storeId: dec(filial?.nuvemShopStoreId),
        accessToken: dec(filial?.nuvemShopAccessToken),
      };
    }

    if (gatewayName === 'SHOPIFY') {
      return {
        baseUrl: dec(filial?.shopifyUrl),
        url: dec(filial?.shopifyUrl),
        accessToken: dec(filial?.shopifyAccessToken),
        shop: dec(filial?.shopifyStoreId),
        storeId: dec(filial?.shopifyStoreId),
        apiVersion: filial?.shopifyApiVersion || process.env.SHOPIFY_API_VERSION || '2026-07',
      };
    }

    return {
      secretKey: dec(filial?.mercadoPagoAccessToken),
      accessToken: dec(filial?.mercadoPagoAccessToken),
      webhookSecret: dec(filial?.mercadoPagoWebhookSecret),
      testMode: !!filial?.mercadoPagoTestMode,
    };
  }
}

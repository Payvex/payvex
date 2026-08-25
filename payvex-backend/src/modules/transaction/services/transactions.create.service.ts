/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import { GatewayFactory } from '../gateways/gateway.factory';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private gatewayFactory: GatewayFactory,
  ) {}

  // 🔑 Chave mestra centralizada para descriptografia
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  async create(dto: CreateTransactionDto, companyId: string) {
    // 🛡️ TRAVA 1: Validar Assinatura Ativa e Limite de Transações
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
    });

    if (!subscription || subscription.status !== 'ativo') {
      throw new ForbiddenException(
        'Sua assinatura está inativa ou pendente no Asaas.',
      );
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactionsCount = await this.prisma.transaction.count({
      where: {
        filial: { companyId },
        createdAt: { gte: startOfMonth },
      },
    });

    if (transactionsCount >= subscription.transactionsLimit) {
      throw new ForbiddenException(
        `Limite mensal de transações atingido (${subscription.transactionsLimit}). Realize um upgrade para continuar vendendo.`,
      );
    }

    // 1. Validação de Filial e Permissão
    const filial = await this.prisma.filial.findFirst({
      where: {
        id: dto.filialId,
        companyId: companyId,
      },
    });

    if (!filial) {
      throw new NotFoundException('Filial não encontrada ou acesso negado.');
    }

    // 2. Extração segura das credenciais
    const credentials = this.getGatewayCredentials(filial, dto.gateway);

    try {
      // 3. Obtenção do adaptador (Stripe/Mercado Pago)
      const adapter = this.gatewayFactory.getGateway(dto.gateway);
      const payvexReference = dto.metadata?.payvexReference || randomUUID();

      // 4. Execução do pagamento
      const gatewayResponse = await adapter.createPayment(
        { ...dto, payvexReference },
        credentials,
      );

      const metadata = {
        ...(dto.metadata || {}),
        payvexReference,
        gatewayResponse: gatewayResponse.rawResponse,
      };

      // 5. Persistência no banco de dados
      return await this.prisma.transaction.create({
        data: {
          amount: dto.amount,
          currency: dto.currency || 'BRL',
          paymentMethod: dto.paymentMethod,
          gateway: dto.gateway,
          filialId: dto.filialId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerDocument: dto.customerDocument,
          externalId: gatewayResponse.externalId,
          paymentUrl: gatewayResponse.paymentUrl,
          pixQrCode: gatewayResponse.pixQrCode,
          metadata: metadata as any,
          status: gatewayResponse.status || 'PENDING',
        },
      });
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Falha ao processar pagamento no provedor.',
      );
    }
  }

  /**
   * 📊 ESTATÍSTICAS DO DASHBOARD (O "Cérebro" da Payvex)
   * Retorna faturamento e volume de vendas.
   */
  async getDashboardStats(filialId: string, companyId: string) {
    // Garante que o usuário tem acesso a essa filial
    const filial = await this.prisma.filial.findFirst({
      where: { id: filialId, companyId },
    });
    if (!filial) throw new ForbiddenException('Acesso negado.');

    const transactions = await this.prisma.transaction.findMany({
      where: { filialId, status: 'PAID' },
    });

    const totalRevenue = transactions.reduce((sum, t) => {
      return sum + Number(t.amount);
      // Ou t.amount.toNumber() se o seu Prisma estiver configurado com decimal.js
    }, 0);
    const salesCount = transactions.length;

    return {
      totalRevenue,
      salesCount,
      averageTicket: salesCount > 0 ? totalRevenue / salesCount : 0,
    };
  }

  /**
   * 🔓 HELPER DE DESCRIPTOGRAFIA
   * Agora corrigido com os 2 argumentos exigidos pela security.util.
   */
  private getGatewayCredentials(filial: any, gateway: string) {
    if (!this.MASTER_KEY) {
      throw new Error('Configuração de segurança (ENCRYPTION_KEY) ausente.');
    }

    const gpt = gateway.toUpperCase().replace(/\s+/g, '_');
    const dec = (value?: string | null) =>
      value ? decryptWithKey(value, this.MASTER_KEY as string) : undefined;

    if (gpt === 'STRIPE') {
      if (!filial.stripeSecretKey)
        throw new ForbiddenException('Stripe não configurado.');

      return {
        secretKey: dec(filial.stripeSecretKey),
        publicKey: dec(filial.stripePublicKey),
        webhookSecret: dec(filial.stripeWebhookSecret),
      };
    }

    if (gpt === 'MERCADO_PAGO') {
      if (!filial.mercadoPagoAccessToken)
        throw new ForbiddenException('Mercado Pago não configurado.');

      return {
        secretKey: dec(filial.mercadoPagoAccessToken),
        accessToken: dec(filial.mercadoPagoAccessToken),
        webhookSecret: dec(filial.mercadoPagoWebhookSecret),
        testMode: !!filial.mercadoPagoTestMode,
      };
    }

    if (gpt === 'PAGARME' || gpt === 'PAGAR_ME') {
      if (!filial.pagarMeAccessToken)
        throw new ForbiddenException('Pagar.me não configurado.');

      return {
        apiKey: dec(filial.pagarMeAccessToken),
        publicKey: dec(filial.pagarMePublicKey),
      };
    }

    if (gpt === 'PAGBANK' || gpt === 'PAG_BANK') {
      if (!filial.pagarBankPrivateKey)
        throw new ForbiddenException('PagBank não configurado.');

      return {
        merchantId: filial.cnpj,
        privateKey: dec(filial.pagarBankPrivateKey),
        accessToken: dec(filial.pagarBankPrivateKey),
        sandbox: !!filial.pagarBankSandbox,
      };
    }

    if (gpt === 'ASAAS') {
      if (!filial.asaasApiKey)
        throw new ForbiddenException('Asaas não configurado.');

      return {
        apiKey: dec(filial.asaasApiKey),
        webhookToken: dec(filial.asaasWebhookToken),
        sandbox: !!filial.asaasSandbox,
      };
    }

    if (gpt === 'CIELO' || gpt === 'CIEL0') {
      if (!filial.cieloMerchantId || !filial.cieloMerchantKey)
        throw new ForbiddenException('Cielo não configurado.');

      return {
        merchantId: dec(filial.cieloMerchantId),
        merchantKey: dec(filial.cieloMerchantKey),
        sandbox: !!filial.cieloSandbox,
      };
    }

    if (gpt === 'STONE') {
      if (!filial.stoneApiKey)
        throw new ForbiddenException('Stone não configurado.');

      return {
        apiKey: dec(filial.stoneApiKey),
        clientId: dec(filial.stoneClientId),
        secret: dec(filial.stoneSecret),
        sandbox: !!filial.stoneSandbox,
      };
    }

    if (gpt === 'NOW_PAYMENTS' || gpt === 'NOWPAYMENTS') {
      if (!filial.nowPaymentsApiKey)
        throw new ForbiddenException('NOWPayments não configurado.');

      return {
        apiKey: dec(filial.nowPaymentsApiKey),
        ipnSecret: dec(filial.nowPaymentsIpnSecret),
      };
    }

    if (gpt === 'COINBASE' || gpt === 'COINBASE_COMMERCE') {
      if (!filial.coinbaseCommerceApiKey)
        throw new ForbiddenException('Coinbase Commerce não configurado.');

      return {
        apiKey: dec(filial.coinbaseCommerceApiKey),
        webhookSecret: dec(filial.coinbaseCommerceWebhookSecret),
      };
    }

    if (gpt === 'BITPAY' || gpt === 'BIT_PAY') {
      if (!filial.bitPayToken)
        throw new ForbiddenException('BitPay não configurado.');

      return {
        token: dec(filial.bitPayToken),
        sandbox: !!filial.bitPaySandbox,
      };
    }

    if (gpt === 'PICPAY') {
      if (
        !filial.picPayPublicKey &&
        !(filial.picPayClientId && filial.picPayClientSecret)
      )
        throw new ForbiddenException('PicPay não configurado.');

      return {
        apiKey: dec(filial.picPayPublicKey),
        clientId: dec(filial.picPayClientId),
        clientSecret: dec(filial.picPayClientSecret),
        sellerToken: dec(filial.picPaySellerToken),
        merchantId: filial.cnpj,
      };
    }

    if (gpt === 'PAGSEGURO' || gpt === 'PAG_SEGURO') {
      if (!filial.pagSeguroEmail || !filial.pagSeguroToken)
        throw new ForbiddenException('PagSeguro não configurado.');

      return {
        email: dec(filial.pagSeguroEmail),
        token: dec(filial.pagSeguroToken),
        salt: dec(filial.pagSeguroSalt),
        sandbox: !!filial.pagSeguroSandbox,
      };
    }

    if (gpt === 'WOO_COMMERCE' || gpt === 'WOOCOMMERCE') {
      if (
        !filial.woocommerceUrl ||
        !filial.woocommerceConsumerKey ||
        !filial.woocommerceConsumerSecret
      ) {
        throw new ForbiddenException('WooCommerce não configurado.');
      }

      return {
        url: dec(filial.woocommerceUrl),
        consumerKey: dec(filial.woocommerceConsumerKey),
        consumerSecret: dec(filial.woocommerceConsumerSecret),
      };
    }

    if (gpt === 'NUVEM_SHOP' || gpt === 'NUVEMSHOP') {
      if (!filial.nuvemShopAccessToken || !filial.nuvemShopStoreId)
        throw new ForbiddenException('Nuvem Shop não configurada.');

      return {
        url: dec(filial.nuvemShopUrl),
        accessToken: dec(filial.nuvemShopAccessToken),
        storeId: dec(filial.nuvemShopStoreId),
      };
    }

    if (gpt === 'SHOPIFY') {
      if (!filial.shopifyUrl || !filial.shopifyAccessToken)
        throw new ForbiddenException('Shopify não configurada.');

      return {
        baseUrl: dec(filial.shopifyUrl),
        url: dec(filial.shopifyUrl),
        accessToken: dec(filial.shopifyAccessToken),
        shop: dec(filial.shopifyStoreId),
        storeId: dec(filial.shopifyStoreId),
        apiVersion: filial.shopifyApiVersion || process.env.SHOPIFY_API_VERSION || '2026-07',
      };
    }

    throw new BadRequestException('Gateway de pagamento não suportado.');
  }

  async findAllByFilial(filialId: string) {
    return this.prisma.transaction.findMany({
      where: { filialId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

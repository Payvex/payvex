/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

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

  /**
   * 💳 CRIAÇÃO DE TRANSAÇÃO
   * Orquestra a busca da filial, descriptografia das chaves e chamada ao gateway.
   */
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

    // Definir o início do mês atual para contagem de cota
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

      // 4. Execução do pagamento
      const gatewayResponse = await adapter.createPayment(dto, credentials);

      // 5. Persistência no banco de dados
      return await this.prisma.transaction.create({
        data: {
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          gateway: dto.gateway,
          filialId: dto.filialId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          externalId: gatewayResponse.externalId,
          paymentUrl: gatewayResponse.paymentUrl,
          pixQrCode: gatewayResponse.pixQrCode,
          metadata: gatewayResponse.rawResponse as any,
          status: 'PENDING',
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

    const gpt = gateway.toUpperCase();

    if (gpt === 'STRIPE') {
      if (!filial.stripeSecretKey)
        throw new ForbiddenException('Stripe não configurado.');

      return {
        secretKey: decryptWithKey(filial.stripeSecretKey, this.MASTER_KEY),
      };
    }

    if (gpt === 'MERCADO_PAGO') {
      if (!filial.mercadoPagoAccessToken)
        throw new ForbiddenException('Mercado Pago não configurado.');

      return {
        secretKey: decryptWithKey(
          filial.mercadoPagoAccessToken,
          this.MASTER_KEY,
        ),
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  // Retorna os dados da assinatura de uma empresa + contagem real de transações
  async getSubscriptionByCompany(companyId: string) {
    const [subscription, transactionCount] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { companyId } }),
      this.prisma.transaction.count({
        where: {
          filial: { companyId: companyId },
        },
      }),
    ]);

    if (!subscription) {
      throw new NotFoundException(
        'Assinatura não encontrada para esta empresa.',
      );
    }

    return {
      ...subscription,
      currentUsage: transactionCount, // Valor real do banco para a barra de progresso
    };
  }
}

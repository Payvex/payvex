import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { PAYVEX_PLANS } from '../interfaces/subscriptions.interface';

@Injectable()
export class UpgradeSubscriptionService {
  private readonly logger = new Logger(UpgradeSubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  async upgradePlan(companyId: string, planKey: string) {
    const planConfig = PAYVEX_PLANS[planKey as keyof typeof PAYVEX_PLANS];

    if (!planConfig) {
      throw new Error('Chave de plano inválida recebida do Asaas.');
    }

    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + 30);

    // 🚀 ATUALIZAÇÃO: Agora garantimos a limpeza de status 'pendente' ou 'atrasado'
    return await this.prisma.subscription.update({
      where: { companyId },
      data: {
        planName: planKey.toLowerCase(),
        status: 'ativo', // Reativa o acesso imediatamente após o pagamento
        usersLimit: planConfig.usersLimit,
        gatewaysLimit: planConfig.gatewaysLimit,
        transactionsLimit: planConfig.transactionsLimit,
        hasAiAnalyst: planConfig.hasAiAnalyst || false,
        multiAppLimit: planConfig.multiAppLimit || 1,
        prioritySupport: planConfig.prioritySupport || false,
        nextRenewalAt: nextRenewal,
        updatedAt: new Date(),
      },
    });
  }
}

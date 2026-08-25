/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class TransactionsFindAllService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filialId?: string) {
    return this.prisma.transaction.findMany({
      where: {
        filial: {
          companyId: companyId, // Segurança Multitenant
        },
        ...(filialId && { filialId }),
      },
      orderBy: { createdAt: 'desc' },
      include: { filial: true }, // Opcional: para trazer dados da filial junto
    });
  }

  // 1. Cálculos de Estatísticas (Corrigido para filtrar via Filial)
  async getStats(companyId: string, filialId?: string, gateway?: string) {
    const where: any = {
      // Em vez de companyId direto, filtramos pela relação com a filial
      filial: {
        companyId: companyId,
      },
      ...(filialId && { filialId }),
      ...(gateway && { gateway: gateway.toUpperCase() }),
    };

    const stats = await this.prisma.transaction.groupBy({
      by: ['status'],
      where,
      _sum: {
        amount: true,
        fee: true,
        netAmount: true,
      },
      _count: { id: true },
    });

    const paid = stats.find((s) => s.status === 'PAID');
    const pending = stats.find((s) => s.status === 'PENDING');

    return {
      totalSales: Number(paid?._sum.amount || 0),
      totalFees: Number(paid?._sum.fee || 0),
      totalNet: Number(paid?._sum.netAmount || 0),
      count: paid?._count.id || 0,
      pendingAmount: Number(pending?._sum.amount || 0),
    };
  }

  // 2. Dados para o Gráfico (Corrigido para filtrar via Filial)
  async getChartData(companyId: string, filialId?: string, gateway?: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {
      filial: {
        companyId: companyId,
      },
      status: 'PAID',
      createdAt: { gte: thirtyDaysAgo },
      ...(filialId && { filialId }),
      ...(gateway && { gateway: gateway.toUpperCase() }),
    };

    const dailyTransactions = await this.prisma.transaction.findMany({
      where,
      select: {
        createdAt: true,
        amount: true,
        netAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const chartMap = new Map();

    dailyTransactions.forEach((tx) => {
      const date = tx.createdAt.toISOString().split('T')[0];
      const current = chartMap.get(date) || { date, sales: 0, net: 0 };
      const amount = Number(tx.amount || 0);
      const netAmount = tx.netAmount === null ? amount : Number(tx.netAmount);
      chartMap.set(date, {
        date,
        sales: current.sales + amount,
        net: current.net + netAmount,
      });
    });

    return Array.from(chartMap.values());
  }
}

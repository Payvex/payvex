/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from 'src/prisma.service/prisma.service';

type FinancialContext = {
  subscription: {
    planName: string;
    hasAiAnalyst: boolean;
  };
  filters: {
    filialId?: string;
    gateway?: string;
    periodDays: number;
  };
  totals: {
    totalSales: number;
    totalNet: number;
    totalFees: number;
    pendingAmount: number;
    approvedCount: number;
    pendingCount: number;
    failedCount: number;
    canceledCount: number;
    averageTicket: number;
    feeRatePercent: number;
    approvalRatePercent: number;
  };
  byGateway: Array<Record<string, any>>;
  byPaymentMethod: Array<Record<string, any>>;
  dailySales: Array<Record<string, any>>;
  recentTransactions: Array<Record<string, any>>;
};

@Injectable()
export class FinancialAnalystService {
  private readonly groqApiKey = process.env.GROQ_API_KEY;
  private readonly groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  private readonly groqFallbackModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ];
  private readonly groqBaseUrl =
    process.env.GROQ_BASE_URL ||
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(private readonly prisma: PrismaService) {}

  async chat(
    companyId: string,
    data: {
      question: string;
      filialId?: string;
      gateway?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ) {
    const context = await this.buildFinancialContext(
      companyId,
      data.filialId,
      data.gateway,
    );

    if (!context.subscription.hasAiAnalyst) {
      throw new ForbiddenException(
        'IA Analítica disponível apenas no plano Enterprise/Expert AI.',
      );
    }

    if (!this.groqApiKey) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY não configurada no backend.',
      );
    }

    const completion = await this.createGroqCompletion(context, data);

    return {
      answer:
        completion.data?.choices?.[0]?.message?.content ||
        'Não consegui gerar uma análise agora.',
      model: completion.data?.model || this.groqModel,
      context,
      usage: completion.data?.usage || null,
    };
  }

  private async createGroqCompletion(
    context: FinancialContext,
    data: {
      question: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ) {
    const models = this.getModelCandidates();
    let lastModelNotFound: AxiosError<any> | null = null;

    for (const model of models) {
      try {
        return await axios.post(
          this.groqBaseUrl,
          {
            model,
            temperature: 0.25,
            max_completion_tokens: 900,
            messages: [
              {
                role: 'system',
                content: this.buildSystemPrompt(),
              },
              {
                role: 'user',
                content: `Contexto financeiro Payvex em JSON:\n${JSON.stringify(
                  context,
                  null,
                  2,
                )}`,
              },
              ...(data.messages || []).slice(-6),
              {
                role: 'user',
                content: data.question,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 20000,
          },
        );
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }

        const groqError = error as AxiosError<any>;
        if (this.isModelNotFound(groqError)) {
          lastModelNotFound = groqError;
          continue;
        }

        const message = groqError.response?.data?.error?.message;
        throw new ServiceUnavailableException(
          message || 'Groq indisponível no momento.',
        );
      }
    }

    if (lastModelNotFound) {
      throw new BadRequestException(
        `Nenhum modelo Groq configurado está disponível para esta chave/projeto. Tentados: ${models.join(
          ', ',
        )}. Confira os modelos ativos em /openai/v1/models no painel do Groq.`,
      );
    }

    throw new ServiceUnavailableException('Groq indisponível no momento.');
  }

  private getModelCandidates() {
    return Array.from(new Set([this.groqModel, ...this.groqFallbackModels]));
  }

  private isModelNotFound(error: AxiosError<any>) {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    return code === 'model_not_found' || status === 404;
  }

  private async buildFinancialContext(
    companyId: string,
    filialId?: string,
    gateway?: string,
  ): Promise<FinancialContext> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
      select: {
        planName: true,
        hasAiAnalyst: true,
      },
    });

    if (!subscription) {
      throw new ForbiddenException('Assinatura não encontrada.');
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const where: any = {
      filial: { companyId },
      createdAt: { gte: since },
      ...(filialId && { filialId }),
      ...(gateway && { gateway: gateway.toUpperCase() }),
    };

    const [transactions, statusGroups, gatewayGroups, methodGroups] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            externalId: true,
            amount: true,
            netAmount: true,
            fee: true,
            status: true,
            paymentMethod: true,
            gateway: true,
            createdAt: true,
            filial: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.transaction.groupBy({
          by: ['status'],
          where,
          _sum: { amount: true, netAmount: true, fee: true },
          _count: { id: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['gateway'],
          where,
          _sum: { amount: true, netAmount: true, fee: true },
          _count: { id: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['paymentMethod'],
          where,
          _sum: { amount: true, netAmount: true, fee: true },
          _count: { id: true },
        }),
      ]);

    const paid = statusGroups.find((item) => item.status === 'PAID');
    const pending = statusGroups.find((item) => item.status === 'PENDING');
    const failed = statusGroups.find((item) => item.status === 'FAILED');
    const canceled = statusGroups.find((item) => item.status === 'CANCELED');
    const totalCount = statusGroups.reduce(
      (sum, item) => sum + item._count.id,
      0,
    );
    const totalSales = Number(paid?._sum.amount || 0);
    const totalNet = Number(paid?._sum.netAmount || 0);
    const totalFees = Number(paid?._sum.fee || 0);
    const approvedCount = paid?._count.id || 0;
    const dailyMap = new Map<string, { date: string; sales: number; net: number; count: number }>();

    transactions.forEach((transaction) => {
      const day = transaction.createdAt.toISOString().split('T')[0];
      const current = dailyMap.get(day) || {
        date: day,
        sales: 0,
        net: 0,
        count: 0,
      };

      if (transaction.status === 'PAID') {
        current.sales += Number(transaction.amount || 0);
        current.net += Number(transaction.netAmount || transaction.amount || 0);
        current.count += 1;
      }

      dailyMap.set(day, current);
    });

    const normalizedPlan = subscription.planName
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const canUseAi =
      subscription.hasAiAnalyst ||
      ['expert_ai', 'enterprise', 'expert'].includes(normalizedPlan);

    return {
      subscription: {
        planName: subscription.planName,
        hasAiAnalyst: canUseAi,
      },
      filters: {
        filialId,
        gateway,
        periodDays: 30,
      },
      totals: {
        totalSales,
        totalNet,
        totalFees,
        pendingAmount: Number(pending?._sum.amount || 0),
        approvedCount,
        pendingCount: pending?._count.id || 0,
        failedCount: failed?._count.id || 0,
        canceledCount: canceled?._count.id || 0,
        averageTicket: approvedCount ? totalSales / approvedCount : 0,
        feeRatePercent: totalSales ? (totalFees / totalSales) * 100 : 0,
        approvalRatePercent: totalCount ? (approvedCount / totalCount) * 100 : 0,
      },
      byGateway: gatewayGroups.map((item) => ({
        gateway: item.gateway,
        count: item._count.id,
        amount: Number(item._sum.amount || 0),
        netAmount: Number(item._sum.netAmount || 0),
        fees: Number(item._sum.fee || 0),
      })),
      byPaymentMethod: methodGroups.map((item) => ({
        paymentMethod: item.paymentMethod,
        count: item._count.id,
        amount: Number(item._sum.amount || 0),
        netAmount: Number(item._sum.netAmount || 0),
        fees: Number(item._sum.fee || 0),
      })),
      dailySales: Array.from(dailyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      recentTransactions: transactions.map((transaction) => ({
        externalId: transaction.externalId,
        amount: Number(transaction.amount || 0),
        netAmount: Number(transaction.netAmount || transaction.amount || 0),
        fee: Number(transaction.fee || 0),
        status: transaction.status,
        gateway: transaction.gateway,
        paymentMethod: transaction.paymentMethod,
        filial: transaction.filial.name,
        createdAt: transaction.createdAt,
      })),
    };
  }

  private buildSystemPrompt() {
    return [
      'Você é a IA Analítica financeira da Payvex.',
      'Responda em português do Brasil, com clareza executiva e foco em ação.',
      'Use somente os dados fornecidos no contexto. Se faltar dado, diga o que precisa ser medido.',
      'Nunca invente receita, taxa, gateway ou tendência.',
      'Priorize: saúde financeira, liquidez, taxas, pendências, falhas, ticket médio, aprovação, concentração por gateway e próximos passos.',
      'Quando útil, entregue bullets curtos com: Diagnóstico, Risco, Oportunidade e Ação recomendada.',
      'Não dê aconselhamento financeiro regulado; trate como análise operacional de pagamentos.',
    ].join('\n');
  }
}

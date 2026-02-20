/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class AsaasService {
  private readonly baseUrl = process.env.ASAAS_BASE_URL;
  private readonly apiKey = process.env.ASAAS_API_KEY;

  private readonly axiosInstance = axios.create({
    baseURL: this.baseUrl,
    headers: { access_token: this.apiKey },
  });

  // Precisamos do Prisma para buscar os dados da empresa (CNPJ, Email, etc)
  constructor(private prisma: PrismaService) {}

  async createSubscription(data: {
    companyId: string;
    planKey: string;
    price: number;
    planName: string;
  }) {
    const customerId = await this.getOrCreateCustomer(data.companyId);

    // 1. Criar a Assinatura (Contrato mensal)
    const subResponse = await this.axiosInstance.post('/subscriptions', {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: data.price,
      nextDueDate: new Date().toISOString().split('T')[0], // Vencimento para HOJE
      cycle: 'MONTHLY',
      description: `Plano ${data.planName} - Payvex`,
      externalReference: `${data.companyId}:${data.planKey}`,
    });

    const subscriptionId = subResponse.data.id;

    // 2. Pequena espera (1 segundo) para o Asaas processar a geração da fatura
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Buscar a COBRANÇA (Payment) vinculada a esta assinatura
    // Filtramos pelo ID da assinatura que acabamos de criar
    const paymentsResponse = await this.axiosInstance.get(
      `/payments?subscription=${subscriptionId}`,
    );

    // Pegamos a primeira fatura da lista (a de hoje)
    const firstPayment = paymentsResponse.data.data[0];

    if (!firstPayment) {
      console.error('Fatura não encontrada para a assinatura:', subscriptionId);
      // Se falhar, retorna o que tem, mas o link virá null
      return subResponse.data;
    }

    // 4. Retornamos os dados da assinatura COM a invoiceUrl da fatura real
    return {
      ...subResponse.data,
      invoiceUrl: firstPayment.invoiceUrl, // <--- AQUI ESTÁ O LINK DE PAGAMENTO!
      paymentId: firstPayment.id,
    };
  }
  // O MÉTODO QUE ESTAVA FALTANDO:
  private async getOrCreateCustomer(companyId: string): Promise<string> {
    // 1. Buscamos a Empresa incluindo o Admin e a Matriz
    const companyData = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: { where: { role: 'ADMIN' }, take: 1 },
        filiais: { take: 1 }, // Pega a filial criada no Signup
      },
    });

    if (!companyData || !companyData.users[0] || !companyData.filiais[0]) {
      throw new Error(
        'Dados para faturamento não encontrados (Admin ou Filial).',
      );
    }

    const admin = companyData.users[0];
    const matriz = companyData.filiais[0];

    // 2. Tenta encontrar cliente por email do Admin no Asaas
    const search = await this.axiosInstance.get(
      `/customers?email=${admin.email}`,
    );
    if (search.data.data.length > 0) return search.data.data[0].id;

    // 3. Cria novo cliente
    // IMPORTANTE: Use um CNPJ VÁLIDO no cadastro para evitar o erro 400
    const create = await this.axiosInstance.post('/customers', {
      name: companyData.name,
      email: admin.email,
      cpfCnpj: matriz.cnpj.replace(/\D/g, ''), // Limpa caracteres especiais
      phone: companyData.phone,
      externalReference: companyId,
    });

    return create.data.id;
  }
}

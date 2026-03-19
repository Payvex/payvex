/* eslint-disable prettier/prettier */
 

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

export interface CreateFilialInput {
  name: string;
  cnpj: string; // Agora obrigatório para bater com o Prisma
  companyId: string;
  role: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

@Injectable()
export class CreateFilialService {
  constructor(private prisma: PrismaService) {}

  async execute(input: CreateFilialInput) {
    const { name, cnpj, companyId, role, cep, logradouro, bairro, cidade, uf } =
      input;

    // 1. Verificação de Permissão: Apenas ADMIN
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem criar filiais.',
      );
    }

    try {
      // 2. Verificação de Quota e Existência de CNPJ em paralelo
      const [subscription, filialCount, existingCnpj] = await Promise.all([
        this.prisma.subscription.findUnique({
          where: { companyId },
          select: { gatewaysLimit: true, status: true },
        }),
        this.prisma.filial.count({
          where: { companyId },
        }),
        this.prisma.filial.findUnique({
          where: { cnpj },
        }),
      ]);

      // 3. Validações de Regra de Negócio
      if (existingCnpj) {
        throw new ConflictException(
          'Este CNPJ já está cadastrado em uma filial.',
        );
      }

      if (!subscription || subscription.status !== 'ativo') {
        throw new ForbiddenException('Assinatura inativa ou não encontrada.');
      }

      if (filialCount >= subscription.gatewaysLimit) {
        throw new UnprocessableEntityException(
          `Limite de ${subscription.gatewaysLimit} filiais atingido.`,
        );
      }

      // 4. Criação no Banco
      return await this.prisma.filial.create({
        data: {
          name,
          cnpj,
          companyId,
          cep,
          logradouro,
          bairro,
          cidade,
          uf,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          cnpj: true,
          cidade: true,
          uf: true,
          createdAt: true,
        },
      });
    } catch (error: unknown) {
      // Tratamento seguro do erro para evitar o "Unsafe assignment"
      if (
        error instanceof ForbiddenException ||
        error instanceof UnprocessableEntityException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Erro ao processar criação da filial',
      );
    }
  }
}

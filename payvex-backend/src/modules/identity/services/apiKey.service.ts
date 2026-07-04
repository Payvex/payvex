/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  private generateWebhookSecret() {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }

  async create(name: string, filialId: string, companyId: string) {
    const filial = await this.prisma.filial.findFirst({
      where: { id: filialId, companyId },
    });

    if (!filial) throw new ForbiddenException('Filial inválida.');

    const key = `px_live_${randomBytes(24).toString('hex')}`;
    const webhookSecret = this.generateWebhookSecret();

    return this.prisma.apiKey.create({
      data: {
        name,
        key,
        webhookSecret,
        filialId,
        isActive: true, // Garante que nasce ativa
      },
      include: {
        filial: { select: { name: true } },
      },
    });
  }

  // src/modules/identity/services/apiKey.service.ts

  // src/modules/identity/services/apiKey.service.ts

  async findAll(companyId: string) {
    // 1. Pega apenas os IDs das filiais que pertencem à empresa logada
    const filiais = await this.prisma.filial.findMany({
      where: { companyId: companyId },
      select: { id: true, name: true },
    });

    const idsFiliais = filiais.map((f) => f.id);

    // Se a empresa não tiver filiais, retorna array vazio logo
    if (idsFiliais.length === 0) return [];

    // 2. Busca as chaves que estão vinculadas a esses IDs de filiais
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const keys = await this.prisma.apiKey.findMany({
      where: {
        filialId: { in: idsFiliais },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Monta o objeto final injetando o nome da filial manualmente
    return keys.map((key) => ({
      ...key,
      webhookSecretPreview: `${key.webhookSecret.slice(0, 10)}...`,
      webhookSecret: undefined,
      filial: {
        name: filiais.find((f) => f.id === key.filialId)?.name || 'Unidade',
      },
    }));
  }
  async revoke(id: string, companyId: string) {
    return this.prisma.apiKey.updateMany({
      where: {
        id,
        filial: { companyId },
      },
      data: { isActive: false },
    });
  }

  async updateWebhook(
    id: string,
    companyId: string,
    webhookUrl?: string,
  ) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id,
        filial: { companyId },
      },
      select: { id: true },
    });

    if (!apiKey) {
      throw new ForbiddenException('Api Key inválida para esta empresa.');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        webhookUrl: webhookUrl?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        isActive: true,
        filialId: true,
        createdAt: true,
      },
    });
  }

  async getPluginConfig(key: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        key,
        isActive: true,
      },
      include: {
        filial: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new ForbiddenException('Api Key inválida ou inativa.');
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPreview: `${apiKey.key.slice(0, 14)}...`,
      webhookUrl: apiKey.webhookUrl,
      webhookSecretPreview: `${apiKey.webhookSecret.slice(0, 10)}...`,
      isActive: apiKey.isActive,
      filial: apiKey.filial,
    };
  }

  async updateWebhookByKey(key: string, webhookUrl?: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        key,
        isActive: true,
      },
      select: { id: true },
    });

    if (!apiKey) {
      throw new ForbiddenException('Api Key inválida ou inativa.');
    }

    return this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        webhookUrl: webhookUrl?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        isActive: true,
        filialId: true,
        createdAt: true,
      },
    });
  }

  async rotateWebhookSecret(id: string, companyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id,
        filial: { companyId },
      },
      select: { id: true },
    });

    if (!apiKey) {
      throw new ForbiddenException('Api Key inválida para esta empresa.');
    }

    const webhookSecret = this.generateWebhookSecret();

    return this.prisma.apiKey.update({
      where: { id },
      data: { webhookSecret },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        webhookSecret: true,
        isActive: true,
        filialId: true,
        createdAt: true,
      },
    });
  }
}

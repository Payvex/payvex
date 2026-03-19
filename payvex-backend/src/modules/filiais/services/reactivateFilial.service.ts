/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

// Interface para tipar o input único
export interface ReactivateFilialInput {
  filialId: string;
  companyId: string;
  role: string;
}

@Injectable()
export class ReactivateFilialService {
  constructor(private prisma: PrismaService) {}

  // Ajustado para receber apenas 1 argumento (o objeto input)
  async execute(input: ReactivateFilialInput) {
    const { filialId, companyId, role } = input;

    if (role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem reativar filiais.',
      );
    }

    const filial = await this.prisma.filial.findFirst({
      where: { id: filialId, companyId },
    });

    if (!filial) {
      throw new NotFoundException('Unidade de negócio não encontrada.');
    }

    try {
      return await this.prisma.filial.update({
        where: { id: filialId },
        data: { isActive: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao reativar a unidade.');
    }
  }
}

/* eslint-disable prettier/prettier */
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

export interface DeleteFilialInput {
  filialId: string;
  companyId: string;
  role: string;
}

@Injectable()
export class DeleteFilialService {
  constructor(private prisma: PrismaService) {}

  async execute(input: DeleteFilialInput) {
    const { filialId, companyId, role } = input;

    // 1. Verificação de Permissão: Apenas ADMIN
    // (O role já vem corrigido do seu JwtStrategy agora!)
    if (role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem desativar filiais.',
      );
    }

    // 2. Verificar se a filial existe e pertence à empresa do usuário
    const filial = await this.prisma.filial.findFirst({
      where: {
        id: filialId,
        companyId: companyId,
      },
    });

    if (!filial) {
      throw new NotFoundException(
        'Filial não encontrada ou você não tem permissão para esta ação.',
      );
    }

    try {
      // 3. EXECUÇÃO DO SOFT DELETE
      // Marcamos como inativo para liberar quota e ocultar do dashboard
      await this.prisma.filial.update({
        where: { id: filialId },
        data: { isActive: false },
      });

      return {
        message:
          'Filial desativada com sucesso. Dados preservados para histórico.',
        id: filialId,
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Falha ao desativar filial.',
      );
    }
  }
}

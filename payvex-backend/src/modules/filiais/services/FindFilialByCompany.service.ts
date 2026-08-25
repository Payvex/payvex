import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class FindFilialByCompanyService {
  constructor(private prisma: PrismaService) {}

  async execute(filialId: string, companyId: string) {
    const filial = await this.prisma.filial.findFirst({
      where: {
        id: filialId,
        companyId: companyId, // Garante que a filial pertence a esta empresa
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        stripePublicKey: true,
        // Mantemos os segredos ocultos por segurança
      },
    });

    if (!filial) {
      throw new NotFoundException(
        'Filial não encontrada ou não pertence a esta empresa.',
      );
    }

    return filial;
  }
}

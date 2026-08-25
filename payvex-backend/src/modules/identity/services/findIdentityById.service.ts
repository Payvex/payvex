import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class FindIdentityByIdService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const identity = await this.prisma.user.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            filiais: true, // 🛡️ Buscamos as filiais para pegar o CNPJ
          },
        },
      },
    });
    return identity;
  }
}

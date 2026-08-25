import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class FindAllFilialService {
  constructor(private prisma: PrismaService) {}

  async FindAll() {
    const filiais = await this.prisma.filial.findMany({
      select: {
        id: true,
        name: true,
        companyId: true,
        stripePublicKey: true,
      },
    });

    return filiais;
  }
}

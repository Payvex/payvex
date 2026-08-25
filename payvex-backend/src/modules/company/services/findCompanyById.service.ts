import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class FindCompanyByIdService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return await this.prisma.company.findUnique({
      where: { id },
      include: {
        filiais: true, // Traz o array de filiais
        subscription: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            companyId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }
}

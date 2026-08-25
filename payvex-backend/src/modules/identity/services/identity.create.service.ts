import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException, // Para o erro de quota
} from '@nestjs/common';
import { Role } from '@prisma/client'; // Importe Role e User
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { CreateUserDto } from '../dtos/identity.create.dtos';

export type AuthenticatedUser = {
  id: string;
  companyId: string;
  role: Role;
  email: string;
};

@Injectable()
export class IdentityCreateService {
  constructor(private prisma: PrismaService) {}

  async createCollaborator(dto: CreateUserDto, adminUser: AuthenticatedUser) {
    if (adminUser.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem adicionar usuários.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const companyId = adminUser.companyId;

    // 3. VERIFICAR QUOTA DE USUÁRIOS (A lógica do SaaS)
    const [subscription, userCount] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { companyId: companyId },
        select: { usersLimit: true }, // Só precisamos do limite
      }),
      this.prisma.user.count({
        where: { companyId: companyId },
      }),
    ]);

    if (!subscription) {
      throw new Error(`Assinatura não encontrada para a empresa ${companyId}.`);
    }

    if (userCount >= subscription.usersLimit) {
      throw new UnprocessableEntityException(
        `Limite de ${subscription.usersLimit} usuários atingido. Por favor, atualize seu plano para adicionar mais usuários.`,
      );
    }

    // 4. CRIAR O NOVO USUÁRIO
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: passwordHash,
        role: dto.role,
        companyId: companyId,
      },
    });
    const { passwordHash: _, ...result } = newUser;

    return result;
  }
}

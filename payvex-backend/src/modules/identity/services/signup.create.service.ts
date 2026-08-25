import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { SignupDto } from '../dtos/signup.dto';

export type AuthenticatedUser = {
  id: string;
  companyId: string;
  role: Role;
  email: string;
};

@Injectable()
export class singupCreateService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // SERVIÇO 1: SIGNUP (O PRIMEIRO ADMIN)
  // ------------------------------------------------------------------
  async signup(dto: SignupDto) {
    // 1. Checar se o email ou CNPJ já existem
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.userEmail },
    });
    if (existingUser) {
      throw new ConflictException('O e-mail informado já está em uso.');
    }

    const existingCompany = await this.prisma.company.findFirst({
      where: {
        filiais: {
          some: { cnpj: { in: dto.filiais.map((f) => f.cnpj) } },
        },
      },
    });
    if (existingCompany) {
      throw new ConflictException('O CNPJ informado já está em uso.');
    }

    // 2. Criptografar a senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.userPassword, saltRounds);

    // 3. A MÁGICA: Transação de Banco de Dados
    // Isso garante que ou TUDO é criado, ou NADA é criado.
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 3.1. Criar a Empresa (Company)
        const newCompany = await tx.company.create({
          data: {
            name: dto.companyName,
            postalCode: dto.postalCode,
            address: dto.address,
            neighborhood: dto.neighborhood,
            State: dto.state,
            City: dto.city,
            phone: dto.phone,
            filiais: {
              create: dto.filiais.map((f) => ({
                name: f.name || 'Matriz',
                cnpj: f.cnpj,
              })),
            },
          },
        });

        // 3.2. Criar a Assinatura (Subscription) inicial
        // Por padrão, já cria no plano 'trial'
        await tx.subscription.create({
          data: {
            companyId: newCompany.id,
            planName: 'trial',
            status: 'ativo',
            // Limites padrão do 'trial' (do schema.prisma)
            usersLimit: 3,
            gatewaysLimit: 1,
            transactionsLimit: 100,
          },
        });

        // 3.3. Criar o primeiro Usuário (User) como ADMIN da conta
        const newUser = await tx.user.create({
          data: {
            name: dto.userName,
            email: dto.userEmail,
            passwordHash: passwordHash,
            role: 'ADMIN', // <-- AQUI! O primeiro usuário é sempre ADMIN
            companyId: newCompany.id, // Liga o usuário à empresa
          },
        });

        // Retorna o usuário criado (sem o hash)
        const { passwordHash: _, ...userResult } = newUser;
        return { user: userResult, company: newCompany };
      });

      return result;
    } catch (error) {
      // Se a transação falhar, o Prisma faz o rollback
      console.error(error);
      throw new InternalServerErrorException(
        'Falha ao criar a conta. Por favor, tente novamente.',
        error,
      );
    }
  }
}

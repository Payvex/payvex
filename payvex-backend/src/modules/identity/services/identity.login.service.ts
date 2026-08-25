/* eslint-disable @typescript-eslint/no-unused-vars */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { LoginDto } from '../dtos/identity.login.dto';

@Injectable()
export class identityLoginService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // 1. Busca o usuário incluindo campos necessários para o Sidebar
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // 2. Validação da senha
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // 3. SEGURANÇA: Removemos o passwordHash dos dados que vão para o Front
    const { passwordHash, ...userWithoutPassword } = user;

    // 4. Payload do JWT (Informações que ficam "dentro" do token)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    // 5. Retorno completo para a Payvex Sidebar
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: userWithoutPassword, // Aqui vai o nome, e-mail, id, role, etc.
    };
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // Ajuste conforme seu projeto
import { CreateUserDto } from '../dtos/identity.create.dtos';
import { IdentityCreateService } from '../services/identity.create.service';
import { AuthenticatedUser } from '../services/signup.create.service'; // Ajuste conforme seu projeto

@Controller('identity')
@UseGuards(JwtAuthGuard)
export class CreateIdentityController {
  constructor(private readonly identityService: IdentityCreateService) {}

  @Post('create')
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    const adminUser: AuthenticatedUser = req.user;

    return this.identityService.createCollaborator(dto, adminUser);
  }
}

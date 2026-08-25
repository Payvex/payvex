/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateFilialDto } from '../dto/create-filial.dto'; // Recomendado criar um DTO para validação
import { CreateFilialService } from '../services/createFilial.service';

@Controller('filiais')
export class createFilialController {
  constructor(private readonly createFilialService: CreateFilialService) {}

  /**
   * 🏢 Rota para criação de uma nova filial
   * POST /filiais
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() dto: CreateFilialDto) {
    // Extraímos os dados do usuário logado através do Request (preenchido pelo JWT Guard)

    return await this.createFilialService.execute({
      ...dto,
      companyId: req.user.companyId,
      role: req.user.role,
    });
  }
}

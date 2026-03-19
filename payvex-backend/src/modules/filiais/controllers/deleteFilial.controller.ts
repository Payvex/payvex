/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Controller, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { DeleteFilialService } from '../services/deleteFililal.service'; // Verifique o nome aqui

@Controller('unidades-negocio') // Use um nome de rota mais genérico, como "unidades-negocio"
export class DeleteFilialController {
  // PascalCase no nome da classe
  constructor(private readonly deleteFilialService: DeleteFilialService) {}

  @Delete('desativar/:id')
  @UseGuards(JwtAuthGuard)
  async remove(@Request() req: any, @Param('id') id: string) {
    // O 401 acontece ANTES de entrar aqui.
    // Se entrar aqui, o console.log abaixo aparecerá:
    console.log('Usuário autenticado:', req.user);

    return await this.deleteFilialService.execute({
      filialId: id,
      companyId: req.user.companyId,

      role: req.user.role,
    });
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ReactivateFilialService } from '../services/reactivateFilial.service';

@Controller('unidades-negocio/reactivate')
export class ReactivateFilialController {
  constructor(private readonly reactivateService: ReactivateFilialService) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async handle(@Request() req: any, @Param('id') id: string) {
    // Agora enviamos 1 objeto, que é o que o serviço espera.
    return await this.reactivateService.execute({
      filialId: id,
      companyId: req.user.companyId,
      role: req.user.role,
    });
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TransactionsFindAllService } from '../services/transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsFindAllController {
  constructor(
    private readonly transactionsService: TransactionsFindAllService,
  ) {}

  // 🚀 ADICIONE ESTE MÉTODO (O QUE ESTAVA DANDO 404)
  @Get()
  async findAll(@Req() req: any, @Query('filialId') filialId?: string) {
    return this.transactionsService.findAll(req.user.companyId, filialId);
  }

  @Get('stats')
  async getStats(
    @Req() req: any,
    @Query('filialId') filialId?: string,
    @Query('gateway') gateway?: string,
  ) {
    return this.transactionsService.getStats(
      req.user.companyId,
      filialId,
      gateway,
    );
  }

  @Get('chart')
  async getChartData(
    @Req() req: any,
    @Query('filialId') filialId?: string,
    @Query('gateway') gateway?: string,
  ) {
    return this.transactionsService.getChartData(
      req.user.companyId,
      filialId,
      gateway,
    );
  }
}

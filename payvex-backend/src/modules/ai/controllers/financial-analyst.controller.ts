/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FinancialAnalystChatDto } from '../dto/financial-analyst-chat.dto';
import { FinancialAnalystService } from '../services/financial-analyst.service';

@Controller('ai/financial-analyst')
@UseGuards(JwtAuthGuard)
export class FinancialAnalystController {
  constructor(
    private readonly financialAnalystService: FinancialAnalystService,
  ) {}

  @Post('chat')
  async chat(@Req() req: any, @Body() dto: FinancialAnalystChatDto) {
    return this.financialAnalystService.chat(req.user.companyId, dto);
  }
}

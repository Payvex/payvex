/* eslint-disable prettier/prettier */

import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import { TransactionsService } from '../services/transactions.create.service';

@Controller('transactions')
export class TransactionsCreateController {
  constructor(private transactionsService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @Request() req: { user: { companyId: string } },
  ) {
    const { companyId } = req.user;
    return this.transactionsService.create(dto, companyId);
  }
}
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
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key-auth.guard';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import { TransactionsService } from '../services/transactions.create.service';

// 1. Dica: Nomeie interfaces com letra maiúscula (padrão TS)
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
    email: string;
  };
}

@Controller('transactions')
export class TransactionsCreateController {
  constructor(private transactionsService: TransactionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  // 2. Tipamos o 'req' com a nossa interface para o VS Code nos ajudar
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // 3. CORREÇÃO DA SINTAXE: Pegamos o companyId direto de req.user
    const { companyId } = req.user;

    // 4. Passamos o DTO e o companyId para o service validar a posse da filial
    return this.transactionsService.create(dto, companyId);
  }

  @UseGuards(ApiKeyAuthGuard)
  @Post('/plugin/create')
  @HttpCode(HttpStatus.CREATED)
  async createTransactionByPlugin(
    @Body() dto: CreateTransactionDto,
    @Request() req: any,
  ) {
    const { companyId } = req.user;
    return this.transactionsService.create(dto, companyId);
  }
}

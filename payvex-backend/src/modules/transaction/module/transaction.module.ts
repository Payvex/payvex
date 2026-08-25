/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key-auth.guard';
import { AuthModule } from 'src/auth/modules/auth.module';
import { GatewayFactory } from '../gateways/gateway.factory';

// Seus controllers
import { TransactionsFindAllController } from '../controllers/transactions.controller';
import { TransactionsCreateController } from '../controllers/transactions.create.controller';
import { PluginTransactionsController } from '../controllers/plugin-transactions.controller';

// Seus serviços
import { TransactionsService } from '../services/transactions.create.service';
import { TransactionsFindAllService } from '../services/transactions.service';
import { PluginTransactionsService } from '../services/plugin-transactions.service';
import { WebhookModule } from '../webhooks/webhooks.module';

@Module({
  imports: [AuthModule, WebhookModule],

  controllers: [TransactionsCreateController, TransactionsFindAllController, PluginTransactionsController],
  providers: [
    TransactionsService,
    ApiKeyAuthGuard,
    GatewayFactory,
    TransactionsFindAllService,
    PluginTransactionsService,
  ],
})
export class TransactionsModule {}

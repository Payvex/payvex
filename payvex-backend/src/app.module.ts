import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CompanyModule } from './modules/company/module/company.module';
import { AiModule } from './modules/ai/ai.module';
import { FiliaisModule } from './modules/filiais/module/filiais.module';
import { IdentityModule } from './modules/identity/module/identity.module';
import { SubscriptionModule } from './modules/subscription/mudule/subscription.module';
import { TransactionsModule } from './modules/transaction/module/transaction.module';
import { WebhookModule } from './modules/transaction/webhooks/webhooks.module';
import { PrismaModule } from './prisma.service/prisma.module';

@Module({
  imports: [
    PrismaModule,
    IdentityModule,
    AiModule,
    CompanyModule,
    TransactionsModule,
    WebhookModule,
    FiliaisModule,
    SubscriptionModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        tls: {},
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

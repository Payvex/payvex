import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/modules/auth.module';
import { FinancialAnalystController } from './controllers/financial-analyst.controller';
import { FinancialAnalystService } from './services/financial-analyst.service';

@Module({
  imports: [AuthModule],
  controllers: [FinancialAnalystController],
  providers: [FinancialAnalystService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/modules/auth.module';

// Seus controllers
import { findAllCompanyController } from '../controllers/findAllCompany.controller';
import { FindCompanyByIdController } from '../controllers/findCompanyById.controller';
import { UpdateCompanyController } from '../controllers/updateCompany.controller';

// Seus serviços
import { FindAllCompanyService } from '../services/findAllCompany.service';
import { FindCompanyByIdService } from '../services/findCompanyById.service';
import { UpdateCompanyService } from '../services/updateCompany.service';

@Module({
  imports: [AuthModule],
  controllers: [
    UpdateCompanyController,
    findAllCompanyController,
    FindCompanyByIdController,
  ],
  providers: [
    UpdateCompanyService,
    FindAllCompanyService,
    FindCompanyByIdService,
  ],
})
export class CompanyModule {}

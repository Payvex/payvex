/* eslint-disable prettier/prettier */

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/modules/auth.module';

// Seus controllers
import { findAllCompanyController } from '../../company/controllers/findAllCompany.controller';
import { FindCompanyByIdController } from '../../company/controllers/findCompanyById.controller';
import { ApiKeyController } from '../controllers/apiKey.controller';
import { CreateIdentityController } from '../controllers/createIdentity.controller';
import { FindAllIdentityController } from '../controllers/findAllIdentity.service';
import { FindIdentityByIdController } from '../controllers/findIdentityById.controller';
import { identityLoginController } from '../controllers/identity.login.controller';
import { SignupController } from '../controllers/indentity.signup.controller';

// Seus serviços
import { PrismaService } from 'src/prisma.service/prisma.service';
import { FindAllCompanyService } from '../../company/services/findAllCompany.service';
import { FindCompanyByIdService } from '../../company/services/findCompanyById.service';
import { ApiKeyService } from '../services/apiKey.service';
import { FindAllIndetityService } from '../services/findAllIdentity.service';
import { FindIdentityByIdService } from '../services/findIdentityById.service';
import { IdentityCreateService } from '../services/identity.create.service';
import { identityLoginService } from '../services/identity.login.service';
import { singupCreateService } from '../services/signup.create.service';
import { WebhookService } from '../services/webhookApiKey.service';

@Module({
  imports: [AuthModule, HttpModule],

  controllers: [
    SignupController,
    identityLoginController,
    findAllCompanyController,
    FindAllIdentityController,
    FindIdentityByIdController,
    FindCompanyByIdController,
    CreateIdentityController,
    ApiKeyController,
  ],
  providers: [
    singupCreateService,
    identityLoginService,
    FindAllCompanyService,
    FindAllIndetityService,
    PrismaService,
    FindIdentityByIdService,
    FindCompanyByIdService,
    IdentityCreateService,
    ApiKeyService,
    WebhookService,
  ],
})
export class IdentityModule {}

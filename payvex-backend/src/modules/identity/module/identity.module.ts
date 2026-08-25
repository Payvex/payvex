/* eslint-disable prettier/prettier */

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key-auth.guard';
import { AuthModule } from 'src/auth/modules/auth.module';

// Seus controllers
import { ApiKeyController } from '../controllers/apiKey.controller';
import { PluginApiKeyController } from '../controllers/pluginApiKey.controller';
import { CreateIdentityController } from '../controllers/createIdentity.controller';
import { FindAllIdentityController } from '../controllers/findAllIdentity.service';
import { FindIdentityByIdController } from '../controllers/findIdentityById.controller';
import { identityLoginController } from '../controllers/identity.login.controller';
import { SignupController } from '../controllers/indentity.signup.controller';

// Seus serviços
import { ApiKeyService } from '../services/apiKey.service';
import { FindAllIndetityService } from '../services/findAllIdentity.service';
import { FindIdentityByIdService } from '../services/findIdentityById.service';
import { IdentityCreateService } from '../services/identity.create.service';
import { identityLoginService } from '../services/identity.login.service';
import { singupCreateService } from '../services/signup.create.service';
import { WebhookService as ApiKeyWebhookService } from '../services/webhookApiKey.service';

@Module({
  imports: [AuthModule, HttpModule],

  controllers: [
    SignupController,
    identityLoginController,
    FindAllIdentityController,
    FindIdentityByIdController,
    CreateIdentityController,
    ApiKeyController,
    PluginApiKeyController,
  ],
  providers: [
    singupCreateService,
    identityLoginService,
    FindAllIndetityService,
    FindIdentityByIdService,
    IdentityCreateService,
    ApiKeyService,
    ApiKeyWebhookService,
    ApiKeyAuthGuard,
  ],
  exports: [ApiKeyWebhookService, ApiKeyService],
})
export class IdentityModule {}

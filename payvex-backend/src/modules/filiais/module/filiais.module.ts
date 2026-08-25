import { Module } from '@nestjs/common';

// coontrollers //
import { createFilialController } from '../controllers/createFilial.controller';
import { DeleteFilialController } from '../controllers/deleteFilial.controller';
import { FiliaisController } from '../controllers/filiais.controller';
import { MercadoPagoGatewayController } from '../controllers/mercado-pago-gateway.controller';
import { WooCommerceGatewayController } from '../controllers/woocommerce-gateway.controller';
import { NuvemShopGatewayController } from '../controllers/nuvem-shop-gateway.controller';
import { ShopifyGatewayController } from '../controllers/shopify-gateway.controller';
import { FindAllFilialController } from '../controllers/findAllFilial.controller';
import { FindFilialByCompanyController } from '../controllers/FindFilialByCompany.controller';
import { ReactivateFilialController } from '../controllers/reactivateFilial.controller';

// services //
import { CreateFilialService } from '../services/createFilial.service';
import { DeleteFilialService } from '../services/deleteFililal.service';
import { FiliaisService } from '../services/filiais.service';
import { FindAllFilialService } from '../services/findAllFilial.service';
import { FindFilialByCompanyService } from '../services/FindFilialByCompany.service';
import { ReactivateFilialService } from '../services/reactivateFilial.service';

@Module({
  controllers: [
    FiliaisController,
    FindFilialByCompanyController,
    FindAllFilialController,
    createFilialController,
    DeleteFilialController,
    ReactivateFilialController,
    MercadoPagoGatewayController,
    ShopifyGatewayController,
    WooCommerceGatewayController,
    NuvemShopGatewayController,
  ],
  providers: [
    FiliaisService,
    FindFilialByCompanyService,
    FindAllFilialService,
    CreateFilialService,
    DeleteFilialService,
    ReactivateFilialService,
  ],
  exports: [FiliaisService], // Exportamos caso o TransactionsService precise dele
})
export class FiliaisModule {}

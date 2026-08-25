/* eslint-disable prettier/prettier */
 
 
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FiliaisService } from '../services/filiais.service';
import { WooCommerceAdapter } from '../../transaction/gateways/adapters/woocommerce.adapter';

interface JwtRequest {
  user: {
    id: string;
    companyId: string;
    role: string;
    email: string;
  };
}

@Controller('filiais')
export class WooCommerceGatewayController {
  private readonly wooCommerceAdapter = new WooCommerceAdapter();

  constructor(private readonly filiaisService: FiliaisService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/woocommerce/connect')
  async connect(
    @Param('id') filialId: string,
    @Body()
      body: {
        url?: string;
        consumerKey?: string;
        consumerSecret?: string;
      },
    @Request() req: JwtRequest,
  ) {
    if (!body?.url || !body?.consumerKey || !body?.consumerSecret) {
      throw new BadRequestException({
        message: 'url, consumerKey e consumerSecret são obrigatórios',
        code: 'MISSING_CREDENTIALS',
      } as unknown as object);
    }

    const credentials = {
      url: body.url.trim().replace(/\/+$/, ''),
      consumerKey: body.consumerKey.trim(),
      consumerSecret: body.consumerSecret.trim(),
    };

    const connected = await this.wooCommerceAdapter.validate(credentials);
    if (!connected) {
      throw new BadRequestException(
        'Credenciais WooCommerce inválidas ou sem acesso ao REST API.',
      );
    }

    const companyId = req.user.companyId;
    await this.filiaisService.connectWooCommerce(
      filialId,
      companyId,
      credentials.url,
      credentials.consumerKey,
      credentials.consumerSecret,
    );

    return {
      connected: true,
      filialId,
      url: credentials.url,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/woocommerce/disconnect')
  async disconnect(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    await this.filiaisService.disconnectWooCommerce(
      filialId,
      req.user.companyId,
    );

    return { connected: false, filialId };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/gateways/woocommerce/status')
  async status(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    const filial = await this.filiaisService.findFilialById(
      filialId,
      req.user.companyId,
    );

    const url = this.filiaisService.decryptGatewayValue(filial?.woocommerceUrl);
    const consumerKey = this.filiaisService.decryptGatewayValue(
      filial?.woocommerceConsumerKey,
    );
    const consumerSecret = this.filiaisService.decryptGatewayValue(
      filial?.woocommerceConsumerSecret,
    );

    const connected = await this.wooCommerceAdapter.validate({
      url,
      consumerKey,
      consumerSecret,
    });

    if (!connected) {
      return {
        connected: false,
        url: null,
      } as const;
    }

    return {
      connected: true,
      url: url || null,
    } as const;
  }
}

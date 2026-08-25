/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
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

interface JwtRequest {
  user: {
    id: string;
    companyId: string;
    role: string;
    email: string;
  };
}

@Controller('filiais')
export class MercadoPagoGatewayController {
  constructor(private readonly filiaisService: FiliaisService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/mercado-pago/connect')
  async connect(
    @Param('id') filialId: string,
    @Body() body: { accessToken?: string },
    @Request() req: JwtRequest,
  ) {
    if (!body?.accessToken) {
      throw new BadRequestException({
        message: 'accessToken é obrigatório',
        code: 'MISSING_ACCESS_TOKEN',
      } as unknown as object);
    }

    const companyId = req.user.companyId;
    return this.filiaisService.connectMercadoPago(
      filialId,
      companyId,
      body.accessToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/mercado-pago/disconnect')
  async disconnect(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    return this.filiaisService.disconnectMercadoPago(filialId, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/gateways/mercado-pago/status')
  async status(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    const filial = await this.filiaisService.findFilialById(
      filialId,
      req.user.companyId,
    );

    const token = filial?.mercadoPagoAccessToken
      ? this.filiaisService.decryptMercadoPagoToken(filial.mercadoPagoAccessToken)
      : null;

    if (!token) {
      return {
        connected: false,
        testMode: false,
        userId: null,
      } as const;
    }

    const testMode = token.includes('TEST-');

    try {
      const https = await import('https');
      const url = 'https://api.mercadopago.com/users/me';

      const user = await new Promise<Record<string, any>>((resolve, reject) => {
        https.get(
          url,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
          (response) => {
            let data = '';
            response.on('data', (chunk) => {
              data += chunk;
            });
            response.on('end', () => {
              if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                try {
                  resolve(JSON.parse(data));
                } catch {
                  reject(new Error('Falha ao ler resposta do Mercado Pago.'));
                }
              } else {
                reject(new Error(`Mercado Pago retornou ${response.statusCode}.`));
              }
            });
          },
        ).on('error', (error) => reject(error));
      });

      return {
        connected: true,
        testMode,
        userId: user?.id || null,
      } as const;
    } catch (error: any) {
      return {
        connected: false,
        testMode,
        userId: null,
        error: error?.message || 'Falha ao validar conexão com Mercado Pago.',
      } as const;
    }
  }
}

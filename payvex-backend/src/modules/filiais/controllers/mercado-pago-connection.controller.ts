import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FiliaisService } from '../services/filiais.service';

interface JwtRequest {
  user?: { companyId?: string };
}

@Controller('filiais')
export class MercadoPagoConnectionController {
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

    const companyId = req?.user?.companyId as string;
    const accessToken = body.accessToken;

    return this.filiaisService.connectMercadoPago(
      filialId,
      companyId,
      accessToken,
    );
  }
}

/* eslint-disable prettier/prettier */
import {
    Body,
    Controller,
    Param,
    Patch,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateGatewayConfigDto } from '../dto/update-gateway-config.dto';
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
export class FiliaisController {
  constructor(private readonly filiaisService: FiliaisService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':id/gateways')
  async updateGateways(
    @Param('id') filialId: string,
    @Body() dto: UpdateGatewayConfigDto,
    @Request() req: JwtRequest,
  ) {
    const { companyId } = req.user;

    return this.filiaisService.updateGatewayKeys(filialId, companyId, dto);
  }
}

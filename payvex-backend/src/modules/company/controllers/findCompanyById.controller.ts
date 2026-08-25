import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FindCompanyByIdService } from '../services/findCompanyById.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class FindCompanyByIdController {
  constructor(private findCompanyByIdService: FindCompanyByIdService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string, @Req() req: any) {
    if (req.user.companyId !== id) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }

    const company = await this.findCompanyByIdService.findById(id);
    return company;
  }
}

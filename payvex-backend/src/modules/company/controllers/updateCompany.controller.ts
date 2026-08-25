import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateCompanyDto } from '../dto/updateCompany.dto';
import { UpdateCompanyService } from '../services/updateCompany.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class UpdateCompanyController {
  constructor(private updateCompanyService: UpdateCompanyService) {}
  @Patch(':id')
  async updateCompany(
    @Param('id') id: string,
    @Body() data: UpdateCompanyDto,
    @Req() req: any,
  ) {
    if (req.user.companyId !== id || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }

    const updatedCompany = await this.updateCompanyService.updateCompany(
      id,
      data,
    );
    return updatedCompany;
  }
}

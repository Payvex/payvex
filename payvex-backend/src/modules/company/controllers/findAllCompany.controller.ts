import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common/enums/http-status.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FindAllCompanyService } from '../services/findAllCompany.service';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class findAllCompanyController {
  constructor(private findAllCompanyService: FindAllCompanyService) {}

  @Get('/all')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.findAllCompanyService.findAll();
  }
}

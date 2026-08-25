import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { FindAllIndetityService } from '../services/findAllIdentity.service';

@Controller('identity')
export class FindAllIdentityController {
  constructor(private findAllIndetityService: FindAllIndetityService) {}
  @Get('/users')
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.findAllIndetityService.findAll();
  }
}

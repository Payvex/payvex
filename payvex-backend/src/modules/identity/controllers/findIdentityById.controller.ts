import { Controller, Get, Param } from '@nestjs/common';
import { FindIdentityByIdService } from '../services/findIdentityById.service';

@Controller('identity')
export class FindIdentityByIdController {
  constructor(
    private readonly findIdentityByIdService: FindIdentityByIdService,
  ) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    const identity = await this.findIdentityByIdService.findById(id);
    return identity;
  }
}

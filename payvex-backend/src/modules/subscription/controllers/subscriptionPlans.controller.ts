/* eslint-disable prettier/prettier */
import { Controller, Get } from '@nestjs/common';
import { PAYVEX_PLANS } from '../interfaces/subscriptions.interface';

@Controller('plans')
export class PlansController {
  @Get()
  getPublicPlans() {
    return Object.entries(PAYVEX_PLANS).map(([key, value]) => ({
      ...value,
      key: key,
    }));
  }
}

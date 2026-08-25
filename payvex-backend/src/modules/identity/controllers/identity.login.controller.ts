import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LoginDto } from '../dtos/identity.login.dto';
import { identityLoginService } from '../services/identity.login.service';

@Controller('identity') // Continua na mesma rota base /identity
export class identityLoginController {
  constructor(private loginService: identityLoginService) {} // Injeta o LoginService

  @Post('/login') // Rota POST /identity/login
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe())
  async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto);
  }
}

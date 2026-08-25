import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
// 1. Importe o DTO que o body vai usar
import { SignupDto } from '../dtos/signup.dto';
// 2. Importe o SERVIÇO que você acabou de criar
import { singupCreateService } from '../services/signup.create.service';

@Controller('identity') // Rota base: /identity
export class SignupController {
  // 3. Injete o seu serviço no construtor
  constructor(private signupService: singupCreateService) {}

  /**
   * Rota PÚBLICA: POST /identity/signup
   * Para o cadastro de uma nova Empresa + Usuário Admin.
   */
  @Post('/signup')
  @HttpCode(HttpStatus.CREATED) // Retorna 201 Created em vez de 200 OK
  @UsePipes(new ValidationPipe()) // Valida o body automaticamente
  async signup(
    @Body() dto: SignupDto, // Pega o body e valida contra o SignupDto
  ) {
    // 4. Chama o método 'signup' do seu serviço e retorna o resultado
    return this.signupService.signup(dto);
  }
}

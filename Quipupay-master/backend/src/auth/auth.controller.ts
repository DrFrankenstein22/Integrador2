import { Body, Controller,HttpCode,HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditEvent } from '../audit/audit-event.decorator';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @AuditEvent({
    eventType: 'USER_REGISTERED',
    actorResponsePath: 'user.id',
  })
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado correctamente',
  })
  @ApiResponse({
    status: 409,
    description: 'DNI, teléfono o correo ya registrado',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

@Post('login')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: 'Autenticar usuario',
})
@ApiResponse({
  status: 200,
  description: 'Inicio de sesión exitoso',
})
@ApiResponse({
  status: 401,
  description: 'Credenciales incorrectas',
})
login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
}

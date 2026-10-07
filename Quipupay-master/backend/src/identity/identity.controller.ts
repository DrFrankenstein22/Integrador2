import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { OtpService } from './otp.service';

class RequestOtpDto {
  @IsString()
  @Matches(/^9\d{8}$/, { message: 'El celular debe tener 9 dígitos y empezar en 9' })
  phone: string;
}

class VerifyOtpDto {
  @IsString()
  challengeId: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code: string;
}

class RequestEmailOtpDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;
}

class VerifyEmailOtpDto {
  @IsString()
  challengeId: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code: string;
}

@ApiTags('Identity')
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly otpService: OtpService,
  ) {}

  @Get('dni/:dni')
  @ApiOperation({ summary: 'Consultar identidad por DNI' })
  @ApiResponse({ status: 200, description: 'Identidad encontrada' })
  @ApiResponse({ status: 404, description: 'DNI no encontrado' })
  @ApiResponse({ status: 503, description: 'Proveedor no configurado o no disponible' })
  findByDni(@Param('dni', ParseIntPipe) dni: number) {
    const value = String(dni).padStart(8, '0');
    return this.identityService.findByDni(value);
  }

  @Post('otp')
  @ApiOperation({ summary: 'Solicitar código de verificación del celular (SMS simulado)' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.otpService.request(dto.phone);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verificar el código del celular' })
  @ApiResponse({ status: 200, description: 'Código válido' })
  @ApiResponse({ status: 401, description: 'Código incorrecto' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verify(dto.challengeId, dto.code);
  }

  @Post('email-otp')
  @ApiOperation({ summary: 'Solicitar código de verificación del correo (vía Resend)' })
  @ApiResponse({ status: 503, description: 'El servicio de correo no está configurado' })
  requestEmailOtp(@Body() dto: RequestEmailOtpDto) {
    return this.otpService.requestEmail(dto.email);
  }

  @Post('email-otp/verify')
  @ApiOperation({ summary: 'Verificar el código del correo' })
  @ApiResponse({ status: 200, description: 'Código válido' })
  @ApiResponse({ status: 401, description: 'Código incorrecto' })
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.otpService.verifyEmail(dto.challengeId, dto.code);
  }
}

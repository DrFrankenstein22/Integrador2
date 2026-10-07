import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceInfoDto } from './device-info.dto';

export class RegisterDto {
  @IsString()
  @Length(8, 8, {
    message: 'El DNI debe contener exactamente 8 caracteres',
  })
  @Matches(/^\d{8}$/, {
    message: 'El DNI debe contener solo números',
  })
  dni: string;

  @IsString()
  @Matches(/^9\d{8}$/, {
    message: 'El teléfono debe tener 9 dígitos y comenzar con 9',
  })
  phone: string;

  // Vienen de la consulta a RENIEC que ya se hizo en el paso de DNI del
  // registro (ver identity.service.ts) — se guardan para poder saludar al
  // usuario por su nombre real en vez de un genérico "Usuario 1234".
  @IsString()
  @Length(1, 100, {
    message: 'El nombre no es válido',
  })
  firstName: string;

  @IsString()
  @Length(1, 100, {
    message: 'El apellido no es válido',
  })
  lastName: string;

  @IsOptional()
  @IsEmail({}, {
    message: 'El correo electrónico no es válido',
  })
  email?: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'La clave debe contener exactamente 6 dígitos',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Length(16, 64)
  kycSessionKey?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

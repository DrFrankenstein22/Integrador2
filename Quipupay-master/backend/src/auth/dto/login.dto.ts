import { IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceInfoDto } from './device-info.dto';

export class LoginDto {
  @IsString()
  @Length(8, 8, {
    message: 'El DNI debe contener exactamente 8 caracteres',
  })
  @Matches(/^\d{8}$/, {
    message: 'El DNI debe contener solo números',
  })
  dni: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'La clave debe contener exactamente 6 dígitos',
  })
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

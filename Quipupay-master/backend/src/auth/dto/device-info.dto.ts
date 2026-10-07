import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Identifica el dispositivo desde el que se registra/inicia sesión, para que
 * el backend pueda "reconocer" ese celular en próximos accesos (tabla
 * `devices.devices`, ya existía en el esquema pero sin usar). `deviceId` no
 * es una credencial ni un secreto: es un identificador generado una vez por
 * la app y guardado en el almacén seguro del teléfono — solo sirve para
 * correlacionar "este es el mismo aparato de antes".
 */
export class DeviceInfoDto {
  @IsString()
  @Length(8, 200)
  deviceId: string;

  @IsString()
  @Length(1, 40)
  platform: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  osVersion?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  appVersion?: string;
}

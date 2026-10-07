import { IsString, Length, Matches } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @Length(6, 6, { message: 'La clave debe tener 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'La clave debe contener solo números' })
  pin: string;
}

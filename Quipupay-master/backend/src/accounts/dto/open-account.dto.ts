import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class OpenAccountDto {
  @IsString()
  @Matches(/^[A-Z]+$/, { message: 'El código de producto no es válido' })
  productCode: string;

  @IsIn(['PEN', 'USD'], { message: 'La moneda debe ser PEN o USD' })
  currency: 'PEN' | 'USD';

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'El alias no puede superar los 120 caracteres' })
  alias?: string;

  @IsBoolean()
  acceptedContract: boolean;

  @IsString()
  @Length(6, 6, { message: 'La clave debe tener 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'La clave debe contener solo números' })
  pin: string;
}

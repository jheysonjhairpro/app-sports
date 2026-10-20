import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubirVoucherDto {
  /** Número de operación de Yape (opcional, ayuda a evitar vouchers repetidos) */
  @IsOptional() @IsString() @MinLength(4) @MaxLength(60)
  numeroOperacion?: string;

  /** Permite que class-validator acepte el campo de la imagen en multipart/form-data */
  @IsOptional()
  voucher?: any;
}

export class RechazarVoucherDto {
  @IsString() @MinLength(3) @MaxLength(250)
  motivo: string;
}
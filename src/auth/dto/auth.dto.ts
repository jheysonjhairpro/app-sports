import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  nombre: string;

  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @MaxLength(150, { message: 'El correo no puede exceder los 150 caracteres' })
  correo: string;

  @IsOptional()
  @Matches(/^9\d{8}$/, { message: 'El celular debe tener exactamente 9 dígitos y empezar con 9' })
  telefono?: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña es demasiado larga' })
  password: string;
}

export class VerificarRegistroDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo: string;
}

export class ReenviarCodigoDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  correo: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  correo: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MaxLength(72, { message: 'La contraseña es demasiado larga' })
  password: string;
}

export class RefreshDto {
  @IsString({ message: 'El token debe ser un texto válido' })
  @MinLength(20, { message: 'Token de refresco inválido' })
  @MaxLength(200, { message: 'Token de refresco inválido' })
  refreshToken: string;
}

// ───────────── Recuperar contraseña ─────────────
export class SolicitarRecuperacionDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  correo: string;
}

export class VerificarRecuperacionDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo: string;
}

export class RestablecerPasswordDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo: string;

  @IsString({ message: 'La nueva contraseña debe ser un texto' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La nueva contraseña es demasiado larga' })
  nuevaPassword: string;
}
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100)
  nombre: string;

  @IsEmail() @MaxLength(150)
  correo: string;

  @IsOptional() @Matches(/^[0-9+\s-]{7,20}$/, { message: 'Teléfono inválido' })
  telefono?: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password: string;
}

export class VerificarRegistroDto {
  @IsEmail()
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}

export class ReenviarCodigoDto {
  @IsEmail()
  correo: string;
}

export class LoginDto {
  @IsEmail()
  correo: string;

  @IsString() @MaxLength(72)
  password: string;
}

export class RefreshDto {
  @IsString() @MinLength(20) @MaxLength(200)
  refreshToken: string;
}

// ───────────── Recuperar contraseña ─────────────
export class SolicitarRecuperacionDto {
  @IsEmail()
  correo: string;
}

export class VerificarRecuperacionDto {
  @IsEmail()
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}

export class RestablecerPasswordDto {
  @IsEmail()
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;

  @IsString() @MinLength(8) @MaxLength(72)
  nuevaPassword: string;
}

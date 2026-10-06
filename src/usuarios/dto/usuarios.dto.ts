import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { aBooleano } from '../../common/utils/form.util';
import { PaginacionDto } from '../../common/dto/paginacion.dto';

const ROLES = ['usuario', 'administrador', 'super_admin'] as const;

export class ActualizarPerfilDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  nombre?: string;

  @IsOptional() @Matches(/^[0-9+\s-]{7,20}$/, { message: 'Teléfono inválido' })
  telefono?: string;

}

export class CrearUsuarioDto {
  @IsString() @MinLength(2) @MaxLength(100)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsOptional() @Matches(/^[0-9+\s-]{7,20}$/)
  telefono?: string;

  @IsString() @MinLength(8) @MaxLength(72)
  password: string;

  @IsIn(ROLES)
  rol: (typeof ROLES)[number];
}

export class ActualizarUsuarioDto extends ActualizarPerfilDto {
  @IsOptional() @Transform(aBooleano) @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsIn(ROLES)
  rol?: (typeof ROLES)[number];
}

export class ListarUsuariosDto extends PaginacionDto {
  @IsOptional() @IsIn(ROLES)
  rol?: (typeof ROLES)[number];

  @IsOptional() @IsString() @MaxLength(100)
  q?: string;
}

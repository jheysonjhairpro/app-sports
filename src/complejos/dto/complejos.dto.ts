import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginacionDto } from '../../common/dto/paginacion.dto';
import { aBooleano } from '../../common/utils/form.util';

export class CrearComplejoDto {
  @IsString() @MaxLength(120) nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() @MaxLength(200) direccion?: string;
  @IsOptional() @IsString() @MaxLength(80) ciudad?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitud?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitud?: number;
  @IsOptional() @IsString() @MaxLength(20) telefono?: string;
  /** Solo lo puede cambiar el super admin */
  @IsOptional() @Transform(aBooleano) @IsBoolean() destacado?: boolean;
  @IsOptional() @Transform(aBooleano) @IsBoolean() activo?: boolean;
}

export class ActualizarComplejoDto extends PartialType(CrearComplejoDto) {}

export class ListarComplejosDto extends PaginacionDto {
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  destacado?: boolean;

  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  /** Coordenadas del usuario (solo para ordenar por cercanía; no se guardan) */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng?: number;
}

export class AsignarAdminDto {
  @Type(() => Number) @IsInt() @Min(1)
  usuarioId: number;
}

import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class CrearPromocionDto {
  @Type(() => Number) @IsInt() @Min(1) complejoId: number;
  @IsString() @MaxLength(120) titulo: string;
  @IsOptional() @IsString() @MaxLength(250) descripcion?: string;
  @IsIn(['porcentaje', 'monto_fijo', 'dos_por_uno']) tipo: 'porcentaje' | 'monto_fijo' | 'dos_por_uno';
  /** % (1-100) o monto en soles. No aplica para dos_por_uno */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) valor?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  diasSemana?: number[];
  @IsOptional() @IsInt() @Min(0) @Max(23) horaDesde?: number;
  @IsOptional() @IsInt() @Min(1) @Max(24) horaHasta?: number;
  @Matches(FECHA) vigenteDesde: string;
  @Matches(FECHA) vigenteHasta: string;
  @IsOptional() @IsBoolean() activa?: boolean;
}

export class ActualizarPromocionDto extends PartialType(CrearPromocionDto) {}

export class ListarPromocionesDto {
  @Type(() => Number) @IsInt() @Min(1) complejoId: number;
}

import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
  ValidateNested,
} from 'class-validator';
import { aBooleano, aLista } from '../../common/utils/form.util';

export class CrearCanchaDto {
  @Type(() => Number) @IsInt() @Min(1) complejoId: number;
  @IsString() @MaxLength(100) nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999) precioHora: number;
  @IsOptional() @Transform(aLista) @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) servicios?: string[];
  @IsOptional() @Transform(aBooleano) @IsBoolean() activa?: boolean;
  @IsOptional() foto?: any;
}

export class ActualizarCanchaDto extends PartialType(CrearCanchaDto) {}

export class ListarCanchasDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) complejoId?: number;
}

export class DisponibilidadDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha: string;
}

export class HorarioItemDto {
  @IsInt() @Min(1) @Max(7) diaSemana: number; // 1=Lun ... 7=Dom
  @IsInt() @Min(0) @Max(23) horaInicio: number;
  @IsInt() @Min(1) @Max(24) horaFin: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class ReemplazarHorariosDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => HorarioItemDto)
  horarios: HorarioItemDto[];
}

import { EstadoReserva } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaginacionDto } from '../../common/dto/paginacion.dto';

export class CrearReservaDto {
  @IsInt() @Min(1) canchaId: number;

  /** Inicio en ISO 8601, en hora exacta. Ej: 2026-10-10T15:00:00.000Z */
  @IsDateString() inicio: string;

  /** Cantidad de horas seguidas (el máximo lo define MAX_HORAS_RESERVA) */
  @IsInt() @Min(1) @Max(12) horas: number;

  @IsOptional() @IsInt() @Min(1) promocionId?: number;
}

export class MotivoDto {
  @IsOptional() @IsString() @MaxLength(250) motivo?: string;
}

export class ListarReservasDto extends PaginacionDto {
  @IsOptional() @IsEnum(EstadoReserva) estado?: EstadoReserva;
}

export class ListarReservasAdminDto extends ListarReservasDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) complejoId?: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha?: string;
}

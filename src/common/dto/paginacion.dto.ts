import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginacionDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export function paginar(q: PaginacionDto) {
  const limit = q.limit ?? 20;
  const page = q.page ?? 1;
  return { take: limit, skip: (page - 1) * limit, page, limit };
}

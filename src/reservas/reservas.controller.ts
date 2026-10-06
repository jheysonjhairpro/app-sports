import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CrearReservaDto, ListarReservasAdminDto, ListarReservasDto, MotivoDto } from './dto/reservas.dto';
import { ReservasService } from './reservas.service';

@ApiTags('reservas')
@ApiBearerAuth()
@Controller('reservas')
export class ReservasController {
  constructor(private service: ReservasService) {}

  @Post()
  crear(@CurrentUser() u: AuthUser, @Body() dto: CrearReservaDto) {
    return this.service.crear(u, dto);
  }

  @Get('mias')
  mias(@CurrentUser() u: AuthUser, @Query() q: ListarReservasDto) {
    return this.service.mias(u, q);
  }

  @Roles('administrador', 'super_admin') @Get('admin')
  deAdmin(@CurrentUser() u: AuthUser, @Query() q: ListarReservasAdminDto) {
    return this.service.deAdmin(u, q);
  }

  @Get(':id')
  detalle(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(u, id);
  }

  @Patch(':id/cancelar')
  cancelar(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelar(u, id);
  }

  @Roles('administrador', 'super_admin') @Patch(':id/rechazar')
  rechazar(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: MotivoDto) {
    return this.service.rechazar(u, id, dto.motivo);
  }
}

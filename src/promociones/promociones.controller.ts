import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ActualizarPromocionDto, CrearPromocionDto, ListarPromocionesDto } from './dto/promociones.dto';
import { PromocionesService } from './promociones.service';

@ApiTags('promociones')
@ApiBearerAuth()
@Controller('promociones')
export class PromocionesController {
  constructor(private service: PromocionesService) {}

  @Get()
  vigentes(@Query() q: ListarPromocionesDto) {
    return this.service.vigentes(q.complejoId);
  }

  @Roles('administrador', 'super_admin') @Get('admin')
  todas(@CurrentUser() u: AuthUser, @Query() q: ListarPromocionesDto) {
    return this.service.todas(u, q.complejoId);
  }

  @Roles('administrador', 'super_admin') @Post()
  crear(@CurrentUser() u: AuthUser, @Body() dto: CrearPromocionDto) {
    return this.service.crear(u, dto);
  }

  @Roles('administrador', 'super_admin') @Patch(':id')
  actualizar(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarPromocionDto) {
    return this.service.actualizar(u, id, dto);
  }

  @Roles('administrador', 'super_admin') @Delete(':id')
  desactivar(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.desactivar(u, id);
  }
}

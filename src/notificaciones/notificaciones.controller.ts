import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private service: NotificacionesService) {}

  @Get()
  mias(@CurrentUser() u: AuthUser, @Query('noLeidas') noLeidas?: string) {
    return this.service.misNotificaciones(u.id, noLeidas === 'true');
  }

  @Patch('leer-todas')
  leerTodas(@CurrentUser() u: AuthUser) {
    return this.service.marcarTodas(u.id);
  }

  @Patch(':id/leida')
  leida(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.marcarLeida(u.id, id);
  }
}

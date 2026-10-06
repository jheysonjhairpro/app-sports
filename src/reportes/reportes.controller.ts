import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportesService, ResumenDto } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@Roles('administrador', 'super_admin')
@Controller('reportes')
export class ReportesController {
  constructor(private service: ReportesService) {}

  @Get('resumen')
  resumen(@CurrentUser() u: AuthUser, @Query() q: ResumenDto) {
    return this.service.resumen(u, q);
  }

  @Roles('super_admin') @Get('global')
  global() {
    return this.service.global();
  }

  @Get()
  listar(@CurrentUser() u: AuthUser) {
    return this.service.listar(u);
  }

  @Post()
  guardar(@CurrentUser() u: AuthUser, @Query() q: ResumenDto) {
    return this.service.guardar(u, q);
  }
}

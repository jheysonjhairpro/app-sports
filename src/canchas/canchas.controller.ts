import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OPCIONES_IMAGEN } from '../common/upload';
import { CanchasService } from './canchas.service';
import {
  ActualizarCanchaDto, CrearCanchaDto, DisponibilidadDto, ListarCanchasDto, ReemplazarHorariosDto,
} from './dto/canchas.dto';

@ApiTags('canchas')
@ApiBearerAuth()
@Controller('canchas')
export class CanchasController {
  constructor(private service: CanchasService) {}

  @Get()
  listar(@Query() q: ListarCanchasDto) {
    return this.service.listar(q.complejoId);
  }

  @Roles('administrador', 'super_admin') @Get('mias')
  mias(@CurrentUser() u: AuthUser) {
    return this.service.mias(u);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(id);
  }

  @Get(':id/disponibilidad')
  disponibilidad(@Param('id', ParseIntPipe) id: number, @Query() q: DisponibilidadDto) {
    return this.service.disponibilidad(id, q.fecha);
  }

  /** multipart/form-data: campos de la cancha y (opcional) foto */
  @Roles('administrador', 'super_admin') @Post()
  @UseInterceptors(FileInterceptor('foto', OPCIONES_IMAGEN))
  crear(@CurrentUser() u: AuthUser, @Body() dto: CrearCanchaDto, @UploadedFile() foto?: Express.Multer.File) {
    return this.service.crear(u, dto, foto);
  }

  @Roles('administrador', 'super_admin') @Patch(':id')
  @UseInterceptors(FileInterceptor('foto', OPCIONES_IMAGEN))
  actualizar(
    @CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCanchaDto, @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.service.actualizar(u, id, dto, foto);
  }

  @Roles('administrador', 'super_admin') @Put(':id/horarios')
  horarios(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReemplazarHorariosDto) {
    return this.service.reemplazarHorarios(u, id, dto.horarios);
  }
}

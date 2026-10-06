import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OPCIONES_IMAGEN } from '../common/upload';
import { ComplejosService } from './complejos.service';
import { ActualizarComplejoDto, AsignarAdminDto, CrearComplejoDto, ListarComplejosDto } from './dto/complejos.dto';

@ApiTags('complejos')
@ApiBearerAuth()
@Controller('complejos')
export class ComplejosController {
  constructor(private service: ComplejosService) {}

  @Get()
  listar(@Query() q: ListarComplejosDto) {
    return this.service.listar(q);
  }

  @Roles('administrador', 'super_admin') @Get('mios')
  mios(@CurrentUser() u: AuthUser) {
    return this.service.mios(u);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalle(id);
  }

  /** multipart/form-data: campos del complejo y (opcional) foto */
  @Roles('super_admin') @Post()
  @UseInterceptors(FileInterceptor('foto', OPCIONES_IMAGEN))
  crear(@Body() dto: CrearComplejoDto, @UploadedFile() foto?: Express.Multer.File) {
    return this.service.crear(dto, foto);
  }

  /** multipart/form-data: cualquier campo del complejo y/o foto (reemplaza la anterior) */
  @Roles('administrador', 'super_admin') @Patch(':id')
  @UseInterceptors(FileInterceptor('foto', OPCIONES_IMAGEN))
  actualizar(
    @CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarComplejoDto, @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.service.actualizar(u, id, dto, foto);
  }

  @Roles('super_admin') @Get(':id/administradores')
  admins(@Param('id', ParseIntPipe) id: number) {
    return this.service.listarAdmins(id);
  }

  @Roles('super_admin') @Post(':id/administradores')
  asignar(@Param('id', ParseIntPipe) id: number, @Body() dto: AsignarAdminDto) {
    return this.service.asignarAdmin(id, dto.usuarioId);
  }

  @Roles('super_admin') @Delete(':id/administradores/:usuarioId')
  quitar(@Param('id', ParseIntPipe) id: number, @Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.service.quitarAdmin(id, usuarioId);
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OPCIONES_IMAGEN } from '../common/upload';
import { ActualizarPerfilDto, ActualizarUsuarioDto, CrearUsuarioDto, ListarUsuariosDto } from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private service: UsuariosService) {}

  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.service.perfil(u.id);
  }

  /** multipart/form-data: nombre, telefono y (opcional) foto */
  @Patch('me')
  @UseInterceptors(FileInterceptor('foto', OPCIONES_IMAGEN))
  actualizarMe(@CurrentUser() u: AuthUser, @Body() dto: ActualizarPerfilDto, @UploadedFile() foto?: Express.Multer.File) {
    return this.service.actualizarPerfil(u.id, dto, foto);
  }

  @Roles('super_admin') @Get()
  listar(@Query() q: ListarUsuariosDto) {
    return this.service.listar(q);
  }

  @Roles('super_admin') @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.service.crear(dto);
  }

  @Roles('super_admin') @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.service.actualizar(id, dto);
  }
}

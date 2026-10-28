import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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

  /** CREAR COMPLEJO */
  @Roles('super_admin') @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'foto', maxCount: 1 },
        { name: 'qrYape', maxCount: 1 },
      ],
      {
        ...OPCIONES_IMAGEN,
        limits: { ...OPCIONES_IMAGEN?.limits, files: 2 }, // 👈 KO'ÁPE OMOĨ MOKÕI TA'ANGA LÍMITE
      },
    ),
  )
  crear(
    @Body() dto: CrearComplejoDto,
    @UploadedFiles() files?: { foto?: Express.Multer.File[]; qrYape?: Express.Multer.File[] },
  ) {
    const foto = files?.foto?.[0];
    const qrYape = files?.qrYape?.[0];
    return this.service.crear(dto, foto, qrYape);
  }

  /** ACTUALIZAR COMPLEJO */
  @Roles('administrador', 'super_admin') @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'foto', maxCount: 1 },
        { name: 'qrYape', maxCount: 1 },
      ],
      {
        ...OPCIONES_IMAGEN,
        limits: { ...OPCIONES_IMAGEN?.limits, files: 2 }, // 👈 KO'ÁPE AVEI OMOĨ MOKÕI TA'ANGA LÍMITE
      },
    ),
  )
  actualizar(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarComplejoDto,
    @UploadedFiles() files?: { foto?: Express.Multer.File[]; qrYape?: Express.Multer.File[] },
  ) {
    const foto = files?.foto?.[0];
    const qrYape = files?.qrYape?.[0];
    return this.service.actualizar(u, id, dto, foto, qrYape);
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
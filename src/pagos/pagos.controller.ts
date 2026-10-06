import {
  BadRequestException, Body, Controller, Param, ParseIntPipe, Patch, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OPCIONES_IMAGEN } from '../common/upload';
import { RechazarVoucherDto, SubirVoucherDto } from './dto/pagos.dto';
import { PagosService } from './pagos.service';

@ApiTags('pagos')
@ApiBearerAuth()
@Controller()
export class PagosController {
  constructor(private service: PagosService) {}

  /** multipart/form-data: voucher (imagen, obligatorio) y numeroOperacion (opcional) */
  @Post('reservas/:id/voucher')
  @UseInterceptors(FileInterceptor('voucher', OPCIONES_IMAGEN))
  subir(
    @CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubirVoucherDto, @UploadedFile() voucher?: Express.Multer.File,
  ) {
    if (!voucher) throw new BadRequestException('Adjunta la imagen del voucher (campo "voucher")');
    return this.service.subirVoucher(u, id, dto, voucher);
  }

  @Roles('administrador', 'super_admin') @Patch('pagos/:id/verificar')
  verificar(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.verificar(u, id);
  }

  @Roles('administrador', 'super_admin') @Patch('pagos/:id/rechazar')
  rechazar(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RechazarVoucherDto) {
    return this.service.rechazar(u, id, dto.motivo);
  }
}

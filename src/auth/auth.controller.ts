import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  LoginDto, ReenviarCodigoDto, RefreshDto, RegisterDto, RestablecerPasswordDto, SolicitarRecuperacionDto,
  VerificarRecuperacionDto, VerificarRegistroDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Paso 1 del registro: envía el código de verificación al correo. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** Paso 2 del registro: con el código correcto se crea el usuario y se inicia sesión. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('verificar-registro')
  verificar(@Body() dto: VerificarRegistroDto) {
    return this.auth.verificarRegistro(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reenviar-codigo')
  reenviar(@Body() dto: ReenviarCodigoDto) {
    return this.auth.reenviarCodigo(dto.correo);
  }

  /** Recuperar contraseña · paso 1: envía un código al correo (si existe la cuenta). */
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post('recuperar/solicitar')
  solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    return this.auth.solicitarRecuperacion(dto.correo);
  }

  /** Recuperar contraseña · paso 2: comprueba el código (para mostrar la pantalla de nueva contraseña). */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('recuperar/verificar')
  verificarRecuperacion(@Body() dto: VerificarRecuperacionDto) {
    return this.auth.verificarCodigoRecuperacion(dto);
  }

  /** Recuperar contraseña · paso 3: código + nueva contraseña. Cierra todas las sesiones. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('recuperar/restablecer')
  restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.auth.restablecerPassword(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}

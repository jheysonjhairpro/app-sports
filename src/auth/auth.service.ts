import {
  BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, InternalServerErrorException,
  Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Rol, Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto, RegisterDto, RestablecerPasswordDto, VerificarRecuperacionDto, VerificarRegistroDto,
} from './dto/auth.dto';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const CODIGO_MINUTOS = 10; // vigencia del código
const REENVIO_SEGUNDOS = 60; // espera mínima entre envíos
const MAX_INTENTOS = 5; // intentos de código por envío

@Injectable()
export class AuthService {
  private log = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  // ───────────── Registro en 2 pasos ─────────────
  /**
   * Paso 1: valida los datos y envía un código de 6 dígitos al correo.
   * El usuario NO se crea todavía; los datos quedan "en espera" (con la contraseña ya cifrada).
   */
  async register(dto: RegisterDto) {
    const correo = dto.correo.toLowerCase();

    const existente = await this.prisma.usuario.findFirst({
      where: { OR: [{ correo }, ...(dto.telefono ? [{ telefono: dto.telefono }] : [])] },
      select: { id: true },
    });
    if (existente) throw new ConflictException('El correo o el teléfono ya está registrado');

    const previo = await this.prisma.verificacionCorreo.findUnique({ where: { correo } });
    if (previo) this.verificarEnfriamiento(previo.ultimoEnvio);

    const codigo = this.generarCodigo();
    if (!(await this.enviarCodigo(correo, dto.nombre, codigo))) {
      throw new ServiceUnavailableException('No pudimos enviar el correo de verificación. Intenta de nuevo en unos minutos');
    }

    const datos = {
      nombre: dto.nombre,
      telefono: dto.telefono ?? null,
      passwordHash: await bcrypt.hash(dto.password, 12),
      codigoHash: this.hashCodigo(correo, codigo),
      intentos: 0,
      expiraEn: new Date(Date.now() + CODIGO_MINUTOS * 60_000),
      ultimoEnvio: new Date(),
    };
    await this.prisma.verificacionCorreo.upsert({ where: { correo }, update: datos, create: { correo, ...datos } });

    return this.respuestaEnvio(correo);
  }

  /** Paso 2: si el código es correcto se crea el usuario y se inicia sesión. Si no, no se registra nada. */
  async verificarRegistro(dto: VerificarRegistroDto) {
    const correo = dto.correo.toLowerCase();
    const p = await this.prisma.verificacionCorreo.findUnique({ where: { correo } });
    if (!p) throw new BadRequestException('No hay un registro pendiente para ese correo');
    if (p.expiraEn < new Date()) throw new BadRequestException('El código expiró. Solicita uno nuevo');
    if (p.intentos >= MAX_INTENTOS) {
      throw new HttpException('Demasiados intentos. Solicita un nuevo código', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!this.coincide(p.codigoHash, this.hashCodigo(correo, dto.codigo))) {
      await this.prisma.verificacionCorreo.update({ where: { id: p.id }, data: { intentos: { increment: 1 } } });
      const quedan = MAX_INTENTOS - p.intentos - 1;
      throw new BadRequestException(
        quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intentos` : 'Código incorrecto. Solicita un nuevo código',
      );
    }

    const rol = await this.prisma.rol.findUnique({ where: { nombre: 'usuario' } });
    if (!rol) throw new InternalServerErrorException('Roles no inicializados (ejecuta el seed)');

    try {
      const u = await this.prisma.$transaction(async (tx) => {
        const creado = await tx.usuario.create({
          data: { nombre: p.nombre, correo, telefono: p.telefono, passwordHash: p.passwordHash, rolId: rol.id },
          include: { rol: true },
        });
        await tx.verificacionCorreo.delete({ where: { id: p.id } });
        return creado;
      });
      return this.emitir(u);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('El correo o el teléfono ya está registrado');
      }
      throw e;
    }
  }

  /** Genera y envía un código nuevo (con espera de 60 s entre envíos). */
  async reenviarCodigo(correoRaw: string) {
    const correo = correoRaw.toLowerCase();
    const p = await this.prisma.verificacionCorreo.findUnique({ where: { correo } });
    if (!p) throw new NotFoundException('No hay un registro pendiente para ese correo. Regístrate de nuevo');
    this.verificarEnfriamiento(p.ultimoEnvio);

    const codigo = this.generarCodigo();
    if (!(await this.enviarCodigo(correo, p.nombre, codigo))) {
      throw new ServiceUnavailableException('No pudimos enviar el correo de verificación. Intenta de nuevo en unos minutos');
    }
    await this.prisma.verificacionCorreo.update({
      where: { id: p.id },
      data: {
        codigoHash: this.hashCodigo(correo, codigo),
        intentos: 0,
        expiraEn: new Date(Date.now() + CODIGO_MINUTOS * 60_000),
        ultimoEnvio: new Date(),
      },
    });
    return this.respuestaEnvio(correo);
  }

  /** Limpieza diaria de registros y códigos de recuperación vencidos hace más de un día. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async limpiarVerificaciones() {
    if (this.config.get('RUN_CRONS') === 'false') return;
    const limite = new Date(Date.now() - 86_400_000);
    await this.prisma.verificacionCorreo.deleteMany({ where: { expiraEn: { lt: limite } } });
    await this.prisma.passwordReset.deleteMany({ where: { expiraEn: { lt: limite } } });
  }

  // ───────────── Recuperar contraseña (3 pasos) ─────────────
  /**
   * Paso 1: el usuario escribe su correo y, si existe una cuenta activa, recibe un código de 6 dígitos.
   * Siempre responde lo mismo (exista o no el correo) para no revelar qué correos están registrados.
   */
  async solicitarRecuperacion(correoRaw: string) {
    const correo = correoRaw.toLowerCase();
    const respuesta = {
      mensaje: 'Si el correo está registrado, te enviamos un código de 6 dígitos',
      expiraEnMinutos: CODIGO_MINUTOS,
      reenvioEnSegundos: REENVIO_SEGUNDOS,
    };

    const u = await this.prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, nombre: true, activo: true },
    });
    if (!u || !u.activo) return respuesta;

    // Anti-spam: máximo un código cada 60 segundos por cuenta
    const previo = await this.prisma.passwordReset.findFirst({
      where: { usuarioId: u.id },
      orderBy: { createdAt: 'desc' },
    });
    if (previo && Date.now() - previo.createdAt.getTime() < REENVIO_SEGUNDOS * 1000) return respuesta;

    const codigo = this.generarCodigo();
    if (!(await this.enviarCodigoRecuperacion(correo, u.nombre, codigo))) {
      throw new ServiceUnavailableException('No pudimos enviar el correo. Intenta de nuevo en unos minutos');
    }

    // Un solo código vigente por cuenta: el nuevo reemplaza al anterior
    await this.prisma.$transaction([
      this.prisma.passwordReset.deleteMany({ where: { usuarioId: u.id } }),
      this.prisma.passwordReset.create({
        data: {
          usuarioId: u.id,
          codigoHash: this.hashCodigoReset(correo, codigo),
          expiraEn: new Date(Date.now() + CODIGO_MINUTOS * 60_000),
        },
      }),
    ]);
    return respuesta;
  }

  /** Paso 2 (opcional): comprueba el código sin cambiar nada; sirve para pasar a la pantalla de nueva contraseña. */
  async verificarCodigoRecuperacion(dto: VerificarRecuperacionDto) {
    await this.comprobarCodigoRecuperacion(dto.correo.toLowerCase(), dto.codigo);
    return { valido: true };
  }

  /** Paso 3: con el código correcto se guarda la nueva contraseña y se cierran todas las sesiones. */
  async restablecerPassword(dto: RestablecerPasswordDto) {
    const correo = dto.correo.toLowerCase();
    const { usuarioId, nombre } = await this.comprobarCodigoRecuperacion(correo, dto.codigo);
    const passwordHash = await bcrypt.hash(dto.nuevaPassword, 12);

    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash } }),
      this.prisma.passwordReset.deleteMany({ where: { usuarioId } }), // el código ya no sirve
      this.prisma.refreshToken.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() }, // cierra las sesiones abiertas en otros dispositivos
      }),
    ]);

    void this.mail.enviarPasswordCambiada(correo, nombre); // aviso de seguridad; nunca lanza error
    return { ok: true, mensaje: 'Tu contraseña fue actualizada. Inicia sesión con la nueva' };
  }

  /** Valida el código (expiración, intentos, coincidencia). Cada fallo suma un intento. */
  private async comprobarCodigoRecuperacion(correo: string, codigo: string) {
    const u = await this.prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, nombre: true, activo: true },
    });
    const r = u?.activo
      ? await this.prisma.passwordReset.findFirst({ where: { usuarioId: u.id }, orderBy: { createdAt: 'desc' } })
      : null;
    if (!u || !r) throw new BadRequestException('Código inválido o expirado');

    if (r.expiraEn < new Date()) throw new BadRequestException('El código expiró. Solicita uno nuevo');
    if (r.intentos >= MAX_INTENTOS) {
      throw new HttpException('Demasiados intentos. Solicita un nuevo código', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!this.coincide(r.codigoHash, this.hashCodigoReset(correo, codigo))) {
      await this.prisma.passwordReset.update({ where: { id: r.id }, data: { intentos: { increment: 1 } } });
      const quedan = MAX_INTENTOS - r.intentos - 1;
      throw new BadRequestException(
        quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intentos` : 'Código incorrecto. Solicita un nuevo código',
      );
    }
    return { usuarioId: u.id, nombre: u.nombre };
  }

  // ───────────── Sesión ─────────────
  async login(dto: LoginDto) {
    const u = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo.toLowerCase() },
      include: { rol: true },
    });
    if (!u || !u.activo || !(await bcrypt.compare(dto.password, u.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.emitir(u);
  }

  /** Rotación de refresh tokens: cada uso invalida el anterior; reutilizar uno viejo cierra todas las sesiones. */
  async refresh(token: string) {
    const rt = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { usuario: { include: { rol: true } } },
    });
    if (!rt) throw new UnauthorizedException('Sesión inválida');

    if (rt.revocadoEn) {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: rt.usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() },
      });
      throw new UnauthorizedException('Sesión inválida');
    }
    if (rt.expiraEn < new Date() || !rt.usuario.activo) throw new UnauthorizedException('Sesión expirada');

    await this.prisma.refreshToken.update({ where: { id: rt.id }, data: { revocadoEn: new Date() } });
    return this.emitir(rt.usuario);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    return { ok: true };
  }

  // ───────────── Internos ─────────────
  private generarCodigo() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  /** El código nunca se guarda en claro: se guarda un HMAC ligado al correo. */
  private hashCodigo(correo: string, codigo: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update(`${correo}:${codigo}`).digest('hex');
  }

  /** Mismo mecanismo, pero con otro "propósito": un código de registro no sirve para recuperar contraseña. */
  private hashCodigoReset(correo: string, codigo: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update(`recuperar:${correo}:${codigo}`).digest('hex');
  }

  private coincide(a: string, b: string) {
    const x = Buffer.from(a, 'hex');
    const y = Buffer.from(b, 'hex');
    return x.length === y.length && timingSafeEqual(x, y);
  }

  private verificarEnfriamiento(ultimoEnvio: Date) {
    const espera = REENVIO_SEGUNDOS * 1000 - (Date.now() - ultimoEnvio.getTime());
    if (espera > 0) {
      throw new HttpException(`Espera ${Math.ceil(espera / 1000)} segundos antes de pedir otro código`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** En desarrollo sin SMTP configurado, el código se muestra en la consola del servidor. */
  private async enviarCodigo(correo: string, nombre: string, codigo: string): Promise<boolean> {
    if (!this.mail.configurado && process.env.NODE_ENV !== 'production') {
      this.log.warn(`[DEV] Código de verificación para ${correo}: ${codigo}`);
      return true;
    }
    return this.mail.enviarCodigoVerificacion(correo, nombre, codigo, CODIGO_MINUTOS);
  }

  /** En desarrollo sin SMTP configurado, el código se muestra en la consola del servidor. */
  private async enviarCodigoRecuperacion(correo: string, nombre: string, codigo: string): Promise<boolean> {
    if (!this.mail.configurado && process.env.NODE_ENV !== 'production') {
      this.log.warn(`[DEV] Código de recuperación para ${correo}: ${codigo}`);
      return true;
    }
    return this.mail.enviarCodigoRecuperacion(correo, nombre, codigo, CODIGO_MINUTOS);
  }

  private respuestaEnvio(correo: string) {
    return {
      mensaje: 'Te enviamos un código de 6 dígitos a tu correo',
      correo,
      expiraEnMinutos: CODIGO_MINUTOS,
      reenvioEnSegundos: REENVIO_SEGUNDOS,
    };
  }

  private async emitir(u: Usuario & { rol: Rol }) {
    const accessToken = await this.jwt.signAsync({ sub: u.id, rol: u.rol.nombre, correo: u.correo });
    const refreshToken = randomBytes(48).toString('hex');
    const dias = Number(this.config.get('JWT_REFRESH_DAYS') ?? 30);
    await this.prisma.refreshToken.create({
      data: { usuarioId: u.id, tokenHash: sha256(refreshToken), expiraEn: new Date(Date.now() + dias * 86_400_000) },
    });
    const { passwordHash, ...resto } = u;
    return { accessToken, refreshToken, usuario: { ...resto, rol: u.rol.nombre } };
  }
}

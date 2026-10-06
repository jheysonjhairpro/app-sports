import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubirVoucherDto } from './dto/pagos.dto';

@Injectable()
export class PagosService {
  constructor(
    private prisma: PrismaService,
    private acceso: AccesoService,
    private notif: NotificacionesService,
    private config: ConfigService,
    private storage: StorageService,
  ) {}

  /** El cliente sube su voucher de Yape. La reserva sigue "pendiente" hasta que el admin lo revise. */
  async subirVoucher(user: AuthUser, reservaId: number, dto: SubirVoucherDto, voucher: Express.Multer.File) {
    const r = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { cancha: { select: { nombre: true, complejoId: true } }, pagos: { select: { estado: true } } },
    });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    if (r.usuarioId !== user.id) throw new ForbiddenException();
    if (r.estado !== 'pendiente') throw new BadRequestException('Esta reserva ya no admite pagos');
    if (r.pagos.some((p) => p.estado === 'pendiente' || p.estado === 'verificado')) {
      throw new ConflictException('Ya enviaste un voucher; espera la revisión del administrador');
    }

    // La API sube la imagen a Cloudinary; si el guardado falla, la imagen se borra sola.
    const pago = await this.storage.conImagen(voucher, 'voucher', null, async (url) => {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const p = await tx.pago.create({
            data: { reservaId, monto: r.total, voucherUrl: url!, numeroOperacion: dto.numeroOperacion },
          });
          // Mientras el admin revisa, la reserva conserva sus horas (sin vencimiento)
          await tx.reserva.update({ where: { id: reservaId }, data: { venceEn: null } });
          await tx.reservaHistorial.create({
            data: { reservaId, usuarioId: user.id, estadoAnterior: 'pendiente', estadoNuevo: 'pendiente', comentario: 'Voucher enviado' },
          });
          return p;
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('Ese número de operación ya fue utilizado');
        }
        throw e;
      }
    });

    // Avisar (en la app) a los administradores del complejo
    const admins = await this.prisma.complejoAdministrador.findMany({
      where: { complejoId: r.cancha.complejoId }, select: { usuarioId: true },
    });
    for (const a of admins) {
      void this.notif.notificar({
        usuarioId: a.usuarioId, reservaId, tipo: 'voucher_pendiente',
        titulo: 'Nuevo voucher por revisar', mensaje: `Reserva #${reservaId} en ${r.cancha.nombre}`,
      });
    }
    return pago;
  }

  /** Voucher correcto -> pago verificado y reserva confirmada. */
  async verificar(user: AuthUser, pagoId: number) {
    const pago = await this.cargar(pagoId);
    await this.acceso.assertAdminDeComplejo(user, pago.reserva.cancha.complejoId);

    await this.prisma.$transaction(async (tx) => {
      const p = await tx.pago.updateMany({
        where: { id: pagoId, estado: 'pendiente' },
        data: { estado: 'verificado', revisadoPor: user.id, revisadoEn: new Date() },
      });
      if (p.count === 0) throw new ConflictException('Este voucher ya fue revisado');

      const r = await tx.reserva.updateMany({ where: { id: pago.reservaId, estado: 'pendiente' }, data: { estado: 'confirmada', venceEn: null } });
      if (r.count === 0) throw new ConflictException('La reserva ya no está pendiente'); // revierte el pago
      await tx.reservaHistorial.create({
        data: { reservaId: pago.reservaId, usuarioId: user.id, estadoAnterior: 'pendiente', estadoNuevo: 'confirmada', comentario: 'Pago verificado' },
      });
    });

    void this.notif.notificar({
      usuarioId: pago.reserva.usuarioId, reservaId: pago.reservaId, tipo: 'reserva_confirmada', correo: true,
      titulo: '¡Tu reserva fue confirmada!', mensaje: `${pago.reserva.cancha.nombre} · ${pago.reserva.inicio.toISOString()}`,
    });
    return { ok: true };
  }

  /**
   * Voucher incorrecto: se rechaza el pago, la reserva sigue pendiente y el cliente tiene
   * MINUTOS_PAGO minutos para subir otro. Si no lo hace, la reserva vence y se liberan las horas.
   */
  async rechazar(user: AuthUser, pagoId: number, motivo: string) {
    const pago = await this.cargar(pagoId);
    await this.acceso.assertAdminDeComplejo(user, pago.reserva.cancha.complejoId);
    const minutos = Number(this.config.get('MINUTOS_PAGO') ?? 30);

    await this.prisma.$transaction(async (tx) => {
      const p = await tx.pago.updateMany({
        where: { id: pagoId, estado: 'pendiente' },
        data: { estado: 'rechazado', motivoRechazo: motivo, revisadoPor: user.id, revisadoEn: new Date() },
      });
      if (p.count === 0) throw new ConflictException('Este voucher ya fue revisado');
      await tx.reserva.updateMany({
        where: { id: pago.reservaId, estado: 'pendiente' },
        data: { venceEn: new Date(Date.now() + minutos * 60_000) },
      });
      await tx.reservaHistorial.create({
        data: { reservaId: pago.reservaId, usuarioId: user.id, estadoAnterior: 'pendiente', estadoNuevo: 'pendiente', comentario: `Voucher rechazado: ${motivo}`.slice(0, 250) },
      });
    });

    void this.notif.notificar({
      usuarioId: pago.reserva.usuarioId, reservaId: pago.reservaId, tipo: 'voucher_rechazado', correo: true,
      titulo: 'Tu voucher fue rechazado',
      mensaje: `Motivo: ${motivo}. Tienes ${minutos} minutos para subir otro voucher antes de que se libere el horario.`,
    });
    return { ok: true };
  }

  private async cargar(pagoId: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id: pagoId },
      include: { reserva: { include: { cancha: { select: { nombre: true, complejoId: true } } } } },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }
}

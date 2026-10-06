import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstadoReserva, Prisma, Promocion } from '@prisma/client';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { paginar } from '../common/dto/paginacion.dto';
import { calcularPrecio, PromoReglas } from '../common/utils/precio.util';
import { diaSemanaLocal, esHoraExacta, horaLocal, inicioDiaUtc, sumarHoras } from '../common/utils/time.util';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { CrearReservaDto, ListarReservasAdminDto, ListarReservasDto } from './dto/reservas.dto';

const INCLUIR = {
  cancha: { select: { id: true, nombre: true, fotoUrl: true, complejo: { select: { id: true, nombre: true, direccion: true } } } },
  pagos: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { id: true, estado: true, voucherUrl: true, numeroOperacion: true, monto: true, motivoRechazo: true } },
} satisfies Prisma.ReservaInclude;

@Injectable()
export class ReservasService {
  private log = new Logger(ReservasService.name);

  constructor(
    private prisma: PrismaService,
    private acceso: AccesoService,
    private notif: NotificacionesService,
    private config: ConfigService,
  ) {}

  private num(clave: string, def: number) {
    return Number(this.config.get(clave) ?? def);
  }

  // ───────────── Crear reserva ─────────────
  async crear(user: AuthUser, dto: CrearReservaDto) {
    const inicio = new Date(dto.inicio);
    if (!esHoraExacta(inicio)) throw new BadRequestException('El inicio debe ser una hora exacta (ej. 15:00)');
    if (inicio.getTime() <= Date.now()) throw new BadRequestException('No puedes reservar en el pasado');
    if (dto.horas > this.num('MAX_HORAS_RESERVA', 4)) {
      throw new BadRequestException(`Máximo ${this.num('MAX_HORAS_RESERVA', 4)} horas seguidas`);
    }

    const cancha = await this.prisma.cancha.findFirst({
      where: { id: dto.canchaId, activa: true, complejo: { activo: true } },
      include: { horarios: { where: { activo: true } } },
    });
    if (!cancha) throw new NotFoundException('Cancha no disponible');

    // Cada hora pedida debe estar dentro de los horarios en que la cancha atiende
    const bloques = Array.from({ length: dto.horas }, (_, i) => sumarHoras(inicio, i));
    for (const b of bloques) {
      const dia = diaSemanaLocal(b);
      const h = horaLocal(b);
      if (!cancha.horarios.some((x) => x.diaSemana === dia && x.horaInicio <= h && h < x.horaFin)) {
        throw new BadRequestException(`La cancha no atiende a las ${String(h).padStart(2, '0')}:00 ese día`);
      }
    }

    // Promoción (opcional) y precio
    let promo: Promocion | null = null;
    if (dto.promocionId) {
      promo = await this.prisma.promocion.findFirst({
        where: { id: dto.promocionId, complejoId: cancha.complejoId, activa: true },
      });
      if (!promo) throw new BadRequestException('Promoción no válida');
    }
    const precio = calcularPrecio(Number(cancha.precioHora), bloques, promo ? this.reglas(promo) : null);
    if (promo && precio.descuento === 0) throw new BadRequestException('La promoción no aplica a ese horario');

    const venceEn = new Date(Date.now() + this.num('MINUTOS_PAGO', 30) * 60_000);

    let reserva;
    try {
      reserva = await this.prisma.$transaction(async (tx) => {
        const r = await tx.reserva.create({
          data: {
            usuarioId: user.id, canchaId: cancha.id, promocionId: promo?.id,
            inicio, fin: sumarHoras(inicio, dto.horas), horas: dto.horas,
            precioHora: cancha.precioHora, subtotal: precio.subtotal, descuento: precio.descuento, total: precio.total,
            venceEn,
            // El UNIQUE (cancha_id, inicio) de reserva_bloque impide que dos personas tomen la misma hora
            bloques: { create: bloques.map((b) => ({ canchaId: cancha.id, inicio: b })) },
          },
          include: INCLUIR,
        });
        await tx.reservaHistorial.create({
          data: { reservaId: r.id, usuarioId: user.id, estadoNuevo: 'pendiente', comentario: 'Reserva creada' },
        });
        return r;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese horario acaba de ser reservado por otra persona');
      }
      throw e;
    }

    void this.notif.notificar({
      usuarioId: user.id, reservaId: reserva.id, tipo: 'reserva_creada', correo: true,
      titulo: 'Reserva registrada',
      mensaje: `Reservaste ${cancha.nombre} (${dto.horas} h). Sube tu voucher de Yape en los próximos ${this.num('MINUTOS_PAGO', 30)} minutos para confirmarla. Total: S/ ${precio.total.toFixed(2)}.`,
    });
    return reserva;
  }

  // ───────────── Consultas ─────────────
  async mias(user: AuthUser, q: ListarReservasDto) {
    const { take, skip, page, limit } = paginar(q);
    const where: Prisma.ReservaWhereInput = { usuarioId: user.id, ...(q.estado && { estado: q.estado }) };
    const [items, total] = await Promise.all([
      this.prisma.reserva.findMany({ where, include: INCLUIR, orderBy: { inicio: 'desc' }, take, skip }),
      this.prisma.reserva.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async deAdmin(user: AuthUser, q: ListarReservasAdminDto) {
    const { take, skip, page, limit } = paginar(q);
    let cancha: Prisma.CanchaWhereInput = {};
    if (q.complejoId) {
      await this.acceso.assertAdminDeComplejo(user, q.complejoId);
      cancha = { complejoId: q.complejoId };
    } else {
      const ids = await this.acceso.complejosAdministrados(user);
      if (ids) cancha = { complejoId: { in: ids } };
    }
    const where: Prisma.ReservaWhereInput = { cancha, ...(q.estado && { estado: q.estado }) };
    if (q.fecha) {
      const ini = inicioDiaUtc(q.fecha);
      where.inicio = { gte: ini, lt: sumarHoras(ini, 24) };
    }
    const [items, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where, orderBy: { inicio: 'desc' }, take, skip,
        include: { ...INCLUIR, usuario: { select: { id: true, nombre: true, telefono: true, fotoUrl: true } } },
      }),
      this.prisma.reserva.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async detalle(user: AuthUser, id: number) {
    const r = await this.prisma.reserva.findUnique({
      where: { id },
      include: { ...INCLUIR, usuario: { select: { id: true, nombre: true, telefono: true } }, historial: { orderBy: { createdAt: 'asc' } } },
    });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    if (r.usuarioId !== user.id) await this.acceso.assertAdminDeComplejo(user, r.cancha.complejo.id);
    return r;
  }

  // ───────────── Cancelar / rechazar ─────────────
  async cancelar(user: AuthUser, id: number) {
    const r = await this.prisma.reserva.findUnique({ where: { id }, select: { usuarioId: true, inicio: true } });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    if (r.usuarioId !== user.id) throw new ForbiddenException();

    const minHoras = this.num('CANCELACION_MIN_HORAS', 2);
    if (r.inicio.getTime() - Date.now() < minHoras * 3_600_000) {
      throw new BadRequestException(`Solo puedes cancelar hasta ${minHoras} horas antes`);
    }
    const ok = await this.prisma.$transaction((tx) =>
      this.cerrar(tx, id, ['pendiente', 'confirmada'], 'cancelada', user.id, 'Cancelada por el usuario'),
    );
    if (!ok) throw new ConflictException('La reserva ya no se puede cancelar');
    return { ok: true };
  }

  async rechazar(user: AuthUser, id: number, motivo?: string) {
    const r = await this.prisma.reserva.findUnique({
      where: { id }, select: { usuarioId: true, cancha: { select: { complejoId: true, nombre: true } } },
    });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    await this.acceso.assertAdminDeComplejo(user, r.cancha.complejoId);

    const texto = motivo?.trim() || 'Rechazada por el administrador';
    const ok = await this.prisma.$transaction((tx) => this.cerrar(tx, id, ['pendiente'], 'rechazada', user.id, texto));
    if (!ok) throw new ConflictException('Solo se pueden rechazar reservas pendientes');

    void this.notif.notificar({
      usuarioId: r.usuarioId, reservaId: id, tipo: 'reserva_rechazada', correo: true,
      titulo: 'Tu reserva fue rechazada', mensaje: `${r.cancha.nombre}: ${texto}`,
    });
    return { ok: true };
  }

  /**
   * Cierra una reserva y libera sus horas. Es atómico y seguro ante concurrencia:
   * solo actúa si la reserva sigue en uno de los estados permitidos.
   */
  async cerrar(
    tx: Prisma.TransactionClient, id: number, desde: EstadoReserva[], nuevo: EstadoReserva,
    usuarioId: number | null, comentario: string,
  ): Promise<boolean> {
    const actual = await tx.reserva.findUnique({ where: { id }, select: { estado: true } });
    const upd = await tx.reserva.updateMany({ where: { id, estado: { in: desde } }, data: { estado: nuevo, venceEn: null } });
    if (upd.count === 0) return false;

    await tx.reservaBloque.deleteMany({ where: { reservaId: id } });
    await tx.pago.updateMany({
      where: { reservaId: id, estado: 'pendiente' },
      data: { estado: 'rechazado', motivoRechazo: comentario.slice(0, 250), revisadoPor: usuarioId, revisadoEn: new Date() },
    });
    await tx.reservaHistorial.create({
      data: { reservaId: id, usuarioId, estadoAnterior: actual?.estado, estadoNuevo: nuevo, comentario: comentario.slice(0, 250) },
    });
    return true;
  }

  // ───────────── Tareas programadas ─────────────
  /** Libera las horas de reservas pendientes cuyo plazo de pago venció. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async vencerPendientes() {
    if (this.config.get('RUN_CRONS') === 'false') return;
    const vencidas = await this.prisma.reserva.findMany({
      where: { estado: 'pendiente', venceEn: { lt: new Date() } },
      select: { id: true, usuarioId: true }, take: 200,
    });
    for (const r of vencidas) {
      try {
        const ok = await this.prisma.$transaction((tx) =>
          this.cerrar(tx, r.id, ['pendiente'], 'cancelada', null, 'Vencida por falta de pago'),
        );
        if (ok) {
          void this.notif.notificar({
            usuarioId: r.usuarioId, reservaId: r.id, tipo: 'reserva_cancelada',
            titulo: 'Reserva vencida', mensaje: 'Tu reserva se canceló porque no se recibió el voucher a tiempo.',
          });
        }
      } catch (e) {
        this.log.error(`No se pudo vencer la reserva ${r.id}: ${(e as Error).message}`);
      }
    }
  }

  /** Pasa a "completada" las reservas confirmadas que ya terminaron. */
  @Cron(CronExpression.EVERY_HOUR)
  async completarTerminadas() {
    if (this.config.get('RUN_CRONS') === 'false') return;
    const ahora = new Date();
    const ids = (await this.prisma.reserva.findMany({
      where: { estado: 'confirmada', fin: { lt: ahora } }, select: { id: true }, take: 500,
    })).map((r) => r.id);
    if (!ids.length) return;
    await this.prisma.$transaction([
      this.prisma.reserva.updateMany({ where: { id: { in: ids }, estado: 'confirmada' }, data: { estado: 'completada' } }),
      this.prisma.reservaHistorial.createMany({
        data: ids.map((reservaId) => ({ reservaId, estadoAnterior: 'confirmada' as const, estadoNuevo: 'completada' as const, comentario: 'Completada automáticamente' })),
      }),
    ]);
  }

  private reglas(p: Promocion): PromoReglas {
    return {
      tipo: p.tipo,
      valor: p.valor == null ? null : Number(p.valor),
      diasSemana: (p.diasSemana as number[] | null) ?? null,
      horaDesde: p.horaDesde,
      horaHasta: p.horaHasta,
      vigenteDesde: p.vigenteDesde.toISOString().slice(0, 10),
      vigenteHasta: p.vigenteHasta.toISOString().slice(0, 10),
    };
  }
}

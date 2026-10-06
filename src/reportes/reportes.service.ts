import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { inicioDiaUtc, sumarHoras } from '../common/utils/time.util';
import { PrismaService } from '../prisma/prisma.service';

export class ResumenDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) complejoId?: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) desde?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta?: string;
}

const fechaHoy = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService, private acceso: AccesoService) {}

  /** Cifras del dashboard del administrador (solo sus complejos) o del super admin (todos / uno). */
  async resumen(user: AuthUser, q: ResumenDto) {
    // Filtro de complejos: un id, una lista de ids, o ninguno (super admin ve todo)
    let complejoFiltro: number | { in: number[] } | undefined;
    if (q.complejoId) {
      await this.acceso.assertAdminDeComplejo(user, q.complejoId);
      complejoFiltro = q.complejoId;
    } else {
      const ids = await this.acceso.complejosAdministrados(user);
      if (ids) complejoFiltro = { in: ids };
    }
    const cancha: Prisma.CanchaWhereInput = complejoFiltro ? { complejoId: complejoFiltro } : {};

    const hoy = inicioDiaUtc(fechaHoy());
    const desde = q.desde ? inicioDiaUtc(q.desde) : sumarHoras(hoy, -24 * 30);
    const hasta = q.hasta ? sumarHoras(inicioDiaUtc(q.hasta), 24) : sumarHoras(hoy, 24);
    const enRango: Prisma.ReservaWhereInput = {
      cancha, estado: { in: ['confirmada', 'completada'] }, inicio: { gte: desde, lt: hasta },
    };

    const [reservas, ingresos, pendientes, reservasHoy, canchas, promociones] = await Promise.all([
      this.prisma.reserva.count({ where: enRango }),
      this.prisma.reserva.aggregate({ where: enRango, _sum: { total: true } }),
      this.prisma.reserva.count({ where: { cancha, estado: 'pendiente' } }),
      this.prisma.reserva.count({
        where: { cancha, estado: { in: ['pendiente', 'confirmada'] }, inicio: { gte: hoy, lt: sumarHoras(hoy, 24) } },
      }),
      this.prisma.cancha.count({ where: { ...cancha, activa: true } }),
      this.prisma.promocion.count({
        where: { activa: true, vigenteHasta: { gte: new Date() }, ...(complejoFiltro ? { complejoId: complejoFiltro } : {}) },
      }),
    ]);

    return {
      desde, hasta,
      reservas, ingresos: Number(ingresos._sum.total ?? 0),
      reservasPendientes: pendientes, reservasHoy, canchasActivas: canchas, promocionesActivas: promociones,
    };
  }

  /** Dashboard general del super admin. */
  async global() {
    const [usuarios, porRol, complejos, canchas, reservas, ingresos] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.groupBy({ by: ['rolId'], _count: { _all: true } }),
      this.prisma.complejo.count({ where: { activo: true } }),
      this.prisma.cancha.count({ where: { activa: true } }),
      this.prisma.reserva.count(),
      this.prisma.reserva.aggregate({ where: { estado: { in: ['confirmada', 'completada'] } }, _sum: { total: true } }),
    ]);
    const roles = await this.prisma.rol.findMany();
    return {
      usuarios,
      usuariosPorRol: porRol.map((r) => ({ rol: roles.find((x) => x.id === r.rolId)?.nombre, total: r._count._all })),
      complejos, canchas, reservas, ingresosTotales: Number(ingresos._sum.total ?? 0),
    };
  }

  /** Guarda una foto fija ("snapshot") del resumen en la tabla reporte. */
  async guardar(user: AuthUser, q: ResumenDto) {
    const r = await this.resumen(user, q);
    return this.prisma.reporte.create({
      data: {
        complejoId: q.complejoId, generadoPor: user.id,
        periodoDesde: r.desde, periodoHasta: sumarHoras(r.hasta, -24),
        totalReservas: r.reservas, totalIngresos: r.ingresos,
      },
    });
  }

  async listar(user: AuthUser) {
    const ids = await this.acceso.complejosAdministrados(user);
    return this.prisma.reporte.findMany({
      where: ids ? { complejoId: { in: ids } } : {}, orderBy: { createdAt: 'desc' }, take: 50,
    });
  }
}

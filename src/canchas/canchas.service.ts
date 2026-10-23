import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { diaSemanaLocal, inicioDiaUtc, sumarHoras } from '../common/utils/time.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ActualizarCanchaDto, CrearCanchaDto, HorarioItemDto } from './dto/canchas.dto';

const pad = (n: number) => String(n).padStart(2, '0');

@Injectable()
export class CanchasService {
  constructor(private prisma: PrismaService, private acceso: AccesoService, private storage: StorageService) {}

  listar(complejoId?: number) {
    return this.prisma.cancha.findMany({
      where: { activa: true, complejo: { activo: true }, ...(complejoId && { complejoId }) },
      orderBy: [{ complejoId: 'asc' }, { nombre: 'asc' }],
      include: { complejo: { select: { id: true, nombre: true, latitud: true, longitud: true } } },
    });
  }

  async mias(user: AuthUser) {
    const ids = await this.acceso.complejosAdministrados(user);
    return this.prisma.cancha.findMany({
      where: ids ? { complejoId: { in: ids } } : {},
      orderBy: [{ complejoId: 'asc' }, { nombre: 'asc' }],
      include: { complejo: { select: { id: true, nombre: true } } },
    });
  }

  async detalle(id: number) {
    const c = await this.prisma.cancha.findFirst({
      where: { id, complejo: { activo: true } },
      include: {
        complejo: { select: { id: true, nombre: true, direccion: true, latitud: true, longitud: true, telefono: true } },
        horarios: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
      },
    });
    if (!c) throw new NotFoundException('Cancha no encontrada');
    return c;
  }

  async crear(user: AuthUser, dto: CrearCanchaDto, foto?: Express.Multer.File) {
    await this.acceso.assertAdminDeComplejo(user, dto.complejoId);
    return this.storage.conImagen(foto, 'cancha', null, (url) =>
      this.prisma.cancha.create({ data: { ...dto, ...(url ? { fotoUrl: url } : {}) } }),
    );
  }

async actualizar(user: AuthUser, id: number, dto: ActualizarCanchaDto, foto?: Express.Multer.File) {
  const c = await this.cancha(id);
  await this.acceso.assertAdminDeComplejo(user, c.complejoId);

  // Extraemos 'complejoId' y 'foto' para que NO se envíen directamente a Prisma
  const { complejoId, foto: _, ...data } = dto;

  return this.storage.conImagen(foto, 'cancha', c.fotoUrl, (url) =>
    this.prisma.cancha.update({
      where: { id },
      data: {
        ...data,
        ...(url ? { fotoUrl: url } : {}),
      },
    }),
  );
}

  /** Reemplaza toda la plantilla semanal de horarios (lo que guarda la pantalla "Horarios disponibles"). */
  async reemplazarHorarios(user: AuthUser, id: number, horarios: HorarioItemDto[]) {
    const c = await this.cancha(id);
    await this.acceso.assertAdminDeComplejo(user, c.complejoId);

    for (const h of horarios) {
      if (h.horaFin <= h.horaInicio) throw new BadRequestException('horaFin debe ser mayor que horaInicio');
    }
    const porDia = new Map<number, HorarioItemDto[]>();
    horarios.forEach((h) => porDia.set(h.diaSemana, [...(porDia.get(h.diaSemana) ?? []), h]));
    for (const lista of porDia.values()) {
      lista.sort((a, b) => a.horaInicio - b.horaInicio);
      for (let i = 1; i < lista.length; i++) {
        if (lista[i].horaInicio < lista[i - 1].horaFin) throw new BadRequestException('Hay horarios que se cruzan el mismo día');
      }
    }

    await this.prisma.$transaction([
      this.prisma.horarioCancha.deleteMany({ where: { canchaId: id } }),
      this.prisma.horarioCancha.createMany({
        data: horarios.map((h) => ({ canchaId: id, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, activo: h.activo ?? true })),
      }),
    ]);
    return this.detalle(id);
  }

  /** Horas libres de una cancha en una fecha (hora local de Perú). */
  async disponibilidad(id: number, fecha: string) {
    const cancha = await this.prisma.cancha.findFirst({
      where: { id, activa: true, complejo: { activo: true } },
      include: { horarios: { where: { activo: true } } },
    });
    if (!cancha) throw new NotFoundException('Cancha no disponible');

    const ini = inicioDiaUtc(fecha);
    if (Number.isNaN(ini.getTime())) throw new BadRequestException('Fecha inválida');
    const ocupados = await this.prisma.reservaBloque.findMany({
      where: { canchaId: id, inicio: { gte: ini, lt: sumarHoras(ini, 24) } },
      select: { inicio: true },
    });
    const ocupadas = new Set(ocupados.map((o) => o.inicio.getTime()));
    const dia = diaSemanaLocal(ini);

    const bloques: { hora: number; etiqueta: string; inicio: string; disponible: boolean }[] = [];
    for (let h = 0; h < 24; h++) {
      if (!cancha.horarios.some((x) => x.diaSemana === dia && x.horaInicio <= h && h < x.horaFin)) continue;
      const inicio = sumarHoras(ini, h);
      bloques.push({
        hora: h,
        etiqueta: `${pad(h)}:00 - ${pad(h + 1)}:00`,
        inicio: inicio.toISOString(),
        disponible: inicio.getTime() > Date.now() && !ocupadas.has(inicio.getTime()),
      });
    }
    return { canchaId: id, fecha, precioHora: cancha.precioHora, bloques };
  }

  private async cancha(id: number) {
    const c = await this.prisma.cancha.findUnique({ where: { id }, select: { id: true, complejoId: true, fotoUrl: true } });
    if (!c) throw new NotFoundException('Cancha no encontrada');
    return c;
  }
}

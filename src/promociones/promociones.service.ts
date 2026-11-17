import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { FidelidadService } from '../common/fidelidad.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPromocionDto, CrearPromocionDto } from './dto/promociones.dto';

@Injectable()
export class PromocionesService {
  constructor(private prisma: PrismaService, private acceso: AccesoService, private fidelidad: FidelidadService) {}

  /** Para la app de clientes: solo promociones activas y vigentes hoy. */
  vigentes(complejoId: number) {
    const hoy = new Date();
    return this.prisma.promocion.findMany({
      where: { complejoId, activa: true, vigenteDesde: { lte: hoy }, vigenteHasta: { gte: hoy } },
      orderBy: { vigenteHasta: 'asc' },
    });
  }

  /** Para la app: mi progreso (ej. 3/7) en cada promoción de fidelidad vigente del complejo. */
  async miProgreso(usuarioId: number, complejoId: number) {
    const hoy = new Date();
    const promos = await this.prisma.promocion.findMany({
      where: {
        complejoId, activa: true, reservasRequeridas: { not: null },
        vigenteDesde: { lte: hoy }, vigenteHasta: { gte: hoy },
      },
      orderBy: { vigenteHasta: 'asc' },
    });
    return Promise.all(
      promos.map(async (p) => ({ promocion: p, progreso: await this.fidelidad.progreso(usuarioId, p) })),
    );
  }

  /** Para el administrador: todas las promociones del complejo. */
  async todas(user: AuthUser, complejoId: number) {
    await this.acceso.assertAdminDeComplejo(user, complejoId);
    return this.prisma.promocion.findMany({ where: { complejoId }, orderBy: { createdAt: 'desc' } });
  }

  async crear(user: AuthUser, dto: CrearPromocionDto) {
      await this.acceso.assertAdminDeComplejo(user, dto.complejoId);
      this.validar(dto);

      const naceActiva = dto.activa ?? true;

      return this.prisma.$transaction(async (tx) => {
        if (naceActiva) {
          await tx.promocion.updateMany({
            where: {
              complejoId: dto.complejoId,
              activa: true,
            },
            data: { activa: false },
          });
        }

        return tx.promocion.create({
          data: {
            ...(this.datos(dto) as any),
            activa: naceActiva,
          },
        });
      });
    }

  async actualizar(user: AuthUser, id: number, dto: ActualizarPromocionDto) {
    const p = await this.prisma.promocion.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Promoción no encontrada');
    await this.acceso.assertAdminDeComplejo(user, p.complejoId);

    // 🔒 Validar que no exista otra promoción activa en el mismo complejo
    if (dto.activa === true) {
      const otraActiva = await this.prisma.promocion.findFirst({
        where: {
          complejoId: p.complejoId,
          activa: true,
          id: { not: id },
        },
        select: { id: true, titulo: true },
      });

      if (otraActiva) {
        throw new BadRequestException(
          `Ya existe una promoción activa ("${otraActiva.titulo}"). Debes desactivarla primero antes de activar esta.`,
        );
      }
    }

    // Se valida la combinación final (lo que ya tenía + lo que cambia)
    this.validarFidelidad(
      dto.tipo ?? p.tipo,
      dto.reservasRequeridas === undefined ? p.reservasRequeridas : dto.reservasRequeridas,
      dto.usosMaximosPorPersona === undefined ? p.usosMaximosPorPersona : dto.usosMaximosPorPersona,
    );

    const { complejoId, ...resto } = dto;
    return this.prisma.promocion.update({
      where: { id },
      data: this.datos(resto) as any,
    });
  }

  /** "Eliminar" = desactivar, para no romper reservas que ya la usaron. */
  async desactivar(user: AuthUser, id: number) {
    const p = await this.prisma.promocion.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Promoción no encontrada');
    await this.acceso.assertAdminDeComplejo(user, p.complejoId);
    return this.prisma.promocion.update({ where: { id }, data: { activa: false } });
  }

  private validar(d: CrearPromocionDto) {
    if (d.tipo !== 'dos_por_uno' && d.valor == null) throw new BadRequestException('Falta el valor de la promoción');
    if (d.tipo === 'porcentaje' && d.valor! > 100) throw new BadRequestException('El porcentaje no puede pasar de 100');
    if (d.vigenteHasta < d.vigenteDesde) throw new BadRequestException('vigenteHasta debe ser posterior a vigenteDesde');
    if (d.horaDesde != null && d.horaHasta != null && d.horaHasta <= d.horaDesde) {
      throw new BadRequestException('horaHasta debe ser mayor que horaDesde');
    }
    this.validarFidelidad(d.tipo, d.reservasRequeridas, d.usosMaximosPorPersona);
  }

  private validarFidelidad(tipo: string, requeridas?: number | null, maxUsos?: number | null) {
    if (requeridas != null && tipo === 'dos_por_uno') {
      throw new BadRequestException('Una promoción de fidelidad debe ser porcentaje o monto fijo (no 2x1)');
    }
    if (maxUsos != null && requeridas == null) {
      throw new BadRequestException('usosMaximosPorPersona solo aplica a promociones de fidelidad (con reservasRequeridas)');
    }
  }

  private datos(d: Partial<CrearPromocionDto>) {
    const { vigenteDesde, vigenteHasta, diasSemana, ...resto } = d;
    return {
      ...resto,
      ...(diasSemana !== undefined && { diasSemana }),
      ...(vigenteDesde && { vigenteDesde: new Date(vigenteDesde) }),
      ...(vigenteHasta && { vigenteHasta: new Date(vigenteHasta) }),
    };
  }
}

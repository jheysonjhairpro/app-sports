import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPromocionDto, CrearPromocionDto } from './dto/promociones.dto';

@Injectable()
export class PromocionesService {
  constructor(private prisma: PrismaService, private acceso: AccesoService) {}

  /** Para la app de clientes: solo promociones activas y vigentes hoy. */
  vigentes(complejoId: number) {
    const hoy = new Date();
    return this.prisma.promocion.findMany({
      where: { complejoId, activa: true, vigenteDesde: { lte: hoy }, vigenteHasta: { gte: hoy } },
      orderBy: { vigenteHasta: 'asc' },
    });
  }

  /** Para el administrador: todas las promociones del complejo. */
  async todas(user: AuthUser, complejoId: number) {
    await this.acceso.assertAdminDeComplejo(user, complejoId);
    return this.prisma.promocion.findMany({ where: { complejoId }, orderBy: { createdAt: 'desc' } });
  }

  async crear(user: AuthUser, dto: CrearPromocionDto) {
    await this.acceso.assertAdminDeComplejo(user, dto.complejoId);
    this.validar(dto);
    return this.prisma.promocion.create({ data: this.datos(dto) as any });
  }

  async actualizar(user: AuthUser, id: number, dto: ActualizarPromocionDto) {
    const p = await this.prisma.promocion.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Promoción no encontrada');
    await this.acceso.assertAdminDeComplejo(user, p.complejoId);
    const { complejoId, ...resto } = dto;
    return this.prisma.promocion.update({ where: { id }, data: this.datos(resto) as any });
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

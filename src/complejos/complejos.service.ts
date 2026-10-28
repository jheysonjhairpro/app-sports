import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccesoService } from '../common/acceso.service';
import { AuthUser } from '../common/auth-user';
import { paginar } from '../common/dto/paginacion.dto';
import { distanciaKm } from '../common/utils/geo.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ActualizarComplejoDto, CrearComplejoDto, ListarComplejosDto } from './dto/complejos.dto';

@Injectable()
export class ComplejosService {
  constructor(private prisma: PrismaService, private acceso: AccesoService, private storage: StorageService) {}

  async listar(q: ListarComplejosDto) {
    const { take, skip } = paginar(q);
    const where: Prisma.ComplejoWhereInput = { activo: true };
    if (q.destacado !== undefined) where.destacado = q.destacado;
    if (q.q) where.nombre = { contains: q.q };

    const conUbicacion = q.lat !== undefined && q.lng !== undefined;
    const rows = await this.prisma.complejo.findMany({
      where,
      orderBy: [{ destacado: 'desc' }, { nombre: 'asc' }],
      ...(conUbicacion ? {} : { take, skip }),
      include: { canchas: { where: { activa: true }, select: { precioHora: true } } },
    });

    let items = rows.map(({ canchas, ...c }) => ({
      ...c,
      canchasActivas: canchas.length,
      precioDesde: canchas.length ? Math.min(...canchas.map((x) => Number(x.precioHora))) : null,
      distanciaKm:
        conUbicacion && c.latitud && c.longitud
          ? distanciaKm(q.lat!, q.lng!, Number(c.latitud), Number(c.longitud))
          : null,
    }));

    if (conUbicacion) {
      items.sort((a, b) => (a.distanciaKm ?? 1e9) - (b.distanciaKm ?? 1e9));
      items = items.slice(skip, skip + take);
    }
    return items;
  }

  async detalle(id: number) {
    const hoy = new Date();
    const c = await this.prisma.complejo.findFirst({
      where: { id, activo: true },
      include: {
        canchas: { where: { activa: true }, orderBy: { nombre: 'asc' } },
        promociones: { where: { activa: true, vigenteDesde: { lte: hoy }, vigenteHasta: { gte: hoy } } },
      },
    });
    if (!c) throw new NotFoundException('Complejo no encontrado');
    return c;
  }

  async mios(user: AuthUser) {
    const ids = await this.acceso.complejosAdministrados(user);
    return this.prisma.complejo.findMany({
      where: ids ? { id: { in: ids } } : {},
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { canchas: true } } },
    });
  }

  async crear(dto: CrearComplejoDto, foto?: Express.Multer.File, qrYape?: Express.Multer.File) {
    return this.storage.conImagen(foto, 'complejo', null, (fotoUrl) =>
      this.storage.conImagen(qrYape, 'qr_yape', null, (qrYapeUrl) =>
        this.prisma.complejo.create({
          data: {
            ...dto,
            ...(fotoUrl ? { fotoUrl } : {}),
            ...(qrYapeUrl ? { qrYapeUrl } : {}),
          },
        }),
      ),
    );
  }

  async actualizar(
    user: AuthUser,
    id: number,
    dto: ActualizarComplejoDto,
    foto?: Express.Multer.File,
    qrYape?: Express.Multer.File,
  ) {
    await this.acceso.assertAdminDeComplejo(user, id);
    // Solo el super admin puede destacar o desactivar un complejo
    if (user.rol !== 'super_admin' && (dto.destacado !== undefined || dto.activo !== undefined)) {
      throw new ForbiddenException('Solo el super admin puede cambiar "destacado" o "activo"');
    }

    const actual = await this.prisma.complejo.findUnique({
      where: { id },
      select: { fotoUrl: true, qrYapeUrl: true },
    });
    if (!actual) throw new NotFoundException('Complejo no encontrado');

    return this.storage.conImagen(foto, 'complejo', actual.fotoUrl, (fotoUrl) =>
      this.storage.conImagen(qrYape, 'qr_yape', actual.qrYapeUrl, (qrYapeUrl) =>
        this.prisma.complejo.update({
          where: { id },
          data: {
            ...dto,
            ...(fotoUrl ? { fotoUrl } : {}),
            ...(qrYapeUrl ? { qrYapeUrl } : {}),
          },
        }),
      ),
    );
  }

  listarAdmins(complejoId: number) {
    return this.prisma.complejoAdministrador.findMany({
      where: { complejoId },
      include: { usuario: { select: { id: true, nombre: true, correo: true, telefono: true, activo: true } } },
    });
  }

  async asignarAdmin(complejoId: number, usuarioId: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, include: { rol: true } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (u.rol.nombre !== 'administrador') throw new BadRequestException('El usuario debe tener rol "administrador"');
    return this.prisma.complejoAdministrador.upsert({
      where: { complejoId_usuarioId: { complejoId, usuarioId } },
      update: {},
      create: { complejoId, usuarioId },
    });
  }

  async quitarAdmin(complejoId: number, usuarioId: number) {
    await this.prisma.complejoAdministrador.deleteMany({ where: { complejoId, usuarioId } });
    return { ok: true };
  }
}
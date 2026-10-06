import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { paginar } from '../common/dto/paginacion.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ActualizarPerfilDto, ActualizarUsuarioDto, CrearUsuarioDto, ListarUsuariosDto } from './dto/usuarios.dto';

const SELECT = {
  id: true, nombre: true, correo: true, telefono: true, fotoUrl: true, activo: true, createdAt: true,
  rol: { select: { nombre: true } },
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  perfil(id: number) {
    return this.prisma.usuario.findUniqueOrThrow({ where: { id }, select: SELECT });
  }

  /** Actualiza el perfil. Si llega un archivo "foto", reemplaza la anterior (y borra la vieja de Cloudinary). */
  async actualizarPerfil(id: number, dto: ActualizarPerfilDto, foto?: Express.Multer.File) {
    const actual = await this.prisma.usuario.findUniqueOrThrow({ where: { id }, select: { fotoUrl: true } });
    return this.storage.conImagen(foto, 'perfil', actual.fotoUrl, (url) =>
      this.guardar(() =>
        this.prisma.usuario.update({ where: { id }, data: { ...dto, ...(url ? { fotoUrl: url } : {}) }, select: SELECT }),
      ),
    );
  }

  async listar(q: ListarUsuariosDto) {
    const { take, skip, page, limit } = paginar(q);
    const where: Prisma.UsuarioWhereInput = {};
    if (q.rol) where.rol = { nombre: q.rol };
    if (q.q) where.OR = [{ nombre: { contains: q.q } }, { correo: { contains: q.q } }];
    const [items, total] = await Promise.all([
      this.prisma.usuario.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.usuario.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async crear(dto: CrearUsuarioDto) {
    const rol = await this.prisma.rol.findUnique({ where: { nombre: dto.rol } });
    if (!rol) throw new BadRequestException('Rol inválido');
    return this.guardar(async () =>
      this.prisma.usuario.create({
        data: {
          nombre: dto.nombre, correo: dto.correo.toLowerCase(), telefono: dto.telefono,
          passwordHash: await bcrypt.hash(dto.password, 12), rolId: rol.id,
        },
        select: SELECT,
      }),
    );
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    const { rol, ...resto } = dto;
    const data: Prisma.UsuarioUpdateInput = { ...resto };
    if (rol) {
      const r = await this.prisma.rol.findUnique({ where: { nombre: rol } });
      if (!r) throw new BadRequestException('Rol inválido');
      data.rol = { connect: { id: r.id } };
    }
    return this.guardar(() => this.prisma.usuario.update({ where: { id }, data, select: SELECT }));
  }

  private async guardar<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('El correo o el teléfono ya está registrado');
        if (e.code === 'P2025') throw new NotFoundException('Usuario no encontrado');
      }
      throw e;
    }
  }
}

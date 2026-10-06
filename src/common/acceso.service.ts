import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user';

/** Reglas de "quién puede administrar qué complejo". */
@Injectable()
export class AccesoService {
  constructor(private prisma: PrismaService) {}

  async assertAdminDeComplejo(user: AuthUser, complejoId: number) {
    if (user.rol === 'super_admin') return;
    if (user.rol !== 'administrador') throw new ForbiddenException('Sin permisos');
    const rel = await this.prisma.complejoAdministrador.findUnique({
      where: { complejoId_usuarioId: { complejoId, usuarioId: user.id } },
    });
    if (!rel) throw new ForbiddenException('No administras este complejo');
  }

  /** null = todos los complejos (super admin) */
  async complejosAdministrados(user: AuthUser): Promise<number[] | null> {
    if (user.rol === 'super_admin') return null;
    const rows = await this.prisma.complejoAdministrador.findMany({
      where: { usuarioId: user.id },
      select: { complejoId: true },
    });
    return rows.map((r) => r.complejoId);
  }
}

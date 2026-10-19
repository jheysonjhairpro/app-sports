import { Injectable, Logger } from '@nestjs/common';
import { TipoNotificacion } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

export interface NuevaNotificacion {
  usuarioId: number;
  reservaId?: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  /** true = además de la notificación en la app, enviar correo */
  correo?: boolean;
}

@Injectable()
export class NotificacionesService {
  private log = new Logger(NotificacionesService.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  /**
   * Crea la notificación en la app y, si se pidió, envía el correo y deja registro en BD.
   * No lanza errores. (Fase 2: mover el envío a una cola con reintentos.)
   */
  async notificar(n: NuevaNotificacion): Promise<void> {
    try {
      const base = { usuarioId: n.usuarioId, reservaId: n.reservaId, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje };
      await this.prisma.notificacion.create({ data: { ...base, canal: 'app' } });

      if (n.correo) {
        const u = await this.prisma.usuario.findUnique({ where: { id: n.usuarioId }, select: { correo: true, nombre: true } });
        if (!u) return;
        const ok = await this.mail.enviarNotificacion(u.correo, u.nombre, n.titulo, n.mensaje);
        await this.prisma.notificacion.create({
          data: { ...base, canal: 'correo', leida: true, enviadaEn: ok ? new Date() : null },
        });
      }
    } catch (e) {
      this.log.error(`No se pudo notificar al usuario ${n.usuarioId}: ${(e as Error).message}`);
    }
  }

  misNotificaciones(usuarioId: number, soloNoLeidas = false) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId, canal: 'app', ...(soloNoLeidas && { leida: false }) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async marcarLeida(usuarioId: number, id: number) {
    await this.prisma.notificacion.updateMany({ where: { id, usuarioId }, data: { leida: true } });
    return { ok: true };
  }

  async marcarTodas(usuarioId: number) {
    await this.prisma.notificacion.updateMany({ where: { usuarioId, leida: false }, data: { leida: true } });
    return { ok: true };
  }
}

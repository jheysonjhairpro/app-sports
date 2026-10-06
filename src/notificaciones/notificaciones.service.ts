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

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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
        const ok = await this.mail.enviar(u.correo, n.titulo, this.plantilla(u.nombre, n.titulo, n.mensaje));
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

  private plantilla(nombre: string, titulo: string, mensaje?: string) {
    return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#0F9D78">GrassFit</h2>
      <p>Hola ${esc(nombre)},</p>
      <h3>${esc(titulo)}</h3>
      <p>${esc(mensaje ?? '')}</p>
      <hr><small style="color:#888">Este es un mensaje automático de GrassFit.</small></div>`;
  }
}

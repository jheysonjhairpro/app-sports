import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { correoHtml, correoTexto, DatosCorreo, MARCA } from './plantillas';

@Injectable()
export class MailService {
  private log = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      const user = config.get<string>('SMTP_USER');
      this.transporter = createTransport({
        host,
        port: Number(config.get('SMTP_PORT') ?? 587),
        secure: config.get('SMTP_SECURE') === 'true',
        auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
      });
    }
  }

  get configurado() {
    return !!this.transporter;
  }

  /** Devuelve true si el correo salió. Nunca lanza: un fallo de correo no debe tumbar una reserva. */
  async enviar(to: string, asunto: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter) {
      this.log.warn(`[SMTP no configurado] Correo a ${to}: ${asunto}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM') ?? `${MARCA} <no-reply@abanplay.app>`,
        to,
        subject: asunto,
        html,
        text,
      });
      return true;
    } catch (e) {
      this.log.error(`Fallo enviando correo a ${to}: ${(e as Error).message}`);
      return false;
    }
  }

  private enviarPlantilla(to: string, asunto: string, d: DatosCorreo) {
    return this.enviar(to, asunto, correoHtml(d), correoTexto(d));
  }

  /** Registro: código para confirmar el correo. */
  enviarCodigoVerificacion(to: string, nombre: string, codigo: string, minutos: number) {
    return this.enviarPlantilla(to, `${codigo} es tu código de verificación de ${MARCA}`, {
      nombre,
      codigo,
      minutos,
      etiquetaCodigo: 'Código de Verificación',
      intro:
        'Estás a un paso de completar tu registro. Usa el siguiente código de verificación de 6 dígitos para confirmar tu correo electrónico:',
      nota: 'Si no solicitaste este código, puedes ignorar este mensaje de forma segura. Alguien pudo haber digitado mal su dirección de correo.',
    });
  }

  /** Recuperar contraseña: código para poder crear una contraseña nueva. */
  enviarCodigoRecuperacion(to: string, nombre: string, codigo: string, minutos: number) {
    return this.enviarPlantilla(to, `${codigo} es tu código para recuperar tu contraseña de ${MARCA}`, {
      nombre,
      codigo,
      minutos,
      titulo: 'Restablece tu contraseña',
      etiquetaCodigo: 'Código de Recuperación',
      intro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa este código de 6 dígitos para continuar:',
      nota: 'Si no fuiste tú, ignora este mensaje: tu contraseña seguirá siendo la misma. Nunca compartas este código con nadie.',
    });
  }

  /** Aviso de seguridad después de cambiar la contraseña. */
  enviarPasswordCambiada(to: string, nombre: string) {
    return this.enviarPlantilla(to, `Tu contraseña de ${MARCA} fue actualizada`, {
      nombre,
      titulo: 'Contraseña actualizada',
      intro:
        'Te confirmamos que la contraseña de tu cuenta se cambió correctamente. Por seguridad, cerramos todas tus sesiones abiertas: tendrás que iniciar sesión de nuevo.',
      nota: 'Si no fuiste tú, usa "¿Olvidaste tu contraseña?" en la app para recuperar tu cuenta de inmediato.',
    });
  }

  /** Notificaciones de reservas (creada, confirmada, rechazada, voucher...). */
  enviarNotificacion(to: string, nombre: string, titulo: string, mensaje?: string) {
    return this.enviarPlantilla(to, titulo, { nombre, titulo, intro: mensaje ?? '' });
  }
}

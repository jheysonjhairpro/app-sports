import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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
  async enviar(to: string, asunto: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.log.warn(`[SMTP no configurado] Correo a ${to}: ${asunto}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM') ?? 'GrassFit <no-reply@grassfit.app>',
        to,
        subject: asunto,
        html,
      });
      return true;
    } catch (e) {
      this.log.error(`Fallo enviando correo a ${to}: ${(e as Error).message}`);
      return false;
    }
  }

  enviarCodigoVerificacion(to: string, nombre: string, codigo: string, minutos: number) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="color:#0F9D78;margin:0 0 8px">GrassFit</h2>
      <p>Hola ${esc(nombre)}, usa este código para verificar tu correo:</p>
      <p style="font-size:34px;letter-spacing:10px;font-weight:bold;text-align:center;margin:24px 0">${codigo}</p>
      <p style="color:#666">El código vence en ${minutos} minutos. Si no fuiste tú, ignora este mensaje.</p></div>`;
    return this.enviar(to, `${codigo} es tu código de verificación de GrassFit`, html);
  }
}

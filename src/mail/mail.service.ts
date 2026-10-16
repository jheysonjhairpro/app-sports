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
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f7f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7f9; padding: 40px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            
            <!-- Header con Gradiente Premium de AbanPlay -->
            <tr>
              <td style="background: linear-gradient(135deg, #013568 0%, #0b437a 100%); padding: 36px 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                  Aban<span style="color: #10D017;">Play</span>
                </h1>
                <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 2.5px; text-transform: uppercase;">
                  Tu Cancha en Abancay
                </p>
              </td>
            </tr>

            <!-- Cuerpos de Mensaje -->
            <tr>
              <td style="padding: 36px 32px;">
                <h3 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 700;">
                  ¡Hola, ${esc(nombre)}! 👋
                </h3>
                <p style="margin: 0 0 28px 0; color: #64748B; font-size: 14px; line-height: 1.6;">
                  Estás a un paso de completar tu registro. Usa el siguiente código de verificación de 6 dígitos para confirmar tu correo electrónico:
                </p>

                <!-- Caja OTP Destacada -->
                <div style="background-color: #013568; border-radius: 16px; padding: 24px 16px; text-align: center; border: 1px solid rgba(16, 208, 23, 0.3); margin-bottom: 28px;">
                  <span style="display: block; font-size: 11px; font-weight: 700; color: #10D017; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
                    Código de Verificación
                  </span>
                  <div style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #ffffff; text-indent: 12px; font-family: monospace;">
                    ${codigo}
                  </div>
                </div>

                <!-- Aviso de Expiración -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFF7ED; border-radius: 12px; border: 1px solid #FFEDD5; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 12px 16px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #C2410C; font-weight: 600;">
                        ⏱️ Este código vencerá en <strong>${minutos} minutos</strong>.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin: 0; color: #94A3B8; font-size: 12px; line-height: 1.5; text-align: center;">
                  Si no solicitaste este código, puedes ignorar este mensaje de forma segura. Alguien pudo haber digitado mal su dirección de correo.
                </p>
              </td>
            </tr>

            <!-- Footer Institucional -->
            <tr>
              <td style="background-color: #F8FAFC; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                  © ${new Date().getFullYear()} AbanPlay. Todos los derechos reservados.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return this.enviar(to, `${codigo} es tu código de verificación de AbanPlay`, html);
}
}

/**
 * Plantilla de correos de AbanPlay. Código puro optimizado y profesional.
 */
export const MARCA = 'AbanPlay';

// URL pública de tu logotipo (reemplaza esto con tu enlace real HTTPS)
export const URL_LOGO = 'https://res.cloudinary.com/obz4qegq/image/upload/v1793025586/logo-login.png';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface DatosCorreo {
  nombre: string;
  intro: string;
  /** Subtítulo en negrita (opcional). Ej: "Reserva confirmada" */
  titulo?: string;
  /** Si viene, se muestra la caja grande con el código */
  codigo?: string;
  etiquetaCodigo?: string;
  minutos?: number;
  /** Texto pequeño final (seguridad / "si no fuiste tú...") */
  nota?: string;
}

export function correoHtml(d: DatosCorreo): string {
  const titulo = d.titulo
    ? `<p style="margin: 0 0 12px 0; color: #013568; font-size: 17px; font-weight: 800; letter-spacing: -0.2px;">${esc(d.titulo)}</p>`
    : '';

  const bloqueCodigo = d.codigo
    ? `
        <!-- Caja OTP Destacada -->
        <div style="background: linear-gradient(135deg, #013568 0%, #0b437a 100%); border-radius: 14px; padding: 28px 16px; text-align: center; border: 1px solid rgba(16, 208, 23, 0.4); box-shadow: 0 4px 12px rgba(1, 53, 104, 0.15); margin-bottom: 24px;">
          <span style="display: block; font-size: 11px; font-weight: 700; color: #10D017; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
            ${esc(d.etiquetaCodigo ?? 'Código de Verificación')}
          </span>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #ffffff; text-indent: 10px; font-family: 'Courier New', Courier, monospace;">
            ${esc(d.codigo)}
          </div>
        </div>`
    : '';

  const aviso =
    d.codigo && d.minutos
      ? `
        <!-- Aviso de Expiración -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 16px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #475569; font-weight: 600;">
                ⏱️ Este código expirará en <span style="color: #013568; font-weight: 700;">${d.minutos} minutos</span>.
              </p>
            </td>
          </tr>
        </table>`
      : '';

  const nota = d.nota
    ? `
        <p style="margin: 0; color: #94A3B8; font-size: 12px; line-height: 1.5; text-align: center; border-top: 1px solid #F1F5F9; padding-top: 16px;">
          ${esc(d.nota)}
        </p>`
    : '';

  const preheader = d.codigo ? `Tu código es ${d.codigo}. Vence en ${d.minutos ?? ''} minutos.` : (d.titulo ?? d.intro).slice(0, 90);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">

            <!-- Header Limpio y Profesional con Logotipo -->
            <tr>
              <td style="background-color: #ffffff; padding: 5px 5px 5px 5px; text-align: center; border-bottom: 2px solid #F8FAFC;">
                <img src="${URL_LOGO}" alt="AbanPlay" width="130" style="display: block; margin: 0 auto; max-width: 140px; height: auto;" />
              </td>
            </tr>

            <!-- Cuerpo del mensaje -->
            <tr>
              <td style="padding: 32px 32px 28px 32px;">
                <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                  ¡Hola, ${esc(d.nombre)}! 👋
                </h3>
                ${titulo}
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                  ${esc(d.intro)}
                </p>
${bloqueCodigo}
${aviso}
${nota}
              </td>
            </tr>

            <!-- Footer Institucional -->
            <tr>
              <td style="background-color: #F8FAFC; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0; font-size: 11px; color: #64748B; font-weight: 600;">
                  ${MARCA} &bull; Tu Cancha en Abancay
                </p>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #94A3B8;">
                  &copy; ${new Date().getFullYear()} Todos los derechos reservados.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 10px; color: #CBD5E1;">
                  Este es un mensaje automático, por favor no respondas a este correo.
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
}

/** Versión en texto plano para clientes de correo sin soporte HTML. */
export function correoTexto(d: DatosCorreo): string {
  const lineas = [`Hola, ${d.nombre}`, ''];
  if (d.titulo) lineas.push(d.titulo);
  lineas.push(d.intro);
  if (d.codigo) {
    lineas.push('', `${d.etiquetaCodigo ?? 'Código de Verificación'}: ${d.codigo}`);
    if (d.minutos) lineas.push(`Este código vence en ${d.minutos} minutos.`);
  }
  if (d.nota) lineas.push('', d.nota);
  lineas.push('', `— ${MARCA} (Tu Cancha en Abancay)`);
  return lineas.join('\n');
}
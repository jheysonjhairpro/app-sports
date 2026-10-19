/**
 * Plantilla de correos de AbanPlay. Es código puro (sin dependencias de Nest) para poder probarlo y previsualizarlo.
 * El diseño de verificación es el mismo de siempre; se reutiliza para recuperar contraseña y para las notificaciones.
 */
export const MARCA = 'AbanPlay';

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
    ? `<p style="margin: 0 0 12px 0; color: #013568; font-size: 16px; font-weight: 800;">${esc(d.titulo)}</p>`
    : '';

  const bloqueCodigo = d.codigo
    ? `
                <!-- Caja OTP Destacada -->
                <div style="background-color: #013568; border-radius: 16px; padding: 24px 16px; text-align: center; border: 1px solid rgba(16, 208, 23, 0.3); margin-bottom: 28px;">
                  <span style="display: block; font-size: 11px; font-weight: 700; color: #10D017; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
                    ${esc(d.etiquetaCodigo ?? 'Código de Verificación')}
                  </span>
                  <div style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #ffffff; text-indent: 12px; font-family: monospace;">
                    ${esc(d.codigo)}
                  </div>
                </div>`
    : '';

  const aviso =
    d.codigo && d.minutos
      ? `
                <!-- Aviso de Expiración -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFF7ED; border-radius: 12px; border: 1px solid #FFEDD5; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 12px 16px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #C2410C; font-weight: 600;">
                        ⏱️ Este código vencerá en <strong>${d.minutos} minutos</strong>.
                      </p>
                    </td>
                  </tr>
                </table>`
      : '';

  const nota = d.nota
    ? `
                <p style="margin: 0; color: #94A3B8; font-size: 12px; line-height: 1.5; text-align: center;">
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
  <body style="margin: 0; padding: 0; background-color: #f4f7f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${esc(preheader)}</div>
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

            <!-- Cuerpo del mensaje -->
            <tr>
              <td style="padding: 36px 32px;">
                <h3 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 700;">
                  ¡Hola, ${esc(d.nombre)}! 👋
                </h3>
                ${titulo}
                <p style="margin: 0 0 28px 0; color: #64748B; font-size: 14px; line-height: 1.6;">
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
                <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                  © ${new Date().getFullYear()} ${MARCA}. Todos los derechos reservados.
                </p>
                <p style="margin: 6px 0 0 0; font-size: 10px; color: #CBD5E1;">
                  Mensaje automático, por favor no respondas a este correo.
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

/** Versión en texto plano (mejora la entrega y sirve cuando el cliente de correo no muestra HTML). */
export function correoTexto(d: DatosCorreo): string {
  const lineas = [`Hola, ${d.nombre}`, ''];
  if (d.titulo) lineas.push(d.titulo);
  lineas.push(d.intro);
  if (d.codigo) {
    lineas.push('', `${d.etiquetaCodigo ?? 'Código de Verificación'}: ${d.codigo}`);
    if (d.minutos) lineas.push(`Este código vence en ${d.minutos} minutos.`);
  }
  if (d.nota) lineas.push('', d.nota);
  lineas.push('', `— ${MARCA}`);
  return lineas.join('\n');
}

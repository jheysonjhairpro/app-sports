import { correoHtml, correoTexto } from './plantillas';

describe('plantillas de correo', () => {
  const base = { nombre: 'Andrés', intro: 'Texto de prueba' };

  it('muestra el código y el aviso de expiración', () => {
    const html = correoHtml({ ...base, codigo: '483920', minutos: 10, etiquetaCodigo: 'Código de Recuperación' });
    expect(html.includes('483920')).toBe(true);
    expect(html.includes('Código de Recuperación')).toBe(true);
    expect(html.includes('10 minutos')).toBe(true);
  });

  it('sin código no dibuja la caja ni el aviso', () => {
    const html = correoHtml({ ...base, titulo: 'Reserva confirmada' });
    expect(html.includes('Caja OTP')).toBe(false);
    expect(html.includes('vencerá')).toBe(false);
    expect(html.includes('Reserva confirmada')).toBe(true);
  });

  it('escapa HTML en nombre, título, intro y nota (no se puede inyectar código)', () => {
    const html = correoHtml({ nombre: '<script>alert(1)</script>', titulo: '<b>x</b>', intro: '"><img src=x>', nota: '<i>n</i>' });
    expect(html.includes('<script>')).toBe(false);
    expect(html.includes('<img src=x>')).toBe(false);
    expect(html.includes('<b>x</b>')).toBe(false);
    expect(html.includes('&#60;script&#62;')).toBe(true);
  });

  it('la versión en texto plano incluye el código', () => {
    const t = correoTexto({ ...base, codigo: '111222', minutos: 10 });
    expect(t.includes('111222')).toBe(true);
    expect(t.includes('10 minutos')).toBe(true);
  });
});

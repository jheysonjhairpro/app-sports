import { calcularProgreso } from './fidelidad.util';

describe('calcularProgreso (promoción de fidelidad 7 reservas)', () => {
  it('sin reservas: 0/7 y sin premio', () => {
    expect(calcularProgreso(0, 0, 7)).toEqual({ requeridas: 7, contadas: 0, usadas: 0, progreso: 0, disponibles: 0, agotada: false });
  });

  it('5 reservas contadas: 5/7, todavía sin premio', () => {
    const p = calcularProgreso(5, 0, 7);
    expect(p.progreso).toBe(5);
    expect(p.disponibles).toBe(0);
  });

  it('7 reservas contadas: 7/7 y premio disponible', () => {
    const p = calcularProgreso(7, 0, 7);
    expect(p.progreso).toBe(7);
    expect(p.disponibles).toBe(1);
  });

  it('después de usar el premio el contador vuelve a 0/7', () => {
    const p = calcularProgreso(7, 1, 7);
    expect(p.progreso).toBe(0);
    expect(p.disponibles).toBe(0);
  });

  it('9 reservas y 1 premio usado: 2/7', () => {
    const p = calcularProgreso(9, 1, 7);
    expect(p.progreso).toBe(2);
    expect(p.disponibles).toBe(0);
  });

  it('14 reservas sin usar nada: 2 premios acumulados', () => {
    expect(calcularProgreso(14, 0, 7).disponibles).toBe(2);
  });

  it('si el premio se cancela (usadas baja a 0) el premio vuelve', () => {
    expect(calcularProgreso(7, 1, 7).disponibles).toBe(0);
    expect(calcularProgreso(7, 0, 7).disponibles).toBe(1);
  });

  it('con límite de 1 uso por persona: tras usarlo ya no hay más, aunque siga reservando', () => {
    const p = calcularProgreso(14, 1, 7, 1);
    expect(p.disponibles).toBe(0);
    expect(p.agotada).toBe(true);
  });

  it('con límite de 2 usos: aún puede ganar el segundo', () => {
    const p = calcularProgreso(14, 1, 7, 2);
    expect(p.disponibles).toBe(1);
    expect(p.agotada).toBe(false);
  });

  it('promoción de 5 reservas', () => {
    expect(calcularProgreso(5, 0, 5).disponibles).toBe(1);
    expect(calcularProgreso(4, 0, 5).disponibles).toBe(0);
  });
});

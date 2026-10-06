import { calcularPrecio, PromoReglas } from './precio.util';
import { esHoraExacta, inicioDiaUtc, sumarHoras } from './time.util';

// 2026-10-10 es sábado. 15:00 hora Perú = 20:00 UTC.
const sabado15 = new Date('2026-10-10T20:00:00.000Z');
const bloques = (inicio: Date, n: number) => Array.from({ length: n }, (_, i) => sumarHoras(inicio, i));

const base: PromoReglas = {
  tipo: 'porcentaje', valor: 10, diasSemana: null, horaDesde: null, horaHasta: null,
  vigenteDesde: '2026-01-01', vigenteHasta: '2026-12-31',
};

describe('calcularPrecio', () => {
  it('suma precio_hora × horas', () => {
    expect(calcularPrecio(70, bloques(sabado15, 3))).toEqual({ subtotal: 210, descuento: 0, total: 210 });
  });

  it('10% solo en horarios de la tarde (14:00-18:00)', () => {
    const promo = { ...base, horaDesde: 14, horaHasta: 18 };
    // 3 horas: 15, 16, 17 -> todas aplican
    expect(calcularPrecio(70, bloques(sabado15, 3), promo).descuento).toBe(21);
    // 4 horas desde las 16: 16,17 aplican; 18,19 no
    const desde16 = new Date('2026-10-10T21:00:00.000Z');
    expect(calcularPrecio(70, bloques(desde16, 4), promo).descuento).toBe(14);
  });

  it('2x1 los fines de semana: cada 2 horas, 1 gratis', () => {
    const promo: PromoReglas = { ...base, tipo: 'dos_por_uno', valor: null, diasSemana: [6, 7] };
    expect(calcularPrecio(70, bloques(sabado15, 2), promo)).toEqual({ subtotal: 140, descuento: 70, total: 70 });
    expect(calcularPrecio(70, bloques(sabado15, 3), promo).descuento).toBe(70);
    expect(calcularPrecio(70, bloques(sabado15, 4), promo).descuento).toBe(140);
  });

  it('el 2x1 no aplica en día de semana', () => {
    const promo: PromoReglas = { ...base, tipo: 'dos_por_uno', valor: null, diasSemana: [6, 7] };
    const lunes = new Date('2026-10-12T20:00:00.000Z');
    expect(calcularPrecio(70, bloques(lunes, 2), promo).descuento).toBe(0);
  });

  it('promoción vencida no descuenta y el descuento nunca supera el subtotal', () => {
    expect(calcularPrecio(70, bloques(sabado15, 2), { ...base, vigenteHasta: '2026-01-31' }).descuento).toBe(0);
    expect(calcularPrecio(50, bloques(sabado15, 1), { ...base, tipo: 'monto_fijo', valor: 999 }).total).toBe(0);
  });
});

describe('time.util', () => {
  it('inicioDiaUtc devuelve la medianoche de Perú en UTC', () => {
    expect(inicioDiaUtc('2026-10-10').toISOString()).toBe('2026-10-10T05:00:00.000Z');
  });
  it('esHoraExacta', () => {
    expect(esHoraExacta(sabado15)).toBe(true);
    expect(esHoraExacta(new Date('2026-10-10T20:30:00.000Z'))).toBe(false);
  });
});

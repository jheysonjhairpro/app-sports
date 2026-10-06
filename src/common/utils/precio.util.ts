import { diaSemanaLocal, fechaLocalStr, horaLocal } from './time.util';

export interface PromoReglas {
  tipo: 'porcentaje' | 'monto_fijo' | 'dos_por_uno';
  valor: number | null;
  diasSemana: number[] | null;
  horaDesde: number | null;
  horaHasta: number | null;
  vigenteDesde: string; // YYYY-MM-DD
  vigenteHasta: string; // YYYY-MM-DD
}

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** ¿La promoción cubre esta hora concreta? */
export function bloqueAplicaPromo(bloque: Date, p: PromoReglas): boolean {
  const fecha = fechaLocalStr(bloque);
  if (fecha < p.vigenteDesde || fecha > p.vigenteHasta) return false;
  if (p.diasSemana?.length && !p.diasSemana.includes(diaSemanaLocal(bloque))) return false;
  const h = horaLocal(bloque);
  if (p.horaDesde != null && h < p.horaDesde) return false;
  if (p.horaHasta != null && h >= p.horaHasta) return false;
  return true;
}

/** subtotal = precioHora × horas. El descuento solo cuenta las horas que cubre la promoción. */
export function calcularPrecio(precioHora: number, bloques: Date[], promo?: PromoReglas | null) {
  const subtotal = redondear(precioHora * bloques.length);
  let descuento = 0;

  if (promo) {
    const aplicables = bloques.filter((b) => bloqueAplicaPromo(b, promo)).length;
    if (aplicables > 0) {
      switch (promo.tipo) {
        case 'porcentaje':
          descuento = (precioHora * aplicables * (promo.valor ?? 0)) / 100;
          break;
        case 'monto_fijo':
          descuento = promo.valor ?? 0;
          break;
        case 'dos_por_uno':
          descuento = precioHora * Math.floor(aplicables / 2);
          break;
      }
    }
  }

  descuento = Math.min(redondear(descuento), subtotal);
  return { subtotal, descuento, total: redondear(subtotal - descuento) };
}

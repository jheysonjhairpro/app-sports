/**
 * Contador de una promoción de FIDELIDAD (por persona).
 *
 *  contadas  = reservas que cuentan (aceptadas por el admin y cuyo horario ya pasó)
 *  usadas    = veces que la persona ya aprovechó el premio (reservas vivas que usaron la promoción)
 *  requeridas= cuántas reservas hay que completar para ganar el premio
 *
 * Todo se calcula a partir de las reservas, así que no hay un contador aparte que pueda desincronizarse:
 * si una reserva con premio se cancela o vence, el premio vuelve solo.
 */
export interface ProgresoFidelidad {
  requeridas: number;
  contadas: number;
  usadas: number;
  /** Para mostrar "3/7" (nunca pasa de `requeridas`) */
  progreso: number;
  /** Premios listos para usar ahora */
  disponibles: number;
  /** true si la persona ya llegó al máximo de veces permitido por el admin */
  agotada: boolean;
}

export function calcularProgreso(
  contadas: number,
  usadas: number,
  requeridas: number,
  maxUsos?: number | null,
): ProgresoFidelidad {
  const neto = Math.max(0, contadas - usadas * requeridas);
  let disponibles = Math.floor(neto / requeridas);
  const agotada = maxUsos != null && usadas >= maxUsos;
  if (maxUsos != null) disponibles = Math.max(0, Math.min(disponibles, maxUsos - usadas));
  return { requeridas, contadas, usadas, progreso: Math.min(neto, requeridas), disponibles, agotada };
}

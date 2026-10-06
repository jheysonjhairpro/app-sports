export const TZ_OFFSET_HORAS = -5; // Perú
const H = 3_600_000;

export const sumarHoras = (d: Date, n: number) => new Date(d.getTime() + n * H);
export const aLocal = (d: Date) => new Date(d.getTime() + TZ_OFFSET_HORAS * H);

/** 1=Lunes ... 7=Domingo, en hora local */
export const diaSemanaLocal = (d: Date) => aLocal(d).getUTCDay() || 7;
export const horaLocal = (d: Date) => aLocal(d).getUTCHours();
export const fechaLocalStr = (d: Date) => aLocal(d).toISOString().slice(0, 10);

/** 'YYYY-MM-DD' (fecha local) -> instante UTC de la medianoche local */
export function inicioDiaUtc(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - TZ_OFFSET_HORAS * H);
}

export const esHoraExacta = (d: Date) =>
  d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

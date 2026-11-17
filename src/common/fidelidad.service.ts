import { Injectable } from '@nestjs/common';
import { Prisma, Promocion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularProgreso, ProgresoFidelidad } from './utils/fidelidad.util';
import { inicioDiaUtc, sumarHoras } from './utils/time.util';

type Db = Prisma.TransactionClient;

@Injectable()
export class FidelidadService {
  constructor(private prisma: PrismaService) {}

  /**
   * Progreso de UNA persona en una promoción de fidelidad (null si la promoción no es de fidelidad).
   * Se puede llamar dentro de una transacción pasando `db`.
   *
   * Cuenta una reserva cuando: es de esta persona, en este complejo, fue aceptada por el admin
   * (confirmada/completada), su horario YA PASÓ, cae dentro de las fechas de la promoción y no es
   * una reserva que ya usó este mismo premio.
   */
  async progreso(usuarioId: number, promo: Promocion, db: Db = this.prisma): Promise<ProgresoFidelidad | null> {
    if (!promo.reservasRequeridas) return null;

    const desde = inicioDiaUtc(promo.vigenteDesde.toISOString().slice(0, 10));
    const hasta = sumarHoras(inicioDiaUtc(promo.vigenteHasta.toISOString().slice(0, 10)), 24);

    const contadas = await db.reserva.count({
      where: {
        usuarioId,
        cancha: { complejoId: promo.complejoId },
        estado: { in: ['confirmada', 'completada'] },
        fin: { lt: new Date() },
        inicio: { gte: desde, lt: hasta },
        OR: [{ promocionId: null }, { promocionId: { not: promo.id } }],
      },
    });

    // Un premio cuenta como "usado" mientras su reserva siga viva; si se cancela o vence, el premio vuelve
    const usadas = await db.reserva.count({
      where: { usuarioId, promocionId: promo.id, estado: { in: ['pendiente', 'confirmada', 'completada'] } },
    });

    return calcularProgreso(contadas, usadas, promo.reservasRequeridas, promo.usosMaximosPorPersona);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CanchasModule } from './canchas/canchas.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ComplejosModule } from './complejos/complejos.module';
import { HealthController } from './health.controller';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { PagosModule } from './pagos/pagos.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromocionesModule } from './promociones/promociones.module';
import { ReportesModule } from './reportes/reportes.module';
import { ReservasModule } from './reservas/reservas.module';
import { StorageModule } from './storage/storage.module';
import { UsuariosModule } from './usuarios/usuarios.module';

const REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET'];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        const faltan = REQUERIDAS.filter((k) => !env[k]);
        if (faltan.length) throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}`);
        return env;
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    NotificacionesModule,
    AuthModule,
    UsuariosModule,
    ComplejosModule,
    CanchasModule,
    PromocionesModule,
    ReservasModule,
    PagosModule,
    StorageModule,
    ReportesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Orden: límite de peticiones -> autenticación -> roles
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

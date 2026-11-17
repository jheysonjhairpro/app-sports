import { Global, Module } from '@nestjs/common';
import { AccesoService } from './acceso.service';
import { FidelidadService } from './fidelidad.service';

@Global()
@Module({ providers: [AccesoService, FidelidadService], exports: [AccesoService, FidelidadService] })
export class CommonModule {}

import { Module } from '@nestjs/common';
import { ComplejosController } from './complejos.controller';
import { ComplejosService } from './complejos.service';

@Module({ controllers: [ComplejosController], providers: [ComplejosService] })
export class ComplejosModule {}

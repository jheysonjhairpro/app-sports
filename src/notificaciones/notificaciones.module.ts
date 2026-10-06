import { Global, Module } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

@Global()
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService, MailService],
  exports: [NotificacionesService, MailService],
})
export class NotificacionesModule {}

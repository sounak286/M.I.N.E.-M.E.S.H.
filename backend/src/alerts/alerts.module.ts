import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';

@Module({
  imports: [],
  controllers: [],
  providers: [AlertsService],
  exports: [],
})
export class AlertsModule {}

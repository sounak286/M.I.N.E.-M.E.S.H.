import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

@Module({
  imports: [],
  controllers: [],
  providers: [RealtimeGateway, RealtimeService],
  exports: [],
})
export class RealtimeModule {}

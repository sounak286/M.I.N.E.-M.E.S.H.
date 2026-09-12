import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service.js';
import { MlModule } from '../ml/ml.module.js';

@Module({
  imports: [MlModule],
  controllers: [],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}

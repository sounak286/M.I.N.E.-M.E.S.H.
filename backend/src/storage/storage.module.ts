import { Module } from '@nestjs/common';
import { STORAGE_ADAPTER } from './storage.interface.js';
import { MemoryStorageService } from './memory-storage.service.js';

@Module({
  imports: [],
  controllers: [],
  providers: [
    MemoryStorageService,
    {
      provide: STORAGE_ADAPTER,
      useExisting: MemoryStorageService,
    }
  ],
  exports: [STORAGE_ADAPTER],
})
export class StorageModule {}

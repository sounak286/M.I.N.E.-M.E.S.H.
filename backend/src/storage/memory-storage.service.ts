import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { StorageAdapter } from './storage.interface.js';
import type { ValidatedSensorReading } from '../ingestion/sensor-reading.interface.js';

@Injectable()
export class MemoryStorageService implements StorageAdapter, OnModuleDestroy {
  private readonly logger = new Logger(MemoryStorageService.name);
  
  // In-memory array for Phase 2 demo purposes
  private readings: ValidatedSensorReading[] = [];

  // Listen to the deduped event from ProcessingModule
  @OnEvent('sensor.reading.deduped')
  handleDedupedReading(reading: ValidatedSensorReading) {
    this.saveReading(reading).catch(err => {
      this.logger.error(`Failed to save reading: ${err.message}`);
    });
  }

  async saveReading(reading: ValidatedSensorReading): Promise<void> {
    this.readings.push(reading);
    
    // Log every 50th reading to show storage is working without spamming the console
    if (this.readings.length % 50 === 0) {
      this.logger.log(`[storage] Currently storing ${this.readings.length} readings total.`);
    }
  }

  async getTotalReadingsCount(): Promise<number> {
    return this.readings.length;
  }

  onModuleDestroy() {
    this.logger.log(`\n=== FINAL STORAGE COUNT: ${this.readings.length} readings ===\n`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import type { ValidatedSensorReading } from '../ingestion/sensor-reading.interface.js';
import type { NodeStatusState } from '../ingestion/node-status.interface.js';
import type { ShadowMlPrediction } from '../ml/ml.interface.js';
import type { SubsidenceAlert, AlertSeverity, AlertRule } from './alert.interface.js';

export const THRESHOLD_RULES: AlertRule[] = [
  {
    id: 'rule-tilt-crit',
    name: 'Severe Subsidence Tilt',
    sensorType: 'tilt',
    operator: '>=',
    threshold: 3.5,
    unit: '°',
    severity: 'critical',
    description: 'Biaxial tilt exceeds critical structural safety limit (3.5°)',
  },
  {
    id: 'rule-tilt-warn',
    name: 'Elevated Strata Tilt',
    sensorType: 'tilt',
    operator: '>=',
    threshold: 2.0,
    unit: '°',
    severity: 'warning',
    description: 'Ground slope displacement elevated above baseline (2.0°)',
  },
  {
    id: 'rule-crack-breach',
    name: 'Ground Fissure Rupture',
    sensorType: 'crack',
    operator: '>=',
    threshold: 1,
    unit: 'state',
    severity: 'critical',
    description: 'Binary tripwire detected surface crack opening / displacement',
  },
  {
    id: 'rule-vibe-crit',
    name: 'Extreme Strata Tremor',
    sensorType: 'vibration',
    operator: '>=',
    threshold: 15.0,
    unit: 'mm/s',
    severity: 'critical',
    description: 'Ground peak particle velocity (PPV) exceeded emergency threshold (15 mm/s)',
  },
  {
    id: 'rule-vibe-warn',
    name: 'Elevated Seismic Vibration',
    sensorType: 'vibration',
    operator: '>=',
    threshold: 8.0,
    unit: 'mm/s',
    severity: 'warning',
    description: 'Ground vibration elevated above baseline (8.0 mm/s)',
  },
  {
    id: 'rule-gas-crit',
    name: 'Critical Gas Hazard',
    sensorType: 'gas',
    operator: '>=',
    threshold: 250,
    unit: 'ppm',
    severity: 'critical',
    description: 'Sub-surface explosive/toxic gas reached critical threshold (250 ppm)',
  },
  {
    id: 'rule-gas-warn',
    name: 'Hazardous Gas Accumulation',
    sensorType: 'gas',
    operator: '>=',
    threshold: 100,
    unit: 'ppm',
    severity: 'warning',
    description: 'Gas concentration elevated above safe baseline (100 ppm)',
  },
  {
    id: 'rule-water-crit',
    name: 'Piezometer In-Rush Flood Hazard',
    sensorType: 'water',
    operator: '>=',
    threshold: 350,
    unit: 'cm',
    severity: 'critical',
    description: 'Pore water pressure / groundwater table breached safety limit (350 cm)',
  },
  {
    id: 'rule-miner-proximity',
    name: 'Personnel Hazard Zone Proximity',
    sensorType: 'miner_proximity',
    operator: '>=',
    threshold: 1,
    unit: 'beacon',
    severity: 'critical',
    description: 'ESP-NOW beacon detected active miner personnel near hazard sensor node',
  },
];

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  // In-memory ring buffer of recent alerts
  private readonly alerts: SubsidenceAlert[] = [];
  private readonly MAX_ALERTS = 100;

  // Debounce map: `nodeId:ruleId` -> lastTriggeredTimestampMs (prevents alert storm on 5s loop)
  private readonly alertCooldowns = new Map<string, number>();
  private readonly COOLDOWN_MS = 25_000; // 25s cooldown between identical alerts per node

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('node.status.changed')
  handleNodeStatusChanged(status: NodeStatusState) {
    if (status.status === 'offline') {
      const cooldownKey = `${status.nodeId}:node-offline`;
      const now = Date.now();
      const last = this.alertCooldowns.get(cooldownKey) || 0;
      if (now - last < this.COOLDOWN_MS) return;
      this.alertCooldowns.set(cooldownKey, now);

      const alert: SubsidenceAlert = {
        id: `offline-${status.nodeId}-${now}`,
        nodeId: status.nodeId,
        zoneId: status.zoneId,
        sensorType: 'tilt',
        value: 0,
        threshold: 0,
        unit: '',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        message: `Node ${status.nodeId} communication lost (>30s without LoRa packet)`,
      };

      this.recordAndEmitAlert(alert);
    }
  }

  @OnEvent('sensor.reading.deduped')
  handleDedupedReading(reading: ValidatedSensorReading) {
    const { nodeId, zoneId, sensorType, value, unit, sequenceNumber, timestamp } = reading;

    for (const rule of THRESHOLD_RULES) {
      if (rule.sensorType.toLowerCase() !== sensorType.toLowerCase()) continue;

      let triggered = false;
      if (rule.operator === '>=' && value >= rule.threshold) triggered = true;
      else if (rule.operator === '>' && value > rule.threshold) triggered = true;
      else if (rule.operator === '==' && value === rule.threshold) triggered = true;

      if (triggered) {
        const cooldownKey = `${nodeId}:${rule.id}`;
        const now = Date.now();
        const last = this.alertCooldowns.get(cooldownKey) || 0;
        if (now - last < this.COOLDOWN_MS) continue;
        this.alertCooldowns.set(cooldownKey, now);

        const alert: SubsidenceAlert = {
          id: `hw-${nodeId}-${sensorType}-${sequenceNumber}-${now}`,
          nodeId,
          zoneId,
          sensorType,
          value,
          threshold: rule.threshold,
          unit,
          severity: rule.severity,
          timestamp: timestamp || new Date().toISOString(),
          message: `${rule.severity.toUpperCase()}: ${rule.name} on ${nodeId} (${value} ${unit} >= ${rule.threshold} ${rule.unit})`,
        };

        this.recordAndEmitAlert(alert);
        // Break after matching highest severity rule for this channel
        if (rule.severity === 'critical') break;
      }
    }
  }

  @OnEvent('ml.prediction.generated')
  handleMlPrediction(prediction: ShadowMlPrediction) {
    const isRisk =
      prediction.anomaly_class === 'subsidence_risk' ||
      prediction.alert_level === 'RED' ||
      prediction.alert_level === 'ORANGE';

    if (isRisk) {
      const cooldownKey = `${prediction.nodeId}:ml-subsidence-risk`;
      const now = Date.now();
      const last = this.alertCooldowns.get(cooldownKey) || 0;
      if (now - last < this.COOLDOWN_MS) return;
      this.alertCooldowns.set(cooldownKey, now);

      const isCritical = prediction.alert_level === 'RED' || prediction.severity >= 0.6;
      const confidencePct = Math.round(
        (prediction.class_probs?.[prediction.anomaly_class] || 0) * 100,
      );
      const severityPct = Math.round(prediction.severity * 100);

      const alert: SubsidenceAlert = {
        id: prediction.predictionId || `ml-risk-${prediction.nodeId}-${now}`,
        nodeId: prediction.nodeId,
        zoneId: prediction.zoneId,
        sensorType: 'tilt',
        value: prediction.severity,
        threshold: 0.2,
        unit: 'severity',
        severity: isCritical ? 'critical' : 'warning',
        timestamp: prediction.timestamp || new Date().toISOString(),
        message: `[AI/ML Early Warning] ${
          prediction.anomaly_class === 'subsidence_risk'
            ? 'Imminent Strata Subsidence Precursor'
            : 'Heavy Machinery Cutting Vibration'
        } on ${prediction.nodeId} (${confidencePct}% confidence, severity: ${severityPct}%)`,
      };

      this.recordAndEmitAlert(alert);
    }
  }

  private recordAndEmitAlert(alert: SubsidenceAlert): void {
    this.alerts.unshift(alert);
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.pop();
    }

    this.logger.warn(`[AlertsService] ${alert.message}`);
    this.eventEmitter.emit('alert.triggered', alert);
  }

  getActiveAlerts(): SubsidenceAlert[] {
    return [...this.alerts];
  }

  resolveAlert(id: string): boolean {
    const found = this.alerts.find((a) => a.id === id);
    if (found) {
      found.resolved = true;
      this.eventEmitter.emit('alert.resolved', found);
      return true;
    }
    return false;
  }
}

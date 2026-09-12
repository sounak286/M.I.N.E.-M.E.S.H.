"use client";

import React, { useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SystemLatencyMetrics } from '@/types/socket';
import { GatewayStatus } from '@/context/RealtimeContext';
import { ValidatedSensorReading } from '@/types/sensor';
import { ShadowMlPrediction } from '@/types/ml';
import { SENSOR_CONFIGS } from '@/lib/constants';
import {
  Activity,
  Compass,
  Zap,
  BrainCircuit,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
  Radio,
} from 'lucide-react';

interface AnalyticsKpiCardsProps {
  readings: Record<string, Record<string, Record<string, ValidatedSensorReading>>>;
  mlPredictions: Record<string, Record<string, ShadowMlPrediction>>;
  metrics: SystemLatencyMetrics;
  gatewayStatus: GatewayStatus;
  stats: {
    totalZones: number;
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    totalGaps: number;
    activeSensorsCount: number;
  };
  isSimulationActive: boolean;
}

export function AnalyticsKpiCards({
  readings,
  mlPredictions,
  metrics,
  gatewayStatus,
  stats,
  isSimulationActive,
}: AnalyticsKpiCardsProps) {
  // Aggregate peak sensor values across all zones and nodes
  const aggregates = useMemo(() => {
    let maxTilt = 0;
    let maxTiltNode = 'None';
    let maxVibration = 0;
    let maxVibrationNode = 'None';
    let maxDisplacement = 0;
    let maxGas = 0;
    let maxWater = 0;
    let totalReadingsCount = 0;

    Object.values(readings).forEach(zoneNodes => {
      Object.entries(zoneNodes).forEach(([nodeId, sensorMap]) => {
        Object.values(sensorMap).forEach(r => {
          totalReadingsCount++;
          if (r.sensorType === 'tilt' && r.value > maxTilt) {
            maxTilt = r.value;
            maxTiltNode = nodeId;
          }
          if (r.sensorType === 'vibration' && r.value > maxVibration) {
            maxVibration = r.value;
            maxVibrationNode = nodeId;
          }
          if (r.sensorType === 'displacement' && r.value > maxDisplacement) {
            maxDisplacement = r.value;
          }
          if (r.sensorType === 'gas' && r.value > maxGas) {
            maxGas = r.value;
          }
          if (r.sensorType === 'water' && r.value > maxWater) {
            maxWater = r.value;
          }
        });
      });
    });

    // Aggregate ML Predictions
    let maxSeverity = 0;
    let highestRiskNode = 'None';
    let highestAlertLevel = 'GREEN';
    let highestRiskClass = 'normal';
    let totalMlPreds = 0;
    let sumLatency = 0;

    Object.values(mlPredictions).forEach(zonePreds => {
      Object.entries(zonePreds).forEach(([nodeId, pred]) => {
        totalMlPreds++;
        sumLatency += pred.inferenceLatencyMs || 12;
        if (pred.severity > maxSeverity) {
          maxSeverity = pred.severity;
          highestRiskNode = nodeId;
          highestAlertLevel = pred.alert_level || 'GREEN';
          highestRiskClass = pred.anomaly_class || 'normal';
        }
      });
    });

    const avgInferenceLatency =
      totalMlPreds > 0 ? Math.round(sumLatency / totalMlPreds) : 14;

    return {
      maxTilt,
      maxTiltNode,
      maxVibration,
      maxVibrationNode,
      maxDisplacement,
      maxGas,
      maxWater,
      totalReadingsCount,
      maxSeverity,
      highestRiskNode,
      highestAlertLevel,
      highestRiskClass,
      totalMlPreds,
      avgInferenceLatency,
    };
  }, [readings, mlPredictions]);

  // Alert Level styles for ML Risk
  const alertBadgeVariant = useMemo(() => {
    switch (aggregates.highestAlertLevel) {
      case 'RED':
        return 'danger';
      case 'ORANGE':
      case 'YELLOW':
        return 'warning';
      default:
        return 'success';
    }
  }, [aggregates.highestAlertLevel]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 min-w-0">
      {/* 1. Fleet Telemetry Stream */}
      <Card className="p-4 bg-white/95 dark:bg-[#14213d]/40 border-[#e5e5e5] dark:border-[#14213d] relative overflow-hidden group hover:border-[#fca311]/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#5c677d] dark:text-[#94a3b8] tracking-wider uppercase">
            Fleet Telemetry
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#000000] dark:text-white font-mono tracking-tight">
            {stats.onlineNodes}
            <span className="text-sm font-normal text-[#5c677d] dark:text-[#94a3b8]">
              /{stats.totalNodes}
            </span>
          </span>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            {isSimulationActive ? 'SIM ACTIVE' : 'LIVE MESH'}
          </span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-[#e5e5e5]/80 dark:border-[#14213d]/80 flex items-center justify-between text-[11px] font-mono text-[#5c677d] dark:text-[#94a3b8]">
          <span>Rate: <strong className="text-[#14213d] dark:text-white">{metrics.packetsPerSec} pps</strong></span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {(metrics.transportFormat || 'Protobuf (Binary)').split(' ')[0]}
          </span>
        </div>

        {/* Subtle accent bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/70" />
      </Card>

      {/* 2. Peak Strata Tilt */}
      <Card className="p-4 bg-white/95 dark:bg-[#14213d]/40 border-[#e5e5e5] dark:border-[#14213d] relative overflow-hidden group hover:border-[#fca311]/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#5c677d] dark:text-[#94a3b8] tracking-wider uppercase">
            Peak Ground Tilt
          </span>
          <div
            className={`p-1.5 rounded-lg ${
              aggregates.maxTilt >= SENSOR_CONFIGS.tilt.criticalThreshold
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : aggregates.maxTilt >= SENSOR_CONFIGS.tilt.warningThreshold
                ? 'bg-amber-500/10 text-[#fca311]'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#000000] dark:text-white font-mono tracking-tight">
            {aggregates.maxTilt.toFixed(2)}°
          </span>
          <Badge
            variant={
              aggregates.maxTilt >= SENSOR_CONFIGS.tilt.criticalThreshold
                ? 'danger'
                : aggregates.maxTilt >= SENSOR_CONFIGS.tilt.warningThreshold
                ? 'warning'
                : 'info'
            }
            className="text-[10px] uppercase font-mono px-1.5 py-0.5"
          >
            {aggregates.maxTilt >= SENSOR_CONFIGS.tilt.criticalThreshold
              ? 'CRITICAL'
              : aggregates.maxTilt >= SENSOR_CONFIGS.tilt.warningThreshold
              ? 'ELEVATED'
              : 'NORMAL'}
          </Badge>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-[#e5e5e5]/80 dark:border-[#14213d]/80 flex items-center justify-between text-[11px] font-mono text-[#5c677d] dark:text-[#94a3b8]">
          <span>Max on: <strong className="text-[#14213d] dark:text-white">{aggregates.maxTiltNode}</strong></span>
          <span>Warn: {SENSOR_CONFIGS.tilt.warningThreshold}°</span>
        </div>

        <div
          className={`absolute bottom-0 left-0 right-0 h-0.5 ${
            aggregates.maxTilt >= SENSOR_CONFIGS.tilt.criticalThreshold
              ? 'bg-red-500'
              : aggregates.maxTilt >= SENSOR_CONFIGS.tilt.warningThreshold
              ? 'bg-[#fca311]'
              : 'bg-blue-500/70'
          }`}
        />
      </Card>

      {/* 3. Peak Vibration Acceleration */}
      <Card className="p-4 bg-white/95 dark:bg-[#14213d]/40 border-[#e5e5e5] dark:border-[#14213d] relative overflow-hidden group hover:border-[#fca311]/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#5c677d] dark:text-[#94a3b8] tracking-wider uppercase">
            Peak Dynamic Vibration
          </span>
          <div
            className={`p-1.5 rounded-lg ${
              aggregates.maxVibration >= SENSOR_CONFIGS.vibration.criticalThreshold
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : aggregates.maxVibration >= SENSOR_CONFIGS.vibration.warningThreshold
                ? 'bg-amber-500/10 text-[#fca311]'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#000000] dark:text-white font-mono tracking-tight">
            {aggregates.maxVibration.toFixed(2)}
            <span className="text-sm font-normal text-[#5c677d] dark:text-[#94a3b8]">
              {' '}mm/s
            </span>
          </span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-[#e5e5e5]/80 dark:border-[#14213d]/80 flex items-center justify-between text-[11px] font-mono text-[#5c677d] dark:text-[#94a3b8]">
          <span>Node: <strong className="text-[#14213d] dark:text-white">{aggregates.maxVibrationNode}</strong></span>
          <span className="text-indigo-600 dark:text-indigo-400">
            {aggregates.maxVibration > 3.0 ? 'Machine Noise' : 'Ambient'}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/70" />
      </Card>

      {/* 4. AI Geotechnical Subsidence Risk */}
      <Card className="p-4 bg-white/95 dark:bg-[#14213d]/40 border-[#e5e5e5] dark:border-[#14213d] relative overflow-hidden group hover:border-[#fca311]/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#5c677d] dark:text-[#94a3b8] tracking-wider uppercase">
            AI Subsidence Risk
          </span>
          <div
            className={`p-1.5 rounded-lg ${
              aggregates.maxSeverity >= 0.6
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                : aggregates.maxSeverity >= 0.2
                ? 'bg-amber-500/10 text-[#fca311]'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#000000] dark:text-white font-mono tracking-tight">
            {Math.round(aggregates.maxSeverity * 100)}%
          </span>
          <Badge
            variant={alertBadgeVariant}
            className="text-[10px] font-mono font-bold px-1.5 py-0.5"
          >
            {aggregates.highestAlertLevel}
          </Badge>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-[#e5e5e5]/80 dark:border-[#14213d]/80 flex items-center justify-between text-[11px] font-mono text-[#5c677d] dark:text-[#94a3b8]">
          <span className="truncate max-w-[110px]" title={aggregates.highestRiskClass}>
            Class: <strong className="text-[#14213d] dark:text-white capitalize">{aggregates.highestRiskClass.replace(/_/g, ' ')}</strong>
          </span>
          <span>Node: <strong className="text-[#14213d] dark:text-white">{aggregates.highestRiskNode}</strong></span>
        </div>

        <div
          className={`absolute bottom-0 left-0 right-0 h-0.5 ${
            aggregates.maxSeverity >= 0.6
              ? 'bg-red-500'
              : aggregates.maxSeverity >= 0.2
              ? 'bg-[#fca311]'
              : 'bg-emerald-500/70'
          }`}
        />
      </Card>

      {/* 5. Inference Latency & Drift Health */}
      <Card className="p-4 bg-white/95 dark:bg-[#14213d]/40 border-[#e5e5e5] dark:border-[#14213d] relative overflow-hidden group hover:border-[#fca311]/50 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#5c677d] dark:text-[#94a3b8] tracking-wider uppercase">
            Model Inference &amp; Drift
          </span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Gauge className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#000000] dark:text-white font-mono tracking-tight">
            {aggregates.avgInferenceLatency}
            <span className="text-sm font-normal text-[#5c677d] dark:text-[#94a3b8]">
              {' '}ms
            </span>
          </span>
          <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold">
            SHADOW
          </span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-[#e5e5e5]/80 dark:border-[#14213d]/80 flex items-center justify-between text-[11px] font-mono text-[#5c677d] dark:text-[#94a3b8]">
          <span>Arch: <strong className="text-[#14213d] dark:text-white">CNN-BiLSTM</strong></span>
          <span className="text-purple-600 dark:text-purple-400">v0.1.0</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500/70" />
      </Card>
    </div>
  );
}

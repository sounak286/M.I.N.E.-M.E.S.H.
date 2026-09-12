"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SENSOR_CONFIGS } from '@/lib/constants';
import { ValidatedSensorReading } from '@/types/sensor';
import { AnalyticsKpiCards } from '@/components/analytics/AnalyticsKpiCards';
import {
  TimeSeriesChart,
  TimeSeriesDataPoint,
} from '@/components/analytics/TimeSeriesChart';
import { SimulationScenarioPanel } from '@/components/analytics/SimulationScenarioPanel';
import { MlValidationStudio } from '@/components/analytics/MlValidationStudio';
import { HistoricalQueryConsole } from '@/components/analytics/HistoricalQueryConsole';
import {
  BarChart3,
  Sparkles,
  Play,
  Square,
  Activity,
  Layers,
  BrainCircuit,
  Database,
  Radio,
  Sliders,
  Filter,
  FileText,
} from 'lucide-react';
import { ReportModal } from '@/components/common/ReportModal';
import { buildAnalyticsReport, ExecutiveReportData } from '@/lib/reportGenerator';

type AnalyticsTab = 'time_series' | 'simulation' | 'ml_validation' | 'query_contract';

export default function AnalyticsPage() {
  const {
    readings,
    nodeStatuses,
    mlPredictions,
    metrics,
    gatewayStatus,
    stats,
    isSimulationActive,
    toggleSimulation,
    triggerDemoMlEvent,
    activeZones,
  } = useRealtime();

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('time_series');

  // Filters
  const [selectedSensor, setSelectedSensor] = useState<string>('tilt');
  const [selectedNode, setSelectedNode] = useState<string>('NODE_01');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('1m');
  const [isBufferPaused, setIsBufferPaused] = useState<boolean>(false);

  // Executive Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);

  const handleGenerateReport = () => {
    const report = buildAnalyticsReport({
      readings,
      mlPredictions,
      metrics,
      stats,
      selectedSensor,
      selectedNode,
      timeRange,
      bufferCount: timeSeriesBuffer.length,
    });
    setReportData(report);
    setIsReportOpen(true);
  };

  // Rolling in-memory time-series buffer (stores up to 100 recent points per sensor)
  const [timeSeriesBuffer, setTimeSeriesBuffer] = useState<TimeSeriesDataPoint[]>([]);
  const isPausedRef = useRef(isBufferPaused);
  isPausedRef.current = isBufferPaused;

  // Initialize seed time-series data so the chart is immediately alive on mount
  useEffect(() => {
    const initialPoints: TimeSeriesDataPoint[] = [];
    const now = Date.now();
    const sensorMeta = SENSOR_CONFIGS[selectedSensor] || SENSOR_CONFIGS.tilt;
    const baseVal =
      selectedSensor === 'tilt'
        ? 0.18
        : selectedSensor === 'vibration'
        ? 0.45
        : selectedSensor === 'displacement'
        ? 0.22
        : selectedSensor === 'gas'
        ? 8
        : selectedSensor === 'water'
        ? 0.25
        : 0;

    for (let i = 40; i >= 0; i--) {
      const t = new Date(now - i * 1500);
      const noise = (Math.sin(i / 4) + Math.cos(i / 7)) * (baseVal * 0.25);
      const val = Math.max(0.05, Number((baseVal + noise).toFixed(2)));

      initialPoints.push({
        id: `init-${i}-${now}`,
        timestamp: t.toISOString(),
        timeLabel: t.toLocaleTimeString(),
        value: val,
        nodeId: selectedNode,
        sequenceNumber: 1000 + (40 - i),
        tiltNorm: Math.min(100, Math.max(5, Math.round((val / sensorMeta.criticalThreshold) * 70))),
        vibrationNorm: Math.min(100, Math.max(10, Math.round(30 + Math.sin(i / 5) * 20))),
        displacementNorm: Math.min(100, Math.max(8, Math.round(20 + (i / 40) * 25))),
      });
    }

    setTimeSeriesBuffer(initialPoints);
  }, [selectedSensor, selectedNode]);

  // Continuously ingest incoming telemetry from `readings` state into rolling buffer
  useEffect(() => {
    if (isPausedRef.current) return;

    // Find reading for currently selected node and sensor
    let latestReading: ValidatedSensorReading | null = null;
    let tiltVal = 0.2;
    let vibeVal = 0.4;
    let dispVal = 0.2;

    for (const zoneMap of Object.values(readings)) {
      if (zoneMap[selectedNode]) {
        const nodeReadings = zoneMap[selectedNode];
        if (nodeReadings[selectedSensor]) {
          latestReading = nodeReadings[selectedSensor];
        }
        if (nodeReadings.tilt) tiltVal = nodeReadings.tilt.value;
        if (nodeReadings.vibration) vibeVal = nodeReadings.vibration.value;
        if (nodeReadings.displacement) dispVal = nodeReadings.displacement.value;
      }
    }

    if (!latestReading) return;

    const r = latestReading;
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();

    setTimeSeriesBuffer(prev => {
      const lastPoint = prev[prev.length - 1];
      // Skip duplicate timestamp or sequence number
      if (
        lastPoint &&
        lastPoint.sequenceNumber === r.sequenceNumber &&
        lastPoint.value === r.value
      ) {
        return prev;
      }

      const sensorMeta = SENSOR_CONFIGS[selectedSensor] || SENSOR_CONFIGS.tilt;
      const tiltMeta = SENSOR_CONFIGS.tilt;
      const vibeMeta = SENSOR_CONFIGS.vibration;
      const dispMeta = SENSOR_CONFIGS.displacement;

      const newPoint: TimeSeriesDataPoint = {
        id: `pt-${r.sequenceNumber}-${Date.now()}`,
        timestamp: r.timestamp || now.toISOString(),
        timeLabel,
        value: r.value,
        nodeId: r.nodeId,
        sequenceNumber: r.sequenceNumber,
        tiltNorm: Math.min(100, Math.round((tiltVal / tiltMeta.criticalThreshold) * 80)),
        vibrationNorm: Math.min(100, Math.round((vibeVal / vibeMeta.criticalThreshold) * 80)),
        displacementNorm: Math.min(100, Math.round((dispVal / dispMeta.criticalThreshold) * 80)),
      };

      // Keep last 60 points for high-performance streaming
      return [...prev.slice(-59), newPoint];
    });
  }, [readings, selectedNode, selectedSensor]);

  const handleClearBuffer = useCallback(() => {
    setTimeSeriesBuffer([]);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsBufferPaused(prev => !prev);
  }, []);

  return (
    <div className="space-y-6 pb-16">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#e5e5e5] dark:border-[#14213d]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#fca311]/15 text-[#fca311] border border-[#fca311]/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-[#000000] dark:text-white tracking-wide font-mono">
                Geotechnical Time-Series Analytics &amp; AI Shadow Intelligence Console
              </h1>
              <p className="text-xs text-[#5c677d] dark:text-[#94a3b8] mt-0.5 font-medium">
                High-frequency multi-modal telemetry waveforms, browser scenario player, deep learning inference validation, and §8 query contract
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Live Status Beacon */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f4f5f7] dark:bg-[#14213d]/70 border border-[#e5e5e5] dark:border-[#14213d] text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSimulationActive
                  ? 'bg-emerald-500 animate-pulse'
                  : stats.onlineNodes > 0
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-[#5c677d] dark:text-[#94a3b8]">Mode:</span>
            <span className="font-bold text-[#000000] dark:text-white">
              {isSimulationActive ? 'Browser Simulation' : 'Live Hardware Mesh'}
            </span>
          </div>

          {/* Quick Simulation Toggle */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide transition-all shadow-sm cursor-pointer ${
              isSimulationActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#fca311] hover:bg-[#ffb733] text-[#000000]'
            }`}
          >
            {isSimulationActive ? (
              <>
                <Square className="w-3.5 h-3.5" /> Stop Sim
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> 1-Click Sim
              </>
            )}
          </button>

          {/* Executive PDF Report Button */}
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 text-xs font-mono font-bold tracking-wide transition-all shadow-sm cursor-pointer active:scale-95"
            title="Generate Boardroom & DGMS Geotechnical Executive Report"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive Report</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Stat Ribbon */}
      <AnalyticsKpiCards
        readings={readings}
        mlPredictions={mlPredictions}
        metrics={metrics}
        gatewayStatus={gatewayStatus}
        stats={stats}
        isSimulationActive={isSimulationActive}
      />

      {/* Global Telemetry Filter Toolbar */}
      <Card className="p-3 sm:p-4 bg-white/95 dark:bg-[#14213d]/40 border-[#e5e5e5] dark:border-[#14213d] flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 shadow-sm min-w-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono min-w-0">
          {/* Sensor Select */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#5c677d] dark:text-[#94a3b8] font-medium">Sensor:</span>
            <select
              value={selectedSensor}
              onChange={e => setSelectedSensor(e.target.value)}
              className="bg-[#f4f5f7] dark:bg-[#000000] border border-[#e5e5e5] dark:border-[#14213d] text-[#000000] dark:text-white rounded-xl px-2.5 sm:px-3 py-1.5 font-bold cursor-pointer text-xs"
            >
              {Object.keys(SENSOR_CONFIGS).map(type => (
                <option key={type} value={type} className="bg-white dark:bg-[#14213d]">
                  {SENSOR_CONFIGS[type].label} ({type})
                </option>
              ))}
            </select>
          </div>

          {/* Node Select */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#5c677d] dark:text-[#94a3b8] font-medium">Node:</span>
            <select
              value={selectedNode}
              onChange={e => setSelectedNode(e.target.value)}
              className="bg-[#f4f5f7] dark:bg-[#000000] border border-[#e5e5e5] dark:border-[#14213d] text-[#000000] dark:text-white rounded-xl px-2.5 sm:px-3 py-1.5 font-bold cursor-pointer text-xs"
            >
              {['NODE_01', 'NODE_02', 'NODE_03', 'NODE_04', 'NODE_05', 'NODE_06'].map(n => (
                <option key={n} value={n} className="bg-white dark:bg-[#14213d]">
                  {n} {n === 'NODE_03' ? '(Risk)' : n === 'NODE_02' ? '(Shearer)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Time Window Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#5c677d] dark:text-[#94a3b8] font-medium">Window:</span>
            <div className="flex bg-[#f4f5f7] dark:bg-[#000000] p-0.5 sm:p-1 rounded-xl border border-[#e5e5e5] dark:border-[#14213d]">
              {['1m', '5m', '15m', '1h', '24h'].map(w => (
                <button
                  key={w}
                  onClick={() => setTimeRange(w)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    timeRange === w
                      ? 'bg-[#14213d] text-white dark:bg-[#fca311] dark:text-[#000000] font-bold shadow-sm'
                      : 'text-[#5c677d] dark:text-[#94a3b8] hover:text-[#000000] dark:hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#f4f5f7] dark:bg-[#000000] p-1 rounded-xl border border-[#e5e5e5] dark:border-[#14213d] text-xs font-mono overflow-x-auto w-full xl:w-auto">
          <button
            onClick={() => setActiveTab('time_series')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'time_series'
                ? 'bg-[#14213d] text-white dark:bg-[#fca311] dark:text-[#000000] font-bold shadow-sm'
                : 'text-[#5c677d] dark:text-[#94a3b8] hover:text-[#000000] dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Time-Series Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-[#14213d] text-white dark:bg-[#fca311] dark:text-[#000000] font-bold shadow-sm'
                : 'text-[#5c677d] dark:text-[#94a3b8] hover:text-[#000000] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulation Scenarios</span>
          </button>

          <button
            onClick={() => setActiveTab('ml_validation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ml_validation'
                ? 'bg-[#14213d] text-white dark:bg-[#fca311] dark:text-[#000000] font-bold shadow-sm'
                : 'text-[#5c677d] dark:text-[#94a3b8] hover:text-[#000000] dark:hover:text-white'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>AI Inference &amp; Drift</span>
          </button>

          <button
            onClick={() => setActiveTab('query_contract')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'query_contract'
                ? 'bg-[#14213d] text-white dark:bg-[#fca311] dark:text-[#000000] font-bold shadow-sm'
                : 'text-[#5c677d] dark:text-[#94a3b8] hover:text-[#000000] dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>§8 Storage Query</span>
          </button>
        </div>
      </Card>

      {/* Tab Views */}
      {activeTab === 'time_series' && (
        <TimeSeriesChart
          data={timeSeriesBuffer}
          selectedSensor={selectedSensor}
          selectedNode={selectedNode}
          timeRange={timeRange}
          isPaused={isBufferPaused}
          onTogglePause={handleTogglePause}
          onClearData={handleClearBuffer}
        />
      )}

      {activeTab === 'simulation' && (
        <SimulationScenarioPanel
          isSimulationActive={isSimulationActive}
          onToggleSimulation={toggleSimulation}
          onTriggerMlEvent={triggerDemoMlEvent}
        />
      )}

      {activeTab === 'ml_validation' && (
        <MlValidationStudio liveMlPredictions={mlPredictions} />
      )}

      {activeTab === 'query_contract' && <HistoricalQueryConsole />}

      {/* Boardroom Executive Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        report={reportData}
      />
    </div>
  );
}
